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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full shadow-2xl p-6 text-slate-100 relative">
        <button
          onClick={() => setTokenModalOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Tracker Authentication</h2>
            <p className="text-xs text-slate-400">Motor Control & Configuration Security</p>
          </div>
        </div>

        <div className="p-3 mb-5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            Every motor move, homing routine, and calibration update requires a valid Bearer token.
            The default mock server token is <code className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-cyan-300">navic-secret-token-123</code>.
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Bearer API Token
            </label>
            <div className="relative">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Enter auth token..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
                autoFocus
              />
              {authToken && (
                <span className="absolute right-3 top-2.5 text-emerald-400 text-xs flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Stored securely in your local browser storage (<code className="text-slate-400">localStorage</code>).
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            {authToken ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-400 hover:text-rose-300 transition-colors underline cursor-pointer"
              >
                Clear Token
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTokenModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!tokenInput.trim()}
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
              >
                {showSavedFeedback ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-slate-950" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    Save & Authenticate
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

