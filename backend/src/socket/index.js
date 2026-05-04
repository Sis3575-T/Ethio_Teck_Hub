const chatHandler = require('./chatHandler');

/** @type {import('socket.io').Server | null} */
let _io = null;

/**
 * Initialize Socket.IO connection handling.
 * @param {import('socket.io').Server} io
 */
function initSocket(io) {
  _io = io;

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    chatHandler(io, socket);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

/**
 * Returns the Socket.IO server instance.
 * Must be called after initSocket().
 * @returns {import('socket.io').Server}
 */
function getIO() {
  if (!_io) {
    throw new Error('Socket.IO has not been initialized. Call initSocket(io) first.');
  }
  return _io;
}

module.exports = { initSocket, getIO };
