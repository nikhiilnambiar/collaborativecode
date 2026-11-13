import { useState } from 'react';
import { socket } from './lib/socket';
import Editor from './components/Editor'; // Import the new editor

function App() {
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);

  const joinRoom = () => {
    if (roomId.trim()) {
      socket.emit('join-room', roomId);
      setJoined(true);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', backgroundColor: '#1e1e1e', color: 'white', minHeight: '100vh' }}>
      <h1>DevRoom: Phase 2</h1>
      
      {!joined ? (
        <div>
          <input 
            placeholder="Enter Room ID" 
            value={roomId} 
            onChange={(e) => setRoomId(e.target.value)} 
            style={{ padding: '0.5rem', marginRight: '0.5rem' }}
          />
          <button onClick={joinRoom} style={{ padding: '0.5rem 1rem' }}>Join Room</button>
        </div>
      ) : (
        <div>
          <h2>Room: {roomId}</h2>
          {/* Render the Editor instead of the chat! */}
          <Editor roomId={roomId} />
        </div>
      )}
    </div>
  );
}

export default App;