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

// Ad creatives shown while a rewarded ad "plays" in the demo AdModal. These
// are just placeholder sponsor cards for the unlock screen, not financial
// claims — swap in your real ad network's creative feed here.
export const AD_CREATIVES = [
  {
    id: 'ad-placeholder-1',
    title: 'Sponsor Slot 1',
    sponsor: 'Your Ad Network',
    tagline: 'Wire this up to your real ad SDK',
    description: 'Replace with a real rewarded-ad creative from your ad network.',
    category: 'Placeholder',
    rewardText: 'Unlock Match',
    bannerGradient: 'from-blue-600 via-indigo-600 to-cyan-500',
    badge: 'SPONSORED',
    ctaText: 'Learn More',
    iconType: 'game' as const,
  },
];
