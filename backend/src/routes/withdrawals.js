import express from 'express';
import { v4 as uuid } from 'uuid';
import { db, getOrCreateUser } from '../db.js';
import { requireTelegramUser } from '../telegramAuth.js';

export const withdrawalsRouter = express.Router();
withdrawalsRouter.use(requireTelegramUser);

const MIN_WITHDRAWAL = 50; // ₹ — set your real minimum here

withdrawalsRouter.get('/', async (req, res) => {
  const userId = String(req.telegramUser.id);
  const mine = db.data.withdrawals.filter((w) => w.userId === userId);
  res.json({ withdrawals: mine });
});

withdrawalsRouter.post('/', async (req, res) => {
  const userId = String(req.telegramUser.id);
  const user = getOrCreateUser(userId, req.telegramUser);
  const { amount, payoutType, accountHolder, accountNumber, ifscCode, upiId } = req.body;

  if (!amount || amount < MIN_WITHDRAWAL) {
    return res.status(400).json({ error: `Minimum withdrawal is ₹${MIN_WITHDRAWAL}.` });
  }
  if (amount > user.balance) {
    return res.status(400).json({ error: 'Insufficient balance.' });
  }
  if (!['upi', 'bank'].includes(payoutType)) {
    return res.status(400).json({ error: 'Invalid payout type.' });
  }
  if (payoutType === 'upi' && !upiId) {
    return res.status(400).json({ error: 'UPI ID is required.' });
  }
  if (payoutType === 'bank' && (!accountNumber || !ifscCode)) {
    return res.status(400).json({ error: 'Account number and IFSC are required.' });
  }

  // Hold the funds immediately so the user can't request the same balance twice.
  user.balance = Number((user.balance - amount).toFixed(2));

  const record = {
    id: uuid(),
    userId,
    amount: Number(amount),
    payoutType,
    accountHolder,
    accountNumber: payoutType === 'bank' ? accountNumber : upiId,
    ifscCode: payoutType === 'bank' ? ifscCode : undefined,
    upiId: payoutType === 'upi' ? upiId : undefined,
    status: 'pending', // an admin must review and approve real-money payouts before anything is sent
    createdAt: new Date().toISOString(),
  };
  db.data.withdrawals.unshift(record);
  await db.write();

  res.json({ withdrawal: record, user });
});
