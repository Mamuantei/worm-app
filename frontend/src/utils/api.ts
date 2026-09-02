// Talks to the Worm backend (see /backend). Set VITE_API_URL in your
// frontend .env to point at your deployed backend, e.g.
// VITE_API_URL=https://worm-backend.onrender.com
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

function getTelegramInitData(): string {
  // Provided automatically by Telegram when the Mini App is opened inside
  // Telegram. It's an opaque signed string the backend verifies — the
  // frontend never has to (and shouldn't) parse or trust it itself.
  return (window as any)?.Telegram?.WebApp?.initData || '';
}

async function request(path: string, options: RequestInit = {}) {
  const initData = getTelegramInitData();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (initData) headers['x-telegram-init-data'] = initData;

  // Local dev only: if there's no real Telegram session, fall back to a
  // dev header so you can test outside Telegram. Backend only honors this
  // when ALLOW_DEV_BYPASS=true, which must never be set in production.
  if (!initData && import.meta.env.DEV) {
    headers['x-dev-user-id'] = 'dev-user-1';
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  getWallet: (referralCode?: string) =>
    request(`/api/wallet/me${referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ''}`),
  adComplete: () => request('/api/wallet/ad-complete', { method: 'POST' }),
  gameComplete: (result: 'win' | 'draw' | 'loss') =>
    request('/api/wallet/game-complete', { method: 'POST', body: JSON.stringify({ result }) }),
  getReferrals: () => request('/api/wallet/referrals'),

  getWithdrawals: () => request('/api/withdrawals'),
  createWithdrawal: (payload: {
    amount: number;
    payoutType: 'upi' | 'bank';
    accountHolder: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
  }) => request('/api/withdrawals', { method: 'POST', body: JSON.stringify(payload) }),

  adminLogin: (username: string, password: string) =>
    request('/api/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
};

export function adminRequest(path: string, token: string, options: RequestInit = {}) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> | undefined),
    },
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  });
}
