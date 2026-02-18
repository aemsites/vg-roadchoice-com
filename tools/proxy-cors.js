#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable no-undef */

/**
 * CORS Proxy for Dealer Locator
 *
 * Purpose: Add CORS headers to proxy requests from dealerlocator.roadchoice.com
 * In Safari (especially iOS 17+), CORS headers are required. This proxy intercepts
 * requests and adds the necessary headers before forwarding to the backend.
 *
 * Usage: node tools/proxy-cors.js
 * Then use: http://localhost:3001/dealers?state=1
 */

const http = require('http');
const https = require('https');
const url = require('url');

const DEALER_ENDPOINT = 'https://dealerlocator.roadchoice.com/DealerJSON.ashx';
const PORT = 3001;

const server = http.createServer(async (req, res) => {
  // Log incoming request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // CORS Headers - Allow localhost and development domains
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  try {
    // Parse query string from request
    const parsedUrl = url.parse(req.url, true);
    const queryParams = parsedUrl.query;

    // Build target URL with query params
    const queryString = Object.keys(queryParams)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
      .join('&');

    const targetUrl = `${DEALER_ENDPOINT}${queryString ? `?${queryString}` : ''}`;

    console.log(`[Proxy] Forwarding to: ${targetUrl}`);

    // Make request to backend (ignore cert validation in dev)
    https
      .get(targetUrl, { rejectUnauthorized: false }, (targetRes) => {
        let data = '';

        targetRes.on('data', (chunk) => {
          data += chunk;
        });

        targetRes.on('end', () => {
          // Send response with CORS headers
          res.writeHead(targetRes.statusCode, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': origin,
          });
          res.end(data);
          console.log(`[Proxy] Response sent (${data.length} bytes, status: ${targetRes.statusCode})`);
        });
      })
      .on('error', (err) => {
        console.error('[Proxy Error]', err.message);
        res.writeHead(502);
        res.end(
          JSON.stringify({
            error: 'Bad Gateway',
            message: err.message,
          }),
        );
      });
  } catch (err) {
    console.error('[Server Error]', err);
    res.writeHead(500);
    res.end(
      JSON.stringify({
        error: 'Internal Server Error',
        message: err.message,
      }),
    );
  }
});

server.listen(PORT, () => {
  console.log(`\n✅ CORS Proxy running on http://localhost:${PORT}`);
  console.log(`📍 Proxying requests to: ${DEALER_ENDPOINT}`);
  console.log(`🔗 Usage in code: http://localhost:${PORT}?state=1\n`);
  console.log('ℹ️  This adds CORS headers for Safari compatibility in development\n');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    console.error(`   Kill the process with: lsof -ti:${PORT} | xargs kill -9`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});
