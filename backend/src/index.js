const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const noteRoutes = require('./routes/notes');
const todoRoutes = require('./routes/todos');
const tagContentRoutes = require('./routes/tagContents');
const scheduleRoutes = require('./routes/schedules');
const adminRoutes = require('./routes/admin');
const errorHandler = require('./middleware/errorHandler');
const createAdminUser = require('./scripts/createAdmin');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiting behind nginx
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // increased from 100 to 1000 requests per windowMs
  message: {
    error: '请求过于频繁，请稍后再试',
    retryAfter: '请在15分钟后重试'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 auth requests per windowMs
  message: {
    error: '登录请求过于频繁，请稍后再试',
    retryAfter: '请在15分钟后重试'
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://192.168.3.56:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes with different rate limiting
app.use('/api/auth', authLimiter, authRoutes); // Stricter limit for auth
app.use('/api/notes', limiter, noteRoutes); // General limit for notes
app.use('/api/todos', limiter, todoRoutes); // General limit for todos
app.use('/api/tag-contents', limiter, tagContentRoutes); // General limit for tag contents
app.use('/api/schedules', limiter, scheduleRoutes); // General limit for schedules
app.use('/api/admin', authLimiter, adminRoutes); // Stricter limit for admin

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});