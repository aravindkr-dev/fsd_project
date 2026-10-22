import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { UPLOAD_DIR } from './services/fileService.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

app.set('trust proxy', 1); // behind Netlify/Render/Vercel: use X-Forwarded-For for req.ip (rate limiting)
app.use(helmet());
app.use(cors({ origin: env.clientUrl.split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));
if (env.nodeEnv !== 'test') app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Dev-only local file storage (used when Cloudinary isn't configured).
app.use('/uploads', express.static(UPLOAD_DIR));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/v1', routes);

// Single-host deploy: serve the built client (client/dist) when it exists.
// Resolved from cwd (server/) rather than import.meta, which is empty when bundled as CJS.
const CLIENT_DIST = path.resolve(process.cwd(), '../client/dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
