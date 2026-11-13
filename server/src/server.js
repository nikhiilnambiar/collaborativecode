import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import registerRoomHandlers from './sockets/roomHandler.js';

const app = express();

// Allows standard HTTP requests from any origin (Vercel)
app.use(cors());
app.use(express.json());
const server = http.createServer(app);

const io = new Server(server, {
    cors: { 
        // Changed to wildcard so Vercel can establish the WebSocket connection
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    registerRoomHandlers(io, socket);

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

app.post('/execute', async (req, res) => {
  const { source_code, language, version } = req.body; 

  try {
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: language, 
        version: "*",
        files: [
          { content: source_code }
        ]
      })
    });

    const data = await response.json();

    if (data.message) {
      return res.json({ stderr: `Sandbox Error: ${data.message}` });
    }

    res.json({
      stdout: data.run?.output, 
      stderr: data.run?.stderr,
      compile_output: data.compile?.stderr, 
      status: data.run?.code === 0 ? "Accepted" : "Error"
    });

  } catch (error) {
    console.error("Execution error:", error);
    res.status(500).json({ error: "Failed to connect to the cloud execution engine" });
  }
});

// CRITICAL FIX: Use Render's environment port, fallback to 5000 locally
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});