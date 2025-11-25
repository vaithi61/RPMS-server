import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import paperRoutes from './routes/paperRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import filesRoutes from './routes/filesRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import editorRoutes from './routes/editorRoutes.js';
import productionRoutes from './routes/productionRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
const app = express();

// Security & utility middlewares
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL?.split(',') || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api', apiLimiter);

// Health checks (support both /health and /healthz)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});
// Optional root ping
app.get('/', (req, res) => {
  res.send('OK');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/editor', editorRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/payments', paymentRoutes);

// 404 and Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

const DEFAULT_PORT = process.env.PORT || 4000;

async function startServer(port) {
  return new Promise(async (resolve, reject) => {
    await connectDB();
    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      resolve(server);
    });
    server.on('error', (err) => {
      reject(err);
    });
  });
}

async function start() {
  try {
    await startServer(DEFAULT_PORT);
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      const alternativePort = parseInt(DEFAULT_PORT) + 1;
      console.warn(`Port ${DEFAULT_PORT} is in use, trying port ${alternativePort}...`);
      try {
        await startServer(alternativePort);
      } catch (altErr) {
        console.error('Failed to start server on alternative port', altErr);
        process.exit(1);
      }
    } else {
      console.error('Failed to start server', err);
      process.exit(1);
    }
  }
}

start();

export default app;
