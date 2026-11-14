'use client';

import React, { useState } from 'react';
import { trackerApi } from '@/lib/api';
import { useTracker } from '@/context/TrackerContext';
import { HomeIcon, Play, Pause, CheckCircle, AlertTriangle } from '@/components/ui/icons';
import { ConfirmModal } from './ConfirmModal';

interface HomingCardProps {
  disabled: boolean;
  disabledReason?: string;
  onError: (err: string) => void;
  onSuccess: (msg: string) => void;
}

export function HomingCard({ disabled, disabledReason, onError, onSuccess }: HomingCardProps) {
  const { status, refreshStatus } = useTracker();
  const [isConfirmHomeOpen, setIsConfirmHomeOpen] = useState(false);
  const [isHomingLoading, setIsHomingLoading] = useState(false);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);

  const isTracking = status?.state === 'TRACKING';
  const isHomed = status?.homed;

  const handleExecuteHome = async () => {
    setIsHomingLoading(true);
    try {
      const res = await trackerApi.home('ALL');
      await refreshStatus();
      onSuccess(res.message || 'Homing calibration sequence initiated against mechanical limit switches');
    } catch (err: any) {
      onError(err.message || 'Homing command rejected');
    } finally {
      setIsHomingLoading(false);
      setIsConfirmHomeOpen(false);
    }
  };

  const handleToggleTracking = async () => {
    setIsTrackingLoading(true);
    try {
      const action = isTracking ? 'STOP' : 'START';
      await trackerApi.setTracking(action);
      await refreshStatus();
      onSuccess(action === 'START' ? 'Autonomous satellite tracking started' : 'Tracking stopped. Motors holding position.');
    } catch (err: any) {
      onError(err.message || 'Tracking toggle failed');
    } finally {
      setIsTrackingLoading(false);
    }
  };

  return (
    <>
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <HomeIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">Homing & Autonomous State</h3>
              <p className="text-xs text-slate-400">Mechanical endstop calibration and tracking engagement</p>
            </div>
          </div>
          <span
            className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
              isHomed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {isHomed ? 'HOMED & CALIBRATED' : 'UN-HOMED'}
          </span>
        </div>

        <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs text-slate-300 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Homing rotates both Azimuth and Elevation axes toward physical limit switches (GPIO 32 & 33) to zero the internal step counters. Ensure the mount has a clear rotational swing before initiating.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Start/Stop Tracking Toggle */}
          <button
            type="button"
            onClick={handleToggleTracking}
            disabled={disabled || isTrackingLoading}
            className={`py-2.5 px-4 rounded-lg font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
              isTracking
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            } disabled:opacity-50 disabled:pointer-events-none`}
          >
            {isTracking ? (
              <>
                <Pause className="w-4 h-4 fill-slate-950" />
                {isTrackingLoading ? 'Halting...' : 'Halt SGP4 Tracking'}
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" />
                {isTrackingLoading ? 'Starting...' : 'Engage SGP4 Tracking'}
              </>
            )}
          </button>

          {/* Home Button with Confirmation Dialog */}
          <button
            type="button"
            onClick={() => setIsConfirmHomeOpen(true)}
            disabled={disabled || isHomingLoading}
            className="py-2.5 px-4 rounded-lg font-mono font-bold text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            <HomeIcon className="w-4 h-4 text-amber-400" />
            {isHomingLoading ? 'Homing in progress...' : 'Execute Homing Routine'}
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Homing */}
      <ConfirmModal
        isOpen={isConfirmHomeOpen}
        title="Confirm Axis Homing Routine"
        message="This will immediately drive both the Azimuth and Elevation motors to physical endstop switches to calibrate zero reference points. Please confirm the antenna rotation path is unobstructed."
        confirmLabel="Initiate Homing"
        cancelLabel="Cancel"
        variant="warning"
        details={
          <>
            <div>Axis Target: <strong className="text-white">ALL (Azimuth & Elevation)</strong></div>
            <div>Speed Profile: <strong className="text-white">Slow calibration creep (2.5 deg/s)</strong></div>
            <div>Endstops: <strong className="text-amber-400">Az Home (GPIO 32), El Min (GPIO 33)</strong></div>
          </>
        }
        onConfirm={handleExecuteHome}
        onCancel={() => setIsConfirmHomeOpen(false)}
      />
    </>
  );
}

