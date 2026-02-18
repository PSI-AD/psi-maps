const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const apicache = require('apicache');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const cache = apicache.middleware;

// Middleware
app.use(cors());
app.use(express.json()); // Added to handle incoming JSON for the places proxy body rewrite

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    service: 'UAE Real Estate CRM Proxy',
    timestamp: new Date().toISOString() 
  });
});

/**
 * Proxy Route: /api/places
 * Behavior:
 * 1. Proxies POST requests to Google Places API (New).
 * 2. Injects GOOGLE_PLACES_API_KEY and field mask.
 */
app.use(
  '/api/places',
  createProxyMiddleware({
    target: 'https://places.googleapis.com',
    changeOrigin: true,
    pathRewrite: {
      '^/api/places': '/v1/places:searchNearby',
    },
    onProxyReq: (proxyReq, req, res) => {
      proxyReq.setHeader('X-Goog-Api-Key', process.env.GOOGLE_PLACES_API_KEY || '');
      proxyReq.setHeader('X-Goog-FieldMask', 'places.displayName,places.location,places.primaryType');
      
      // Since express.json() is used, we must re-stream the body to the proxy target
      if (req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`[Places Proxy] ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
      console.error('[Places Proxy Error]:', err);
      res.status(502).json({ error: 'Bad Gateway', message: 'Places service unreachable.' });
    }
  })
);

/**
 * Proxy Route: /api/properties
 */
app.use(
  '/api/properties',
  cache('5 minutes', (req, res) => res.statusCode === 200),
  createProxyMiddleware({
    target: process.env.CRM_BASE_URL || 'http://localhost:8080',
    changeOrigin: true,
    pathRewrite: {
      '^/api/properties': '',
    },
    onProxyReq: (proxyReq, req, res) => {
      if (process.env.CRM_API_KEY) {
        proxyReq.setHeader('Authorization', `Bearer ${process.env.CRM_API_KEY}`);
        proxyReq.setHeader('X-API-KEY', process.env.CRM_API_KEY);
      }
    }
  })
);

app.listen(port, () => {
  console.log('-------------------------------------------');
  console.log(`🚀 CRM Proxy Server running on port ${port}`);
  console.log(`📍 Route: http://localhost:${port}/api/properties`);
  console.log(`📍 Places: http://localhost:${port}/api/places`);
  console.log('-------------------------------------------');
});