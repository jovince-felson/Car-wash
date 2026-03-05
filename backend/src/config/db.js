const mongoose = require('mongoose');
const logger = require('./logger');
require('dotenv').config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    logger.error('MongoDB connection failed', { error: err.message });
    process.exit(1);
  }
};

module.exports = connectDB;
