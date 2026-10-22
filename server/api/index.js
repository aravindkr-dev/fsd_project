// Vercel serverless entry: reuses one Mongo connection across warm invocations.
import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';

let ready;

export default async function handler(req, res) {
  ready ??= connectDB().catch((e) => {
    ready = undefined;
    throw e;
  });
  try {
    await ready;
  } catch (e) {
    console.error(e);
    return res.status(503).json({ message: 'Database unavailable' });
  }
  return app(req, res);
}
