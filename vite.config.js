import { defineConfig } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true
  },
  plugins: [
    {
      name: 'api-server',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url.startsWith('/api/')) {
            const urlPath = req.url.split('?')[0];
            try {
              let handlerModule;
              if (urlPath === '/api/auth') {
                handlerModule = await import('./api/auth.js');
              } else if (urlPath === '/api/entries') {
                handlerModule = await import('./api/entries.js');
              } else if (urlPath === '/api/users') {
                handlerModule = await import('./api/users.js');
              }

              if (handlerModule && handlerModule.default) {
                // Parse JSON body for POST/PUT
                if (req.method === 'POST' || req.method === 'PUT') {
                  let bodyStr = '';
                  req.on('data', chunk => bodyStr += chunk);
                  req.on('end', async () => {
                    try {
                      req.body = bodyStr ? JSON.parse(bodyStr) : {};
                    } catch (e) {
                      req.body = {};
                    }
                    const urlObj = new URL(req.url, `http://${req.headers.host}`);
                    req.query = Object.fromEntries(urlObj.searchParams);

                    // Response helpers
                    res.status = (code) => {
                      res.statusCode = code;
                      return res;
                    };
                    res.json = (data) => {
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify(data));
                    };

                    await handlerModule.default(req, res);
                  });
                  return;
                } else {
                  const urlObj = new URL(req.url, `http://${req.headers.host}`);
                  req.query = Object.fromEntries(urlObj.searchParams);

                  res.status = (code) => {
                    res.statusCode = code;
                    return res;
                  };
                  res.json = (data) => {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(data));
                  };

                  await handlerModule.default(req, res);
                  return;
                }
              }
            } catch (err) {
              console.error('Vite Dev API Error:', err);
            }
          }
          next();
        });
      }
    }
  ]
});
