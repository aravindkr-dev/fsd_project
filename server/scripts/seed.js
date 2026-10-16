import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/User.js';

const email = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';

await connectDB();
if (await User.exists({ email })) {
  console.log(`Admin ${email} already exists`);
} else {
  await User.create({ name: 'HR Admin', email, role: 'admin', passwordHash: await User.hashPassword(password) });
  console.log(`Created admin ${email}`);
}
await mongoose.disconnect();
