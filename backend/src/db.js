import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFile = path.join(__dirname, '..', 'data', 'db.json');

const defaultData = {
  users: {},        // keyed by telegramId -> user object
  withdrawals: [],   // array of withdrawal records
  adEvents: [],       // ledger of every ad-watch reward credited (abuse prevention)
  gameEvents: [],      // ledger of every game-completion payout credited
  referralEvents: [],   // ledger of referral commissions credited
  admins: []            // [{ username, passwordHash }]
};

const adapter = new JSONFile(dbFile);
export const db = new Low(adapter, defaultData);

export async function initDb() {
  await db.read();
  db.data ||= structuredClone(defaultData);
  await db.write();
}

export function getOrCreateUser(telegramId, profile = {}, referralCodeUsed = null) {
  if (!db.data.users[telegramId]) {
    let referredBy = null;
    if (referralCodeUsed) {
      const referrer = Object.values(db.data.users).find((u) => u.referralCode === referralCodeUsed);
      if (referrer && referrer.telegramId !== telegramId) referredBy = referrer.telegramId;
    }
    db.data.users[telegramId] = {
      id: telegramId,
      telegramId,
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      username: profile.username || '',
      phoneNumber: '',
      balance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      referralEarnings: 0,
      totalGames: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      referralCode: 'WORM_' + telegramId.toString().slice(-6),
      referredBy,
      createdAt: new Date().toISOString(),
    };
  }
  return db.data.users[telegramId];
}
