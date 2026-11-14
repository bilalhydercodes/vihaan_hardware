'use client';

import React, { useState } from 'react';
import { useTracker } from '@/context/TrackerContext';
import { SatelliteSelector } from '@/components/control/SatelliteSelector';
import { ManualMoveCard } from '@/components/control/ManualMoveCard';
import { HomingCard } from '@/components/control/HomingCard';
import {
  Radio,
  Lock,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Activity,
  X
} from '@/components/ui/icons';

export default function ControlPage() {
  const { connectionStatus, authToken, setTokenModalOpen, status } = useTracker();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isOffline = connectionStatus !== 'connected';
  const isUnauthenticated = !authToken;
  const isMoving = status?.state === 'SLEWING' || status?.state === 'HOMING';

  const isDisabled = isOffline || isUnauthenticated || isMoving;

  let disabledReason: string | undefined;
  if (isOffline) {
    disabledReason = 'Tracker is not connected. Check that it is switched on and connected to your Wi-Fi.';
  } else if (isUnauthenticated) {
    disabledReason = 'Motor control is locked for safety. Please enter your password token to enable controls.';
  } else if (isMoving) {
    disabledReason = `The antenna is currently ${status?.state === 'HOMING' ? 'resetting position' : 'moving'}. Please wait a moment.`;
  }

  const handleError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
  };

  const handleSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-cyan-400" />
            Control Tracker
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Start or stop tracking, pick which satellite to follow, or reset the antenna position.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <span>State: </span>
            <strong className="text-white font-semibold">
              {status?.state === 'TRACKING' ? 'Tracking' : status?.state === 'SLEWING' ? 'Moving' : status?.state === 'HOMING' ? 'Resetting' : 'Ready'}
            </strong>
          </div>
        </div>
      </div>

      {/* Disabled Reason Banner */}
      {isDisabled && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-amber-200">
          <div className="flex items-center gap-3">
            {isOffline ? (
              <WifiOff className="w-5 h-5 text-amber-400 shrink-0" />
            ) : isUnauthenticated ? (
              <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <Activity className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
            )}
            <div>
              <strong className="font-bold text-amber-100 block">Controls Temporarily Locked</strong>
              <span>{disabledReason}</span>
            </div>
          </div>

          {isUnauthenticated && (
            <button
              onClick={() => setTokenModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shrink-0"
            >
              Enter Password Token
            </button>
          )}
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <strong className="font-bold text-rose-100 block">Action Failed</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 hover:bg-rose-500/20 rounded text-rose-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="p-1 hover:bg-emerald-500/20 rounded text-emerald-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Controls Section (Start / Stop Tracking & Reset Position) */}
      <HomingCard
        disabled={isDisabled}
        disabledReason={disabledReason}
        onError={handleError}
        onSuccess={handleSuccess}
      />

      {/* Satellite Picker Dropdown */}
      <SatelliteSelector
        disabled={isDisabled}
        disabledReason={disabledReason}
        onError={handleError}
        onSuccess={handleSuccess}
      />

      {/* Collapsed Advanced: Manual Move */}
      <ManualMoveCard
        disabled={isDisabled}
        disabledReason={disabledReason}
        onError={handleError}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
