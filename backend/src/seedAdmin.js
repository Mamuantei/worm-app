// Run once to create your admin login: `node src/seedAdmin.js myusername mypassword`
import 'dotenv/config';
import { db, initDb } from './db.js';
import { hashPassword } from './adminAuth.js';

const [, , username, password] = process.argv;
if (!username || !password) {
  console.error('Usage: node src/seedAdmin.js <username> <password>');
  process.exit(1);
}
if (password.length < 10) {
  console.error('Please use a password with at least 10 characters.');
  process.exit(1);
}

await initDb();
db.data.admins = db.data.admins.filter((a) => a.username !== username);
db.data.admins.push({ username, passwordHash: hashPassword(password) });
await db.write();
console.log(`Admin "${username}" created.`);
