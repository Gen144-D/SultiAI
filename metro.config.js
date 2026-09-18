const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  /(?:^|[\\/])server(?:\/|$)/,
];

// Proxy /api/* and /audio/* to the backend server (port 3001)
// so everything works through a single devtunnel on the Expo port.
const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '3001', 10);

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url.startsWith('/api/') || req.url.startsWith('/audio/')) {
        const proxyReq = http.request(
          {
            hostname: BACKEND_HOST,
            port: BACKEND_PORT,
            path: req.url,
            method: req.method,
            headers: { ...req.headers, host: `${BACKEND_HOST}:${BACKEND_PORT}` },
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
          }
        );
        proxyReq.on('error', (err) => {
          console.error(`[Metro Proxy] Backend error: ${err.message}`);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Backend server unavailable on port ' + BACKEND_PORT }));
        });
        req.pipe(proxyReq, { end: true });
        return;
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
