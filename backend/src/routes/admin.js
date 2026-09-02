import express from 'express';
import { db } from '../db.js';
import { verifyPassword, signAdminToken, requireAdmin } from '../adminAuth.js';

export const adminRouter = express.Router();

// Admin accounts are created once via the seed script (see SETUP.md step 6),
// not through the app itself — there is no self-serve "become admin" path.
adminRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = db.data.admins.find((a) => a.username === username);
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const token = signAdminToken(username);
  res.json({ token });
});

adminRouter.use(requireAdmin);

adminRouter.get('/users', (req, res) => {
  res.json({ users: Object.values(db.data.users) });
});

adminRouter.get('/withdrawals', (req, res) => {
  res.json({ withdrawals: db.data.withdrawals });
});

// Manual payout flow: you (the admin) send the money yourself from your own
// bank/UPI app, THEN come back and mark it paid with the real UTR/reference
// number your bank gave you. A withdrawal can only be marked "completed"
// with a real, non-empty reference — nothing is auto-generated or faked.
adminRouter.post('/withdrawals/:id/mark-paid', async (req, res) => {
  const { utrNumber } = req.body;
  const record = db.data.withdrawals.find((w) => w.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found.' });
  if (record.status !== 'pending') return res.status(400).json({ error: 'Already processed.' });
  if (!utrNumber || !utrNumber.trim()) {
    return res.status(400).json({ error: 'Enter the real UTR/reference number from the transfer you just sent.' });
  }

  record.status = 'completed';
  record.utrNumber = utrNumber.trim();
  record.paidAt = new Date().toISOString();
  await db.write();

  res.json({ withdrawal: record });
});

adminRouter.post('/withdrawals/:id/reject', async (req, res) => {
  const { reason } = req.body;
  const record = db.data.withdrawals.find((w) => w.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found.' });
  if (record.status !== 'pending') return res.status(400).json({ error: 'Already processed.' });

  const user = db.data.users[record.userId];
  if (user) user.balance = Number((user.balance + record.amount).toFixed(2)); // refund

  record.status = 'rejected';
  record.rejectionReason = reason || 'Rejected by admin';
  record.rejectedAt = new Date().toISOString();
  await db.write();

  res.json({ withdrawal: record });
});

