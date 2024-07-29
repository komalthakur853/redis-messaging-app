const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const redis = require('redis');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const redisClient = redis.createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
});

(async () => {
  await redisClient.connect();
})();

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', async (socket) => {
  console.log('A user connected');

  try {
    const messages = await redisClient.lRange('messages', 0, -1);
    messages.forEach(msg => {
      socket.emit('chat message', JSON.parse(msg));
    });
  } catch (err) {
    console.error('Error fetching messages from Redis:', err);
  }

  socket.on('chat message', async (msg) => {
    const messageObject = {
      text: msg,
      timestamp: new Date().toISOString()
    };
    try {
      await redisClient.rPush('messages', JSON.stringify(messageObject));
      io.emit('chat message', messageObject);
    } catch (err) {
      console.error('Error saving message to Redis:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
