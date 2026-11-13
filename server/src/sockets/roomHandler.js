import * as Y from 'yjs';

const roomDocs = new Map();
// NEW: Track the active language for each room in RAM
const roomLanguages = new Map(); 

export default function registerRoomHandlers(io, socket) {
  
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-joined', `User ${socket.id} joined`);
  });

  socket.on('sync-update', ({ roomId, update }) => {
    if (!roomDocs.has(roomId)) {
      roomDocs.set(roomId, new Y.Doc());
    }
    const doc = roomDocs.get(roomId);
    Y.applyUpdate(doc, new Uint8Array(update));
    socket.to(roomId).emit('sync-update', update);
  });

  // NEW: Handle a user changing the dropdown
  socket.on('language-change', ({ roomId, language }) => {
    roomLanguages.set(roomId, language); // Save in memory for late joiners
    socket.to(roomId).emit('language-change', language); // Broadcast to everyone else
  });

  socket.on('request-sync', (roomId) => {
    if (roomDocs.has(roomId)) {
      const doc = roomDocs.get(roomId);
      const stateVector = Y.encodeStateAsUpdate(doc);
      socket.emit('sync-initial-state', stateVector);
    }
    
    // NEW: If a language was previously selected, send it to the late joiner
    if (roomLanguages.has(roomId)) {
      socket.emit('language-change', roomLanguages.get(roomId));
    }
  });

  socket.on('awareness-update', ({ roomId, update }) => {
    socket.to(roomId).emit('awareness-update', update);
  });
}