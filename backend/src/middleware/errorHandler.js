const logger = require('../utils/logger');

// Custom application error class - throw this from services/controllers for expected errors
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

// Express error-handling middleware (must have 4 args to be recognized by Express)
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  if (!err.isOperational) {
    logger.error(`${err.message}\n${err.stack}`);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${err.message}`);
  }

  res.status(statusCode).json({
    error: err.isOperational ? err.message : 'Internal server error',
  });
}

const notFound = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
};

module.exports = { AppError, errorHandler, notFound };
