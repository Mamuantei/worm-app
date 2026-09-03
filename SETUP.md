# Worm — Setup Guide (spoon-fed, step by step)

This turns the cleaned-up "Worm" app into a real, working Telegram Mini App
with real INR payouts. Follow the steps in order — later steps depend on
earlier ones.

You'll end up with two things running:
- **backend/** — a small server that holds real balances and talks to Razorpay
- **frontend/** — the Telegram Mini App itself (what users see)

---

## Step 1 — Create your Telegram bot

1. Open Telegram, search for **@BotFather**, start a chat.
2. Send `/newbot`. Give it a name (e.g. "Worm") and a username ending in `bot`
   (e.g. `WormEarnBot`).
3. BotFather replies with a **bot token** — looks like `123456789:AAExampleToken`.
   **Save this** — you'll paste it into `backend/.env` in Step 5.
4. Send `/newapp` to BotFather, pick your bot, and follow the prompts to
   create a Mini App. When it asks for the **Web App URL**, you don't have
   one yet — come back and set it after Step 7 (BotFather lets you edit it
   later via `/myapps` → your bot → "Edit Web App URL").

---

## Step 2 — Get a code editor / terminal ready

You'll need to run commands. If you're not comfortable with a terminal:
- On Windows: install [Node.js](https://nodejs.org) (LTS version), then use
  the "Node.js command prompt" it installs.
- On Mac: open **Terminal** (search Spotlight for it), then install Node
  via [nodejs.org](https://nodejs.org) (LTS version).

Check it worked:
```
node --version
npm --version
```
Both should print a version number.

---

## Step 3 — Download this project

Unzip the project folder I gave you somewhere easy to find, e.g.
`Documents/worm-app`. Inside it you'll see `backend/` and `frontend/`.

---

## Step 4 — How payouts work (manual, no payment gateway)

There's no Razorpay or payment gateway wired in — by design, per your call.
Here's the actual flow:

1. A player requests a withdrawal in the app with their real UPI ID or bank
   account + IFSC. It sits as **pending**.
2. You open the app's **Admin** tab, see the pending request with their
   payout details.
3. You send the money yourself, for real, from your own UPI app or netbanking
   — exactly like sending money to any contact.
4. Once it's sent, you go back into the Admin tab and click **Mark as
   Paid**, then paste in the actual UTR / transaction reference number your
   bank or UPI app gave you for that transfer.
5. Only then does the app show the withdrawal as "completed" to the player.

**Important:** never click "Mark as Paid" before you've actually sent the
money. The whole point of this flow is that "completed" always means real
money really moved — that's what makes the app trustworthy to your users
and defensible if anyone ever asks.

This manual approach is fine to start with and is what a lot of small
real-money apps do before they're big enough to justify integrating a
payment gateway's payout API (Razorpay, Cashfree, etc.) for automation. If
you want to automate this later, that's a contained addition — happy to
build it whenever you're ready.

---

## Step 5 — Configure the backend

1. In `backend/`, copy `.env.example` to `.env`.
2. Fill in:
   - `TELEGRAM_BOT_TOKEN` — from Step 1
   - `JWT_SECRET` — run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and paste the output
3. Leave `NODE_ENV=production` and `ALLOW_DEV_BYPASS=false` for anything
   real users will touch.
4. Install and test locally:
   ```
   cd backend
   npm install
   npm start
   ```
   You should see `Worm backend listening on :8787`. Leave this running, or
   stop it (Ctrl+C) once you've confirmed it starts — you'll deploy it
   properly in Step 8.

---

## Step 6 — Create your admin login

Your admin account isn't built into the app (unlike the old version, which
had a real email/password hardcoded in the code where anyone could read it).
Create your own:

```
cd backend
node src/seedAdmin.js your_username a_strong_password_here
```

Use a password you don't use anywhere else — this account can approve real
money payouts. You'll use this username/password inside the app's Admin tab.

---

## Step 7 — Configure the frontend

1. In `frontend/`, create a file called `.env` with:
   ```
   VITE_API_URL=https://your-backend-url-here
   VITE_MONETAG_ZONE_ID=your-zone-id-here
   ```
   You don't have the backend URL yet — come back after Step 8 and fill it
   in, then rebuild (Step 9). See **Real Ads Setup** below for the zone ID.
2. The Telegram Mini App SDK is loaded automatically when opened inside
   Telegram — no extra setup needed there.

---

## Real Ads Setup (Monetag)

The app comes with real ad-network code already wired in (Monetag) — but it
needs **your own** account and zone ID, not a shared/example one, or any ad
revenue would go to someone else instead of you.

1. Go to [monetag.com](https://monetag.com) and sign up as a publisher.
2. Add your Mini App's URL as a new site/app in the Monetag dashboard (you
   can come back and update this after Step 9 once you have your real
   Vercel URL — Monetag lets you edit it later).
3. Monetag will review your submission — this can take anywhere from a few
   hours to a couple of days. Ad-based real-money apps sometimes get extra
   scrutiny, so make sure your app description to them is accurate.
4. Once approved, Monetag gives you a **Zone ID** (a number) for a
   Rewarded Interstitial / In-App Interstitial ad unit — pick that ad
   format, since it's the one already wired into this app's ad-unlock flow.
5. Copy that Zone ID and set it in `frontend/.env`:
   ```
   VITE_MONETAG_ZONE_ID=your-real-zone-id
   ```
6. Also add this same variable in Vercel: go to your Vercel project →
   **Settings → Environment Variables** → add `VITE_MONETAG_ZONE_ID` with
   your zone ID → redeploy (Vercel → Deployments → click the three dots on
   the latest deploy → **Redeploy**).

**Until you do this,** the app still works — the "watch ad to unlock"
screen just falls back to a plain 5-second timer instead of a real ad,
so nothing breaks while you wait for Monetag approval.

**If you want a second ad network too** (for redundancy or more revenue),
that's a separate integration each network needs its own SDK — happy to
wire one in whenever you've picked one.

---

## Step 8 — Deploy the backend somewhere it stays running

Pick one (Render is the simplest for beginners):

**Render.com (free tier available):**
1. Push this project to a GitHub repo (or use Render's "upload" option).
2. On Render: New → Web Service → connect your repo, set:
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
3. Add all the variables from your `backend/.env` under Render's
   **Environment** tab (don't upload the `.env` file itself).
4. Deploy. Render gives you a URL like `https://worm-backend.onrender.com`.
   **Save this URL.**

(Railway.app and Fly.io work the same way if you prefer those.)

---

## Step 9 — Deploy the frontend

1. Go back to `frontend/.env` and set `VITE_API_URL` to the backend URL
   from Step 8.
2. Deploy to **Vercel** (easiest for a Vite app):
   - Go to [vercel.com](https://vercel.com) → New Project → import your repo
   - Root directory: `frontend`
   - Add environment variable `VITE_API_URL` = your backend URL
   - Add environment variable `VITE_MONETAG_ZONE_ID` = your zone ID (once
     you have one — see Real Ads Setup above; safe to leave blank for now)
   - Deploy. Vercel gives you a URL like `https://worm-app.vercel.app`.

---

## Step 10 — Point your Telegram bot at the deployed app

1. Back in BotFather: `/myapps` → select your bot → your Mini App →
   **Edit Web App URL** → paste your Vercel URL from Step 9.
2. Also set a **Menu Button** so users have an easy way to open it:
   send BotFather `/setmenubutton`, pick your bot, and give it your Vercel URL.

---

## Step 11 — Test it end-to-end before letting real users in

1. Open your bot in Telegram, tap the menu button to launch the Mini App.
2. Watch an ad, play a match, confirm your balance goes up.
3. Go to Wallet, request a withdrawal for a small real amount, using a UPI
   ID or bank account you actually control (e.g. your own).
4. Open the Admin tab (bottom nav, after logging in with your Step 6
   credentials). You'll see the pending request.
5. Actually send that amount from your own UPI/banking app to the details
   shown.
6. Back in the Admin tab, click **Mark as Paid** and paste in the real UTR
   from the transfer you just sent.
7. Confirm the withdrawal now shows as completed with that UTR. This is the
   moment that proves the whole pipeline is real, not simulated.

Only after this works should you promote the bot to real users.

---

## What's intentionally different from the file you gave me

- No fake "other users" with fake balances — the user list is only real
  people who've opened your bot.
- No instant "completed" withdrawals — every payout is only marked
  completed after you enter a real UTR from a transfer you actually sent,
  reviewed by an admin.
- The old hardcoded owner email/password in the app's code is gone —
  admin login is now a real server-checked account you control.
- "vs Online" no longer pretends the bot is a real matched human opponent
  (it's labeled "Ranked Bot") — real player-vs-player matchmaking is a
  separate, bigger feature (needs a live matchmaking queue + websockets)
  that isn't built yet. Happy to build that next if you want it.
- Reward amounts are decided by the server, not the user's browser, so
  they can't be edited/cheated client-side.
- Admin access now requires answering a security question ("Worm" →
  "fire and lightning") before the real login screen even appears, then a
  real password check on top of that.
- The old fake "Live Player Payouts" activity feed (hardcoded fake
  usernames winning money) is gone from the home screen.

## If something doesn't work

- Backend won't start → check every value in `backend/.env` is filled in.
- "Invalid or missing Telegram session" → the app needs to be opened
  *inside* Telegram (not a regular browser tab) for real users; for your
  own testing outside Telegram, set `ALLOW_DEV_BYPASS=true` temporarily on
  your **local** machine only, never on the deployed backend.
- "Mark as Paid" rejects you → you have to type something into the UTR
  field; it can't be submitted blank. This is intentional — it's the one
  thing standing between "I sent the money" and "the app just says I did."
