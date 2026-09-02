# Worm — Telegram Mini App

A Tic-Tac-Toe game with ad-gated matches, real INR rewards, and UPI/bank
withdrawals, built as a Telegram Mini App.

- `backend/` — Express API: real wallet balances, Telegram auth, Razorpay payouts
- `frontend/` — the Vite/React Mini App itself

**Start here: [SETUP.md](./SETUP.md)** — a full step-by-step guide to get
this running for real, from creating your Telegram bot through your first
live payout.

## Quick reference (once set up)

```
cd backend && npm install && npm start      # runs on :8787
cd frontend && npm install && npm run dev   # runs on :3000 (or 5173)
```

Requires `backend/.env` and `frontend/.env` — see each folder's
`.env.example` and SETUP.md for what to fill in.
