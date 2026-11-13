import { io } from 'socket.io-client';

// Connect to the Node.js backend (your Express server port)
const SERVER_URL = 'http://localhost:5000';

export const socket = io(SERVER_URL);