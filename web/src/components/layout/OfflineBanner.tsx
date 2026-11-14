'use client';

import React from 'react';
import { useTracker } from '@/context/TrackerContext';
import { WifiOff, RefreshCw } from '@/components/ui/icons';

export function OfflineBanner() {
  const { connectionStatus, reconnectCountdown, reconnectNow } = useTracker();

  if (connectionStatus === 'connected') return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-4 py-2.5 text-sm flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong className="font-bold text-amber-100">
            {connectionStatus === 'connecting' ? 'Connecting to Tracker...' : 'Tracker Not Connected:'}
          </strong>{' '}
          {connectionStatus === 'connecting'
            ? 'Establishing connection to tracker...'
            : 'Make sure your tracker is switched on and on the same Wi-Fi.'}
          {reconnectCountdown !== null && (
            <span className="ml-1 text-amber-300">
              Trying again in <strong>{reconnectCountdown}s</strong>...
            </span>
          )}
        </span>
      </div>
      <button
        onClick={reconnectNow}
        className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-xs font-semibold text-amber-100 transition-colors cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Try Now</span>
      </button>
    </div>
  );
}

