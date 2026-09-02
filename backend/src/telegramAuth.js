import crypto from 'node:crypto';

// Verifies the `initData` string that Telegram signs and hands to your Mini App
// frontend. This is the ONLY reliable way to know a request really came from
// Telegram and really is who it claims to be. Never trust a telegramId sent
// in a plain request body without this check.
//
// Docs: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
export function verifyTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckArr = [];
  for (const [key, value] of [...params.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    dataCheckArr.push(`${key}=${value}`);
  }
  const dataCheckString = dataCheckArr.join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) return null;

  // Optional: reject stale initData (older than 24h) to limit replay window
  const authDate = Number(params.get('auth_date') || 0);
  const ageSeconds = Date.now() / 1000 - authDate;
  if (ageSeconds > 60 * 60 * 24) return null;

  const userRaw = params.get('user');
  const user = userRaw ? JSON.parse(userRaw) : null;
  if (!user || !user.id) return null;

  return user; // { id, first_name, last_name, username, ... }
}

// Express middleware: expects header `x-telegram-init-data`
export function requireTelegramUser(req, res, next) {
  const initData = req.header('x-telegram-init-data');
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_BYPASS === 'true') {
    // Local development only: lets you test without a real Telegram session.
    // ALLOW_DEV_BYPASS must never be set to true in production.
    req.telegramUser = { id: req.header('x-dev-user-id') || 'dev-user-1', first_name: 'Dev' };
    return next();
  }

  const user = verifyTelegramInitData(initData, botToken);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or missing Telegram session.' });
  }
  req.telegramUser = user;
  next();
}
