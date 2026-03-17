import express from 'express';
import dotenv from 'dotenv';
import { logger } from './logger';
import apiRoutes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Health check endpoint (No auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

app.listen(PORT, () => {
  logger.info(`Crawlee microservice running on port ${PORT}`);
});
