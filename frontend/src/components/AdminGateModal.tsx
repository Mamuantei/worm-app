import React, { useState } from 'react';
import { motion } from 'motion/react';
import { KeyRound, X, AlertCircle } from 'lucide-react';
import { sounds } from '../utils/audio';

interface AdminGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPass: () => void;
}

const QUESTION = 'Worm';
const CORRECT_ANSWER = 'fire and lightning';

// A quiet extra step before the admin login screen even shows up. This is
// just an obscurity gate (not real security on its own — the real security
// is the backend-verified admin login that comes after). Wrong answers
// don't reveal anything, they just don't proceed.
export const AdminGateModal: React.FC<AdminGateModalProps> = ({ isOpen, onClose, onPass }) => {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim().toLowerCase() === CORRECT_ANSWER) {
      sounds.playClick();
      setAnswer('');
      setError(null);
      onPass();
    } else {
      sounds.playDraw();
      setError('Not quite.');
      setAnswer('');
    }
  };

  const handleClose = () => {
    setAnswer('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="bg-[#0f172a] border border-slate-700 rounded-3xl p-5 max-w-sm w-full shadow-2xl relative"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white text-sm font-display">{QUESTION}</h3>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <input
            type="text"
            autoFocus
            value={answer}
            onChange={(e) => { setAnswer(e.target.value); if (error) setError(null); }}
            placeholder="Your answer"
            className="w-full bg-[#020617] border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-slate-500"
          />

          {error && (
            <div className="flex items-center gap-1.5 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition active:scale-98"
          >
            Continue
          </button>
        </form>
      </motion.div>
    </div>
  );
};
