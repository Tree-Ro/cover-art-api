import express from 'express';
import { fetchSpotify } from '../utility/fetchSpotify.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Middleware for validation
const validateSearchParams = [
  body('url')
    .notEmpty().withMessage('Missing URL')
    .isURL({ protocols: ['http', 'https'], require_tld: true })
    .withMessage('Not a valid HTTP/HTTPS URL')
    .matches(/^https:\/\/api\.spotify\.com\/v1\/search$/i)
    .withMessage('Not a valid Spotify Search API URL'),

  body('params')
    .notEmpty().withMessage('Missing Params')
    .isObject().withMessage('Params must be an object'),

  body('params.q')
    .notEmpty().withMessage('Query parameter "q" is required'),

  body('params.type')
    .isArray().withMessage('Type must be an array')
    .notEmpty().withMessage('Query parameter "type" is required')
    .custom((value) => {
      const validTypes = ["album", "artist", "playlist", "track", "show", "episode", "audiobook"];
      const isValid = value.every(type => validTypes.includes(type));
      if (!isValid) {
        throw new Error(`Type must be one of: ${validTypes.join(', ')}`);
      }
      return true;
    }),

  body('params.market')
    .optional()
    .matches(/^[A-Z]{2}$/).withMessage('Not a valid ISO 3166-1 alpha-2 country code'),
];

// Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Search Route
router.all('/', validateSearchParams, handleValidationErrors, async (req, res, next) => {
  const { url, params } = req.body;
  const method = req.method;

  try {
    const urlObj = new URL(url);
    const searchParams = new URLSearchParams();
  
    let query = '';
    if (params.q.track && params.q.track.length) query += `track:${params.q.track} `;
    if (params.q.artist && params.q.artist.length) query += `artist:${params.q.artist}`;
    searchParams.append('q', query.trim());
    
    searchParams.append('type', params.type.join(','));
    if (params.market) searchParams.append('market', params.market);
  
    urlObj.search = searchParams.toString();
  
    const response = await fetchSpotify(urlObj.toString(), { method });
  
    if (!response.ok) {
      const errorMessage = await response.json();
      return res.status(response.status).json({
        message: 'Failed to fetch from Spotify API',
        spotify_response: errorMessage,
      });
    }
  
    const data = await response.json();
    return res.json(data);
  
  } catch (err) {
    // Handle unexpected errors
    return next({
      status: 500,
      message: 'Internal Server Error',
      error: err.message,
    });
  }
  
});

export default router;
