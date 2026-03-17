import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    logger.warn('API_KEY is not set in environment variables');
    // For strict security, block requests if API_KEY is missing.
    // In dev, you might allow it, but for prod we should enforce it.
    res.status(500).json({ status: 'error', errors: [{ message: 'Server configuration error: missing API_KEY' }] });
    return;
  }

  const authHeader = req.header('authorization');
  const xApiKey = req.header('x-api-key');

  let token = xApiKey;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (token === apiKey) {
    return next();
  }

  logger.warn('Unauthorized access attempt', { ip: req.ip });
  res.status(401).json({ status: 'error', errors: [{ message: 'Unauthorized' }] });
};
