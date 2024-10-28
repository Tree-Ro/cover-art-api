import express from 'express';
import logger from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { configDotenv } from 'dotenv';
import fs from 'fs';
import path from 'path';
configDotenv();

import coverartRouter from './routes/coverart.js';

const app = express();

// Security
app.use(helmet({
  contentSecurityPolicy: false, // Not necessary for a pure API
  frameguard: false,             // Not necessary for a pure API
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                  // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin === process.env.FRONTEND_URL) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  optionsSuccessStatus: 200,
}));

// Logging
const accessLogStream = fs.createWriteStream(path.join(process.cwd(), 'access.log'), { flags: 'a' });
const logFormat = ':remote-addr [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms - User-Agent: ":req[User-Agent]" - Body: ":req[body]"';
app.use(logger(logFormat, { stream: accessLogStream }));


// Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/coverart', coverartRouter);

// Error Handling
app.use((req, res) => {
  res.status(404).json({ status: 404, error: 'Not Found' });
});
app.use((err, req, res, next) => {
  console.error(err); 

  res.status(err.status || 500).json({ 
    status: err.status || 500, 
    error: 'Internal Server Error' 
  });
});

export default app;
