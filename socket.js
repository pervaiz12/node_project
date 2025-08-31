const { Server } = require('socket.io');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: (origin, cb) => {
        // Allow localhost in dev and specific origins in prod via env
        const allowed = [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:4005',
          'http://127.0.0.1:4005',
        ];
        if (!origin || allowed.includes(origin) || process.env.NODE_ENV !== 'production') return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie;
      if (!rawCookie) return next(new Error('No auth'));
      const cookies = cookie.parse(rawCookie || '');
      const token = cookies.token;
      if (!token) return next(new Error('No token'));
      const secret = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
      const payload = jwt.verify(token, secret);
      socket.user = { id: payload.sub, email: payload.email };
      return next();
    } catch (err) {
      return next(new Error('Auth failed'));
    }
  });

  io.on('connection', (socket) => {
    const userRoom = `user:${socket.user.id}`;
    socket.join(userRoom);
    socket.emit('socket:connected', { ok: true });

    socket.on('disconnect', () => {
      // cleanup if needed
    });
  });

  return io;
}

module.exports = { initSocket };
