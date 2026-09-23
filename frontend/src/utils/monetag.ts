import createAdHandler from 'monetag-tg-sdk';

declare global {
  interface Window {
    [key: string]: any;
  }
}

export const MONETAG_ZONE_ID = import.meta.env.VITE_MONETAG_ZONE_ID || '';

let adHandler: ReturnType<typeof createAdHandler> | null = null;

function getAdHandler() {
  if (!MONETAG_ZONE_ID) return null;

  if (!adHandler) {
    adHandler = createAdHandler(MONETAG_ZONE_ID);
  }

  return adHandler;
}

export function isMonetagConfigured(): boolean {
  return Boolean(MONETAG_ZONE_ID);
}

export function isMonetagReady(): boolean {
  return Boolean(getAdHandler());
}

/**
 * Shows a Monetag Rewarded Interstitial using the official
 * Monetag Telegram Mini App SDK package.
 *
 * The package handles SDK initialization for React apps, avoiding
 * reliance on a global window.show_<zoneId> function created by a
 * static script tag.
 */
export async function showRewardedInterstitial(): Promise<boolean> {
  const handler = getAdHandler();

  if (!handler) {
    console.warn('[Monetag] Zone ID is not configured.');
    return false;
  }

  try {
    // Do not let a Telegram WebView / ad-network initialization hang the game forever.
    // If Monetag does not resolve within 12 seconds, treat it as unavailable and
    // let the UI show the retry/fallback options.
    await Promise.race([
      handler(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Monetag ad request timed out')), 12000)
      ),
    ]);
    return true;
  } catch (error) {
    console.warn('[Monetag] Rewarded interstitial failed:', error);
    return false;
  }
}
