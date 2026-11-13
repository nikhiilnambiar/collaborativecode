import { io } from 'socket.io-client';

// Connect to the Node.js backend
const SERVER_URL = "https://your-backend-name.onrender.com"; // Replace with your ACTUAL Render URL

export const socket = io(SERVER_URL);