// Netlify Function entry: wraps the Express app and reuses one Mongo connection.
import serverless from 'serverless-http';
import app from '../../server/src/app.js';
import { connectDB } from '../../server/src/config/db.js';

// serverless-http pre-fills req.body with a Buffer, which makes express.json()
// skip parsing. Parse JSON here and mark the body as handled.
const handle = serverless((req, res) => {
  if (Buffer.isBuffer(req.body)) {
    const raw = req.body.toString('utf8');
    const isJson = /json/i.test(req.headers['content-type'] || '');
    try {
      req.body = isJson && raw ? JSON.parse(raw) : {};
    } catch {
      req.body = {};
    }
    req._body = true;
  }
  return app(req, res);
});
const PREFIX = '/.netlify/functions/api';
let ready;

export const handler = async (event, context) => {
  ready ??= connectDB().catch((e) => {
    ready = undefined;
    throw e;
  });
  try {
    await ready;
  } catch (e) {
    console.error(e);
    return {
      statusCode: 503,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Database unavailable' }),
    };
  }
  // The redirect may or may not leave the function prefix on the path.
  if (event.path.startsWith(PREFIX)) event.path = event.path.slice(PREFIX.length) || '/';
  return handle(event, context);
};
