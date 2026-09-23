import createAdHandler from 'monetag-tg-sdk';

declare global {
  interface Window {
    [key: string]: any;
  }
}

export const MONETAG_ZONE_ID = import.meta.env.VITE_MONETAG_ZONE_ID || '';
const MONETAG_ZONE_NUMBER = Number(MONETAG_ZONE_ID);

let adHandler: ReturnType<typeof createAdHandler> | null = null;
let preloadPromise: Promise<boolean> | null = null;
let preloaded = false;

function getYmid(): string {
  const userId = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  return userId ? `tg_${userId}` : `worm_${Date.now()}`;
}

function getAdHandler() {
  if (!MONETAG_ZONE_ID || !Number.isFinite(MONETAG_ZONE_NUMBER) || MONETAG_ZONE_NUMBER <= 0) return null;

  if (!adHandler) {
    // The official SDK expects the zone ID as a number.
    adHandler = createAdHandler(MONETAG_ZONE_NUMBER);
  }

  return adHandler;
}

export function isMonetagConfigured(): boolean {
  return Boolean(MONETAG_ZONE_ID);
}

export function isMonetagReady(): boolean {
  return Boolean(getAdHandler()) && preloaded;
}

/** Preload a rewarded interstitial before the user presses Play. */
export async function preloadRewardedInterstitial(): Promise<boolean> {
  const handler = getAdHandler();
  if (!handler) return false;
  if (preloaded) return true;
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    try {
      await handler({ type: 'preload', timeout: 5, ymid: getYmid(), requestVar: 'play_match' });
      preloaded = true;
      return true;
    } catch (error) {
      preloaded = false;
      console.warn('[Monetag] Preload failed:', error);
      return false;
    } finally {
      preloadPromise = null;
    }
  })();

  return preloadPromise;
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
    const ymid = getYmid();
    // Default handler() is the Rewarded Interstitial. The SDK's 'end' mode is
    // a different ad trigger, so do not use it for the rewarded game unlock.
    const show = () => handler({ ymid, requestVar: 'play_match' });

    // Prefer the preloaded ad. If preload was not ready, make one last attempt
    // immediately so a slow startup does not permanently block the player.
    if (!preloaded) {
      await preloadRewardedInterstitial();
    }

    await Promise.race([
      show(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Monetag ad request timed out')), 12000)
      ),
    ]);
    preloaded = false;
    return true;
  } catch (error) {
    console.warn('[Monetag] Rewarded interstitial failed:', error);
    return false;
  }
}
