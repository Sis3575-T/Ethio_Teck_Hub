require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/database');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

initSocket(io);

(async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`EthioTech Hub API server running on port ${PORT}`);
  });
})();

module.exports = { io };
