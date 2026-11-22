const mongoose = require('mongoose');

// Validates :id route param
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    const err = new Error('Invalid product ID');
    err.statusCode = 400;
    return next(err);
  }
  next();
};

const notFound = (req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
};

// Centralized error handler
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Server error';
  let errors;

  if (err.name === 'ValidationError') {
    status = 400;
    errors = Object.values(err.errors).map((e) => e.message);
    message = 'Validation failed';
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    message = `Duplicate value for ${Object.keys(err.keyValue).join(', ')}`;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON body';
  }

  res.status(status).json({ success: false, message, ...(errors && { errors }) });
};

module.exports = { validateObjectId, notFound, errorHandler };
