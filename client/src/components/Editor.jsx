import { useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness';
import { socket } from '../lib/socket';

export default function Editor({ roomId }) {
  const editorRef = useRef(null);
  const ydocRef = useRef(null);
  const bindingRef = useRef(null);
  const awarenessRef = useRef(null);

  const [output, setOutput] = useState("Output will appear here...");
  const [isRunning, setIsRunning] = useState(false);
  const [language, setLanguage] = useState('javascript');

  const LANGUAGE_VERSIONS = {
    javascript: "18.15.0",
    python: "3.10.0",
    c: "10.2.0",
    cpp: "10.2.0"
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText('monaco');

    const awareness = new Awareness(ydoc);
    awarenessRef.current = awareness;

    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
    awareness.setLocalStateField('user', {
      name: `Guest ${Math.floor(Math.random() * 100)}`,
      color: randomColor
    });

    bindingRef.current = new MonacoBinding(
      ytext,
      editor.getModel(),
      new Set([editor]),
      awareness
    );

    ydoc.on('update', (update, origin) => {
      if (origin !== 'remote') {
        socket.emit('sync-update', { roomId, update });
      }
    });

    awareness.on('update', ({ added, updated, removed }, origin) => {
      if (origin !== 'remote') {
        const changedClients = added.concat(updated, removed);
        const updatePayload = encodeAwarenessUpdate(awareness, changedClients);
        socket.emit('awareness-update', { roomId, update: updatePayload });
      }
    });

    socket.emit('request-sync', roomId);
  };

  useEffect(() => {
    const handleIncomingUpdate = (update) => {
      if (ydocRef.current) Y.applyUpdate(ydocRef.current, new Uint8Array(update), 'remote');
    };

    const handleInitialSync = (stateVector) => {
      if (ydocRef.current) Y.applyUpdate(ydocRef.current, new Uint8Array(stateVector), 'remote');
    };

    const handleAwarenessUpdate = (updatePayload) => {
      if (awarenessRef.current) applyAwarenessUpdate(awarenessRef.current, new Uint8Array(updatePayload), 'remote');
    };

    // NEW: Listen for language changes from the other person
    const handleLanguageChange = (newLanguage) => {
      setLanguage(newLanguage);
    };

    socket.on('sync-update', handleIncomingUpdate);
    socket.on('sync-initial-state', handleInitialSync);
    socket.on('awareness-update', handleAwarenessUpdate);
    socket.on('language-change', handleLanguageChange); // Register listener

    return () => {
      socket.off('sync-update', handleIncomingUpdate);
      socket.off('sync-initial-state', handleInitialSync);
      socket.off('awareness-update', handleAwarenessUpdate);
      socket.off('language-change', handleLanguageChange); // Cleanup
      if (bindingRef.current) bindingRef.current.destroy();
      if (ydocRef.current) ydocRef.current.destroy();
      if (awarenessRef.current) awarenessRef.current.destroy();
    };
  }, []);

  const runCode = async () => {
    if (!editorRef.current) return;
    const currentCode = editorRef.current.getValue();
    
    setIsRunning(true);
    setOutput("Executing in Cloud Sandbox...");

    try {
      const response = await fetch('http://localhost:5000/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_code: currentCode,
          language: language,
          version: LANGUAGE_VERSIONS[language]
        })
      });

      const data = await response.json();

      if (data.stderr) {
        setOutput(`⚠️ RUNTIME ERROR:\n${data.stderr}`);
      } else if (data.compile_output) {
        setOutput(`❌ SYNTAX ERROR:\n${data.compile_output}`);
      } else if (data.stdout) {
        setOutput(`✅ SUCCESS:\n${data.stdout}`);
      } else {
        setOutput("✅ SUCCESS: (No terminal output)");
      }
    } catch (err) {
      setOutput("🚨 Failed to connect to the execution server.");
    } finally {
      setIsRunning(false);
    }
  };

  // NEW: When YOU change the dropdown, update your screen and tell the server
  const handleLanguageSelect = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    socket.emit('language-change', { roomId, language: newLang });
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px', gap: '10px' }}>
        <select 
          value={language} 
          onChange={handleLanguageSelect} // Fire our new function
          style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python 3</option>
          <option value="c">C (GCC)</option>
          <option value="cpp">C++ (GCC)</option>
        </select>

        <button 
          onClick={runCode} 
          disabled={isRunning}
          style={{ 
            padding: '10px 20px', backgroundColor: isRunning ? '#555' : '#28a745', 
            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          {isRunning ? 'Running...' : '▶ Run Code'}
        </button>
      </div>

      <div style={{ border: '1px solid #555', borderRadius: '4px', overflow: 'hidden' }}>
        <MonacoEditor
          height="450px"
          language={language}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{ minimap: { enabled: false }, fontSize: 16 }}
        />
      </div>

      <div style={{ 
        marginTop: '10px', padding: '15px', backgroundColor: '#1e1e1e', 
        color: '#00ff00', fontFamily: 'monospace', borderRadius: '4px', minHeight: '100px', whiteSpace: 'pre-wrap'
      }}>
        {output}
      </div>
    </div>
  );
}