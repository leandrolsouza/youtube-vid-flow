import winston from 'winston';
import { config } from './config.js';

const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warn',
  ERROR: 'error',
  CRITICAL: 'error'
};

const getLogLevel = (level) => {
  return LOG_LEVELS[level] || LOG_LEVELS.INFO;
};

export const logger = winston.createLogger({
  level: getLogLevel(config.LOGLEVEL),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});
