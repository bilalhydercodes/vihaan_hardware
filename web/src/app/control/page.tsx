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
  Compass,
  X
} from '@/components/ui/icons';

export default function ControlPage() {
  const { connectionStatus, authToken, setTokenModalOpen, status, telemetry } = useTracker();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Determine if controls should be disabled and the reason
  const isOffline = connectionStatus !== 'connected';
  const isUnauthenticated = !authToken;
  const isMoving = status?.state === 'SLEWING' || status?.state === 'HOMING';

  const isDisabled = isOffline || isUnauthenticated || isMoving;

  let disabledReason: string | undefined;
  if (isOffline) {
    disabledReason = 'Tracker connection offline. Check Wi-Fi or mock server status.';
  } else if (isUnauthenticated) {
    disabledReason = 'Motor control locked. A valid Bearer auth token is required.';
  } else if (isMoving) {
    disabledReason = `Mount currently in motion (${status?.state}). Wait for move to complete.`;
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
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-cyan-400" />
            Antenna Mount Motor Control & Satellite Steering
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manual dual-axis jog slewing, homing calibration, and autonomous constellation targeting
          </p>
        </div>

        {/* Live Mount Status Pill */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <span>STATE: </span>
            <strong
              className={`uppercase ${
                status?.state === 'TRACKING'
                  ? 'text-emerald-400'
                  : status?.state === 'SLEWING'
                  ? 'text-cyan-400'
                  : status?.state === 'HOMING'
                  ? 'text-amber-400'
                  : 'text-white'
              }`}
            >
              {status?.state || 'IDLE'}
            </strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <span>HOMED: </span>
            <strong className={status?.homed ? 'text-emerald-400' : 'text-amber-400'}>
              {status?.homed ? 'YES' : 'NO'}
            </strong>
          </div>
        </div>
      </div>

      {/* Safety / Disabled Reason Banner */}
      {isDisabled && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            {isOffline ? (
              <WifiOff className="w-5 h-5 text-amber-400 flex-shrink-0" />
            ) : isUnauthenticated ? (
              <Lock className="w-5 h-5 text-amber-400 flex-shrink-0" />
            ) : (
              <Activity className="w-5 h-5 text-cyan-400 animate-spin flex-shrink-0" />
            )}
            <div>
              <strong className="font-semibold text-amber-100 block">Controls Disabled</strong>
              <span>{disabledReason}</span>
            </div>
          </div>

          {isUnauthenticated && (
            <button
              onClick={() => setTokenModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs transition-colors cursor-pointer flex-shrink-0"
            >
              Enter Token
            </button>
          )}
        </div>
      )}

      {/* Server Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <strong className="font-semibold text-rose-100 block">Tracker Error</strong>
              <span className="font-mono">{errorMessage}</span>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-rose-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-mono">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-emerald-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Manual Jog & Homing (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <ManualMoveCard
            disabled={isDisabled}
            disabledReason={disabledReason}
            onError={handleError}
            onSuccess={handleSuccess}
          />

          <HomingCard
            disabled={isDisabled}
            disabledReason={disabledReason}
            onError={handleError}
            onSuccess={handleSuccess}
          />
        </div>

        {/* Right Column: Satellite Selector & Live Beam (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <SatelliteSelector
            disabled={isDisabled}
            disabledReason={disabledReason}
            onError={handleError}
            onSuccess={handleSuccess}
          />

          {/* Current Attitude Overview */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400">
              <span className="font-semibold uppercase flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-cyan-400" />
                Live Mount Position
              </span>
              <span className="text-slate-500">28BYJ-48 Steppers</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Azimuth:</span>
              <strong className="text-white">
                {telemetry ? telemetry.currentAngles.azimuth.toFixed(2) : status?.currentAngles.azimuth.toFixed(2)}°
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Elevation:</span>
              <strong className="text-white">
                {telemetry ? telemetry.currentAngles.elevation.toFixed(2) : status?.currentAngles.elevation.toFixed(2)}°
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Target Azimuth:</span>
              <strong className="text-amber-400">
                {telemetry ? telemetry.targetAngles.azimuth.toFixed(2) : status?.targetAngles.azimuth.toFixed(2)}°
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Target Elevation:</span>
              <strong className="text-amber-400">
                {telemetry ? telemetry.targetAngles.elevation.toFixed(2) : status?.targetAngles.elevation.toFixed(2)}°
              </strong>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-2">
              <span className="text-slate-400">Pointing Error:</span>
              <strong className="text-emerald-400">
                {telemetry ? `${telemetry.trackingErrorDeg.toFixed(2)}°` : '0.00°'}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

