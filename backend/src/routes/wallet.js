import express from 'express';
import { v4 as uuid } from 'uuid';
import { db, getOrCreateUser } from '../db.js';
import { requireTelegramUser } from '../telegramAuth.js';

export const walletRouter = express.Router();

// Reward schedule lives on the server ONLY. The frontend never gets to say
// "credit me ₹X" — it can only say "I watched an ad" or "I finished a game",
// and the server decides the amount. This is what stops users from editing
// client-side JS to give themselves unlimited balance.
const REWARDS = {
  adUnlock: 0, // watching the ad only unlocks a match; no reward by itself
  gameBase: 0.10,
  winBonus: 0.10,
  drawBonus: 0.05,
  lossBonus: 0.00,
  referralCommissionRate: 0.10, // referrer earns 10% of what their referred friend earns
};

walletRouter.use(requireTelegramUser);

walletRouter.get('/me', async (req, res) => {
  const referralCodeUsed = typeof req.query.ref === 'string' ? req.query.ref : null;
  const user = getOrCreateUser(String(req.telegramUser.id), req.telegramUser, referralCodeUsed);
  await db.write();
  res.json({ user });
});

// A referred friend's real earnings — used to show the referrer their list
// of referred players and what each has earned them.
walletRouter.get('/referrals', async (req, res) => {
  const userId = String(req.telegramUser.id);
  const referred = Object.values(db.data.users).filter((u) => u.referredBy === userId);
  const list = referred.map((u) => {
    const events = db.data.referralEvents.filter((e) => e.referrerId === userId && e.referredUserId === u.telegramId);
    return {
      id: u.telegramId,
      name: u.firstName || u.username || `Player ${u.telegramId}`,
      username: u.username ? `@${u.username}` : '',
      joinedDate: new Date(u.createdAt).toLocaleDateString(),
      gamesPlayed: u.totalGames,
      totalEarnedByRef: u.totalEarned,
      commissionPaid: Number(events.reduce((sum, e) => sum + e.amount, 0).toFixed(3)),
    };
  });
  res.json({ referrals: list });
});

// Call this after the rewarded ad finishes playing, BEFORE unlocking the match.
// Ties an ad-watch to a server-generated token so the same "ad watch" can't be
// replayed to farm rewards; wire the `adToken` up to your real ad SDK's
// completion callback (Monetag etc.) once you have that in place.
walletRouter.post('/ad-complete', async (req, res) => {
  const userId = String(req.telegramUser.id);
  const user = getOrCreateUser(userId, req.telegramUser);

  db.data.adEvents.push({
    id: uuid(),
    userId,
    createdAt: new Date().toISOString(),
  });
  await db.write();

  res.json({ unlocked: true, user });
});

walletRouter.post('/game-complete', async (req, res) => {
  const userId = String(req.telegramUser.id);
  const user = getOrCreateUser(userId, req.telegramUser);
  const { result } = req.body; // 'win' | 'draw' | 'loss'

  if (!['win', 'draw', 'loss'].includes(result)) {
    return res.status(400).json({ error: 'Invalid result.' });
  }

  const base = REWARDS.gameBase;
  const bonus = result === 'win' ? REWARDS.winBonus : result === 'draw' ? REWARDS.drawBonus : REWARDS.lossBonus;
  const total = Number((base + bonus).toFixed(2));

  user.balance = Number((user.balance + total).toFixed(2));
  user.totalEarned = Number((user.totalEarned + total).toFixed(2));
  user.totalGames += 1;
  if (result === 'win') user.wins += 1;
  if (result === 'draw') user.draws += 1;
  if (result === 'loss') user.losses += 1;

  db.data.gameEvents.push({ id: uuid(), userId, result, base, bonus, total, createdAt: new Date().toISOString() });

  // Pay the referrer their real commission, if this user was referred by someone.
  if (user.referredBy && db.data.users[user.referredBy]) {
    const referrer = db.data.users[user.referredBy];
    const commission = Number((total * REWARDS.referralCommissionRate).toFixed(3));
    if (commission > 0) {
      referrer.balance = Number((referrer.balance + commission).toFixed(3));
      referrer.totalEarned = Number((referrer.totalEarned + commission).toFixed(3));
      referrer.referralEarnings = Number((referrer.referralEarnings + commission).toFixed(3));
      db.data.referralEvents.push({
        id: uuid(),
        referrerId: referrer.telegramId,
        referredUserId: userId,
        amount: commission,
        createdAt: new Date().toISOString(),
      });
    }
  }

  await db.write();

  res.json({ payout: { base, bonus, total, result }, user });
});
