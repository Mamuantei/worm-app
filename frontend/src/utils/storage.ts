// Wallet balances, withdrawals, referrals, and the registered-user list all
// live on the backend now (see /backend and utils/api.ts) — they are real
// money and must never be sourced from the client. This file only keeps
// small, non-sensitive UI preferences locally.

const SOUND_KEY = 'worm_sound_enabled_v1';

export function getSoundPreference(): boolean {
  try {
    const v = localStorage.getItem(SOUND_KEY);
    return v === null ? true : v === 'true';
  } catch {
    return true;
  }
}

export function saveSoundPreference(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, String(enabled));
  } catch {
    // ignore
  }
}
