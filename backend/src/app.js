/**
 * Express application setup.
 *
 * Configures middleware (CORS, JSON parsing, request logging, error handling)
 * and mounts the API routes.
 */
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// --- Global middleware ---
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// --- API routes ---
app.use('/api', routes);

// --- Centralized error handling (must be AFTER routes) ---
app.use(errorHandler);

module.exports = app;
