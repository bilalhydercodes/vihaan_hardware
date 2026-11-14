'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, Key, Satellite, Play } from '@/components/ui/icons';
import { useTracker } from '@/context/TrackerContext';

export function WelcomeBanner() {
  const [show, setShow] = useState(false);
  const { setTokenModalOpen, authToken } = useTracker();

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('navic_welcome_dismissed');
      if (!dismissed) {
        setShow(true);
      }
    } catch (e) {}
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem('navic_welcome_dismissed', 'true');
    } catch (e) {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="bg-gradient-to-r from-cyan-950/80 via-slate-900 to-slate-900 border-b border-cyan-800/50 text-slate-100 py-3.5 px-4 sm:px-6 relative shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-xl" role="img" aria-label="wave">👋</span>
          <div>
            <span className="font-bold text-white text-base mr-2">Welcome!</span>
            <span className="text-slate-300">
              Getting started is easy:
            </span>
            <ol className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 sm:mt-0 sm:ml-2 text-xs font-medium text-slate-200">
              <li className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-bold inline-flex items-center justify-center text-[10px]">1</span>
                {!authToken ? (
                  <button
                    onClick={() => setTokenModalOpen(true)}
                    className="underline text-cyan-300 hover:text-cyan-200 cursor-pointer font-semibold"
                  >
                    Enter your token
                  </button>
                ) : (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Token entered
                  </span>
                )}
              </li>
              <li className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-bold inline-flex items-center justify-center text-[10px]">2</span>
                <span>Pick a satellite</span>
              </li>
              <li className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-bold inline-flex items-center justify-center text-[10px]">3</span>
                <span>Press Start Tracking</span>
              </li>
            </ol>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="self-end sm:self-center flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
        >
          <span>Got it</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

