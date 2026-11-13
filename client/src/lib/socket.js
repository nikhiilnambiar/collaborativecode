import { io } from 'socket.io-client';

// Connects your React app to your live Render WebSocket server
const SERVER_URL = "https://collaborativecode-58h1.onrender.com"; 

export const socket = io(SERVER_URL);