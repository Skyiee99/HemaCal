import { defineConfig, loadEnv } from 'vite';
import handler from './api/gemini.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: {
      port: 5173,
      host: '127.0.0.1'
    },
    plugins: [
      {
        name: 'api-gemini-dev-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.split('?')[0] === '/api/gemini') {
              if (!process.env.GEMINI_API_KEY && env.GEMINI_API_KEY) {
                process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
              }

              const buffers = [];
              for await (const chunk of req) {
                buffers.push(chunk);
              }
              const rawBody = Buffer.concat(buffers).toString();
              try {
                req.body = rawBody ? JSON.parse(rawBody) : {};
              } catch {
                req.body = {};
              }

              res.status = (code) => {
                res.statusCode = code;
                return res;
              };
              res.json = (obj) => {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify(obj));
                return res;
              };

              try {
                await handler(req, res);
              } catch (err) {
                console.error('Dev Server API handler error:', err);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'SERVER_ERROR', message: err.message }));
              }
              return;
            }
            next();
          });
        }
      }
    ]
  };
});
