import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import rateLimit from 'express-rate-limit';
import pino from 'pino';

import { authRoutes } from './routes/auth.js';
import { workspaceRoutes } from './routes/workspaces.js';
import { agentRoutes } from './routes/agents.js';
import { documentRoutes } from './routes/documents.js';
import { conversationRoutes } from './routes/conversations.js';
import { workflowRoutes } from './routes/workflows.js';
import { errorHandler } from './middleware/error.js';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

const app = express();
const PORT = process.env.API_PORT || 3001;

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 auth requests per windowMs
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 chat requests per minute
  message: { error: 'Too many chat requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
}));
app.use(generalLimiter);

// Request timeout middleware
app.use((req, res, next) => {
  const timeout = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10);
  req.setTimeout(timeout);
  res.setTimeout(timeout);
  next();
});

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', service: 'agentlab-api', timestamp: new Date().toISOString() });
});

// Routes - JSON parsing only for non-file-upload routes
app.use('/api/auth', express.json({ limit: '10mb' }), authLimiter, authRoutes);
app.use('/api/workspaces', express.json({ limit: '10mb' }), workspaceRoutes);
app.use('/api/agents', express.json({ limit: '10mb' }), chatLimiter, agentRoutes);
app.use('/api/documents', documentRoutes); // multer handles parsing for this route
app.use('/api/conversations', express.json({ limit: '10mb' }), conversationRoutes);
app.use('/api/workflows', express.json({ limit: '10mb' }), workflowRoutes);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'AgentLab API running');
});

export default app;
