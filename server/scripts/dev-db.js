// Local MongoDB for development when none is installed. Data persists in server/.data.
import fs from 'node:fs';
import { MongoMemoryServer } from 'mongodb-memory-server';

fs.mkdirSync('.data', { recursive: true });
const mongod = await MongoMemoryServer.create({
  instance: { port: 27017, dbPath: '.data', storageEngine: 'wiredTiger' },
});
console.log(`Dev MongoDB ready at ${mongod.getUri()}`);
process.on('SIGINT', async () => {
  await mongod.stop();
  process.exit(0);
});
