import express from 'express';
import router from './routes';
import { errorHandler } from './middleware/error-handler';

const app = express();

app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// API routes
app.use('/api', router);

// Error handler (must be last)
app.use(errorHandler);

export default app;
