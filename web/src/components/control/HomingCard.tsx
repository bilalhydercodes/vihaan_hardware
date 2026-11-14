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
      onSuccess(res.message || 'Position reset started! The mount is moving to its starting limit stops.');
    } catch (err: any) {
      onError(`Could not reset position: ${err.message}. Check your token.`);
    } finally {
      setIsHomingLoading(false);
      setIsConfirmHomeOpen(false);
    }
  };

  const handleStartTracking = async () => {
    setIsTrackingLoading(true);
    try {
      await trackerApi.setTracking('START');
      await refreshStatus();
      onSuccess('Started tracking satellite!');
    } catch (err: any) {
      onError(`Could not start tracking: ${err.message}`);
    } finally {
      setIsTrackingLoading(false);
    }
  };

  const handleStopTracking = async () => {
    setIsTrackingLoading(true);
    try {
      await trackerApi.setTracking('STOP');
      await refreshStatus();
      onSuccess('Stopped tracking. Antenna is holding its current position.');
    } catch (err: any) {
      onError(`Could not stop tracking: ${err.message}`);
    } finally {
      setIsTrackingLoading(false);
    }
  };

  return (
    <>
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white">Main Tracker Controls</h2>
          <p className="text-xs text-slate-300">Start tracking, stop motors, or reset the antenna back to its home angle.</p>
        </div>

        {/* Big Action Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. Start / Stop Button */}
          {isTracking ? (
            <button
              onClick={handleStopTracking}
              disabled={disabled || isTrackingLoading}
              className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-base shadow-lg transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <Pause className="w-5 h-5 fill-slate-950" />
              <span>{isTrackingLoading ? 'Stopping...' : 'Stop Tracking'}</span>
            </button>
          ) : (
            <button
              onClick={handleStartTracking}
              disabled={disabled || isTrackingLoading}
              className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-base shadow-lg transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>{isTrackingLoading ? 'Starting...' : 'Start Tracking'}</span>
            </button>
          )}

          {/* 2. Reset Position Button */}
          <button
            onClick={() => setIsConfirmHomeOpen(true)}
            disabled={disabled || isHomingLoading}
            className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white font-bold text-base border border-slate-700 shadow-md transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <HomeIcon className="w-5 h-5 text-amber-400" />
            <span>{isHomingLoading ? 'Resetting...' : 'Reset Position'}</span>
          </button>
        </div>

        {/* Status info line */}
        <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2">
            {isHomed ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Starting angles are calibrated and ready.</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Starting angles not set yet. Press Reset Position.</span>
              </>
            )}
          </div>
          <span className="text-slate-400 hidden sm:inline">
            Status: <strong className="text-white">{status?.state === 'SLEWING' ? 'Moving' : status?.state === 'HOMING' ? 'Resetting' : status?.state || 'Ready'}</strong>
          </span>
        </div>
      </div>

      {/* Confirmation Dialog for Reset Position */}
      <ConfirmModal
        isOpen={isConfirmHomeOpen}
        title="Reset Antenna Position?"
        message="This will slowly move both motors until they touch the physical limit switches to recalibrate 0° starting angles. The antenna cannot be aimed while resetting."
        confirmLabel="Yes, Reset Position"
        variant="danger"
        onConfirm={handleExecuteHome}
        onCancel={() => setIsConfirmHomeOpen(false)}
      />
    </>
  );
}
