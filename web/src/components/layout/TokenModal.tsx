'use client';

import React, { useState, useEffect } from 'react';
import { useTracker } from '@/context/TrackerContext';
import { Key, Lock, CheckCircle, X, AlertTriangle } from '@/components/ui/icons';

export function TokenModal() {
  const { authToken, setAuthToken, clearAuthToken, isTokenModalOpen, setTokenModalOpen } = useTracker();
  const [tokenInput, setTokenInput] = useState('');
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  useEffect(() => {
    if (authToken) {
      setTokenInput(authToken);
    } else {
      setTokenInput('');
    }
  }, [authToken, isTokenModalOpen]);

  if (!isTokenModalOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      setAuthToken(tokenInput.trim());
      setShowSavedFeedback(true);
      setTimeout(() => {
        setShowSavedFeedback(false);
        setTokenModalOpen(false);
      }, 700);
    }
  };

  const handleClear = () => {
    clearAuthToken();
    setTokenInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 text-slate-100 relative">
        <button
          onClick={() => setTokenModalOpen(false)}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Enter Password Token</h2>
            <p className="text-xs text-slate-400">Required to move the antenna and save settings</p>
          </div>
        </div>

        <div className="p-3.5 mb-5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-1.5">
          <p>
            To prevent anyone else on your Wi-Fi from moving the motors by accident, the tracker requires this password.
          </p>
          <p className="text-slate-400">
            For local testing, the default password is: <code className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-bold select-all">navic-secret-token-123</code>
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password Token
            </label>
            <div className="relative">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste token here (e.g. navic-secret-token-123)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                autoFocus
              />
              {authToken && (
                <span className="absolute right-3.5 top-3 text-emerald-400 text-xs flex items-center gap-1 font-semibold">
                  <CheckCircle className="w-4 h-4" /> Active
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Saved securely inside your web browser. You only need to enter it once.
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            {authToken ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-400 hover:text-rose-300 transition-colors underline cursor-pointer"
              >
                Clear Token
              </button>
            ) : <div />}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setTokenModalOpen(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!tokenInput.trim()}
                className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:pointer-events-none rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                {showSavedFeedback ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-slate-950" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Save Token</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
