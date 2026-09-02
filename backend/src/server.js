import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db.js';
import { walletRouter } from './routes/wallet.js';
import { withdrawalsRouter } from './routes/withdrawals.js';
import { adminRouter } from './routes/admin.js';

const REQUIRED_ENV = ['TELEGRAM_BOT_TOKEN', 'JWT_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.warn(`[warn] ${key} is not set — see .env.example. Some features will fail until it is.`);
  }
}

await initDb();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/wallet', walletRouter);
app.use('/api/withdrawals', withdrawalsRouter);
app.use('/api/admin', adminRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error.' });
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`Worm backend listening on :${port}`));
