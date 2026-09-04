import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Loader2, PlayCircle, X, Zap, AlertTriangle } from 'lucide-react';
import { sounds } from '../utils/audio';
import { isMonetagConfigured, showRewardedInterstitial } from '../utils/monetag';

interface AdModalProps {
  isOpen: boolean;
  onAdComplete: () => void;
  onClose: () => void;
}

type Phase = 'loading' | 'watched' | 'unavailable' | 'timerFallback';

const FALLBACK_SECONDS = 5;

export const AdModal: React.FC<AdModalProps> = ({ isOpen, onAdComplete, onClose }) => {
  const [phase, setPhase] = useState<Phase>('loading');
  const [secondsLeft, setSecondsLeft] = useState(FALLBACK_SECONDS);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      startedRef.current = false;
      setPhase('loading');
      setSecondsLeft(FALLBACK_SECONDS);
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    if (!isMonetagConfigured()) {
      // No zone ID set yet — fall back straight to the plain timer rather
      // than pretending an ad attempt happened.
      setPhase('timerFallback');
      return;
    }

    (async () => {
      const watched = await showRewardedInterstitial();
      if (watched) {
        sounds.playAdComplete();
        setPhase('watched');
      } else {
        setPhase('unavailable');
      }
    })();
  }, [isOpen]);

  // Countdown for the fallback timer (used when no real ad played)
  useEffect(() => {
    if (phase !== 'timerFallback') return;
    if (secondsLeft <= 0) {
      setPhase('watched');
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, secondsLeft]);

  if (!isOpen) return null;

  const handleUnlock = () => {
    sounds.playClick();
    onAdComplete();
  };

  const handleUseFallbackTimer = () => {
    setSecondsLeft(FALLBACK_SECONDS);
    setPhase('timerFallback');
  };

  const handleRetryAd = () => {
    startedRef.current = false;
    setPhase('loading');
    // Re-trigger the effect manually since isOpen hasn't changed
    (async () => {
      startedRef.current = true;
      const watched = await showRewardedInterstitial();
      if (watched) {
        sounds.playAdComplete();
        setPhase('watched');
      } else {
        setPhase('unavailable');
      }
    })();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          className="w-full max-w-sm rounded-3xl overflow-hidden bg-gradient-to-b from-[#0f172a] via-[#090d16] to-[#020617] border border-slate-700/80 shadow-2xl text-slate-100 flex flex-col"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-[#020617]/70">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">
                Watch Ad to Unlock
              </span>
            </div>
            <button
              onClick={() => { sounds.playClick(); onClose(); }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 flex flex-col items-center text-center gap-4 min-h-[220px] justify-center">
            {phase === 'loading' && (
              <>
                <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
                <div>
                  <div className="font-bold text-white text-sm">Loading ad…</div>
                  <div className="text-xs text-slate-400 mt-1">This only takes a moment.</div>
                </div>
              </>
            )}

            {phase === 'watched' && (
              <>
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <div>
                  <div className="font-bold text-white text-sm">Match unlocked!</div>
                  <div className="text-xs text-slate-400 mt-1">You're ready to play.</div>
                </div>
              </>
            )}

            {phase === 'unavailable' && (
              <>
                <AlertTriangle className="w-10 h-10 text-amber-400" />
                <div>
                  <div className="font-bold text-white text-sm">No ad available right now</div>
                  <div className="text-xs text-slate-400 mt-1">
                    This can happen if there's no ad inventory at the moment.
                  </div>
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={handleRetryAd}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition active:scale-98 flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                  <button
                    onClick={handleUseFallbackTimer}
                    className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition active:scale-98"
                  >
                    Skip (wait {FALLBACK_SECONDS}s)
                  </button>
                </div>
              </>
            )}

            {phase === 'timerFallback' && (
              <>
                <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
                <div>
                  <div className="font-bold text-white text-sm">
                    {secondsLeft > 0 ? `Unlocking in ${secondsLeft}s…` : 'Unlocked!'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">No ad available — using timed unlock.</div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 bg-[#020617]/70">
            <button
              onClick={handleUnlock}
              disabled={phase !== 'watched'}
              className={`w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition ${
                phase === 'watched'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-98'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              <span>{phase === 'watched' ? 'Start Match Now' : 'Waiting…'}</span>
            </button>
            <button
              onClick={() => { sounds.playClick(); onClose(); }}
              className="w-full text-center text-[11px] text-slate-500 hover:text-slate-300 mt-2.5 transition"
            >
              Cancel & Return Home
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
