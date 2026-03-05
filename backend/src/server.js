require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const jwt = require('jsonwebtoken');

const connectDB = require('./config/db');
const logger = require('./config/logger');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');
const { startFollowUpJob } = require('./utils/followUpJob');

const authRoutes      = require('./routes/authRoutes');
const bookingRoutes   = require('./routes/bookingRoutes');
const customerRoutes  = require('./routes/customerRoutes');
const staffRoutes     = require('./routes/staffRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const accountRoutes   = require('./routes/accountRoutes');
const reportRoutes    = require('./routes/reportRoutes');
const { router: locationRouter, staffLocations } = require('./routes/locationRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
app.set('io', io);

// Socket.io auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch { next(); }
});

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('location:broadcast', (data) => {
    const { lat, lng, bookingId, staffId, staffName, customerLat, customerLng } = data;
    if (!lat || !lng || !staffId) return;
    const location = { lat, lng, bookingId: bookingId || null, name: staffName || 'Staff', staffId, timestamp: new Date().toISOString() };
    staffLocations[staffId] = location;
    io.emit('location:updated', { staffId, location });


  });

  socket.on('location:stop', ({ staffId }) => {
    if (staffId) { delete staffLocations[staffId]; io.emit('location:cleared', { staffId }); }
  });

  socket.on('tracking:subscribe', ({ bookingId }) => {
    if (bookingId) {
      socket.join(`booking:${bookingId}`);
      const entry = Object.values(staffLocations).find(l => l.bookingId === bookingId);
      if (entry) socket.emit('location:updated', { staffId: entry.staffId, location: entry });
    }
  });

  socket.on('disconnect', () => logger.info(`Socket disconnected: ${socket.id}`));
});

app.use('/api/auth',      authRoutes);
app.use('/api/bookings',  bookingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/staff',     staffRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/accounts',  accountRoutes);
app.use('/api/reports',   reportRoutes);
app.use('/api/location',  locationRouter);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'SparkWash API Docs' }));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  server.listen(PORT, () => {
    logger.info(`SparkWash server on port ${PORT}`);
    logger.info(`Docs: http://localhost:${PORT}/api/docs`);
    startFollowUpJob(io);
  });
});
