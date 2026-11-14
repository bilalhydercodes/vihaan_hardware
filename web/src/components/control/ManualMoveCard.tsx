'use client';

import React, { useState } from 'react';
import { AngleCoordinates } from '@shared/types/tracker';
import { trackerApi } from '@/lib/api';
import { useTracker } from '@/context/TrackerContext';
import { Compass, Radio, Sliders, AlertTriangle, ChevronDown, ChevronUp } from '@/components/ui/icons';
import { ConfirmModal } from './ConfirmModal';

interface ManualMoveCardProps {
  disabled: boolean;
  disabledReason?: string;
  onError: (err: string) => void;
  onSuccess: (msg: string) => void;
}

export function ManualMoveCard({ disabled, disabledReason, onError, onSuccess }: ManualMoveCardProps) {
  const { status, telemetry, refreshStatus } = useTracker();

  const curAz = telemetry?.currentAngles.azimuth ?? status?.currentAngles.azimuth ?? 0;
  const curEl = telemetry?.currentAngles.elevation ?? status?.currentAngles.elevation ?? 0;

  const [isOpen, setIsOpen] = useState(false); // Collapsed by default
  const [targetAz, setTargetAz] = useState<number>(180);
  const [targetEl, setTargetEl] = useState<number>(45);
  const [speed, setSpeed] = useState<number>(3.5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Large Move Confirmation Dialog state (>30°)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const calculateDelta = (az: number, el: number) => {
    const dAz = Math.abs(az - curAz);
    const dEl = Math.abs(el - curEl);
    return Math.sqrt(dAz * dAz + dEl * dEl);
  };

  const handleExecuteMove = async () => {
    setIsSubmitting(true);
    try {
      await trackerApi.move({
        azimuth: targetAz,
        elevation: targetEl,
        speedDegS: speed
      });
      await refreshStatus();
      onSuccess(`Moving antenna to Left/Right: ${targetAz.toFixed(0)}°, Up/Down: ${targetEl.toFixed(0)}°`);
    } catch (err: any) {
      onError(`Could not move motors: ${err.message}. Check your token.`);
    } finally {
      setIsSubmitting(false);
      setIsConfirmOpen(false);
    }
  };

  const onSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    // Validate client-side limits
    if (targetAz < 0 || targetAz > 360) {
      onError('Left/Right direction must be between 0° and 360°');
      return;
    }
    if (targetEl < 0 || targetEl > 90) {
      onError('Up/Down angle must be between 0° and 90°');
      return;
    }
    if (speed <= 0 || speed > 5.0) {
      onError('Speed must be between 0.5°/s and 5.0°/s to avoid motor stall');
      return;
    }

    // Check if move is > 30 degrees
    const delta = calculateDelta(targetAz, targetEl);
    if (delta > 30.0) {
      setIsConfirmOpen(true);
    } else {
      handleExecuteMove();
    }
  };

  const setPreset = (az: number, el: number) => {
    setTargetAz(az);
    setTargetEl(el);
  };

  const currentDelta = calculateDelta(targetAz, targetEl);

  return (
    <>
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden transition-all">
        {/* Collapsible Header */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
              <Sliders className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>Advanced: Manual Aiming</span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">Optional</span>
              </div>
              <div className="text-xs text-slate-400">
                Point the antenna directly to any custom angle yourself.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span>{isOpen ? 'Hide' : 'Show'}</span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {/* Collapsed Body */}
        {isOpen && (
          <div className="p-5 sm:p-6 pt-0 border-t border-slate-800/80 space-y-5">
            {/* Quick Aim Presets */}
            <div className="space-y-2 pt-4">
              <span className="text-xs font-semibold text-slate-300 block">Quick Direction Presets</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Parked (0°, 0°)', az: 0, el: 0 },
                  { label: 'North (0°, 45°)', az: 0, el: 45 },
                  { label: 'East (90°, 45°)', az: 90, el: 45 },
                  { label: 'South (180°, 45°)', az: 180, el: 45 },
                  { label: 'West (270°, 45°)', az: 270, el: 45 },
                  { label: 'Straight Up (90°)', az: curAz, el: 90 },
                ].map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPreset(p.az, p.el)}
                    disabled={disabled}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-medium text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={onSubmitForm} className="space-y-4">
              {/* Left/Right Direction Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-cyan-400" /> Left / Right Direction (0° to 360°)
                  </span>
                  <span className="text-base font-bold text-cyan-300 font-mono">{targetAz}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={targetAz}
                  onChange={(e) => setTargetAz(Number(e.target.value))}
                  disabled={disabled}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-50"
                />
              </div>

              {/* Up/Down Angle Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-emerald-400" /> Up / Down Angle (0° to 90°)
                  </span>
                  <span className="text-base font-bold text-emerald-300 font-mono">{targetEl}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="1"
                  value={targetEl}
                  onChange={(e) => setTargetEl(Number(e.target.value))}
                  disabled={disabled}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-400 disabled:opacity-50"
                />
              </div>

              {/* Speed slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-300">Movement Speed (degrees per second)</span>
                  <span className="text-xs font-mono text-slate-300">{speed} °/s (Max 5.0)</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.5"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  disabled={disabled}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-50"
                />
                <p className="text-[11px] text-slate-500">
                  Keeping speed under 5°/s prevents stepper motors from skipping steps.
                </p>
              </div>

              {/* Large Move Notice */}
              {currentDelta > 30.0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Large turn ({currentDelta.toFixed(0)}°): A confirmation prompt will ask before motors move.</span>
                </div>
              )}

              {/* Submit Move Button */}
              <button
                type="submit"
                disabled={disabled || isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-sm transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                <Compass className="w-4 h-4" />
                <span>{isSubmitting ? 'Sending command...' : `Move to ${targetAz}°, ${targetEl}°`}</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Moves > 30 Degrees */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Confirm Large Antenna Move"
        message={`You are asking the tracker to rotate by ${currentDelta.toFixed(0)}° (Left/Right: ${targetAz}°, Up/Down: ${targetEl}°). Ensure antenna cables are not tangled before moving.`}
        confirmLabel="Yes, Move Antenna"
        variant="warning"
        onConfirm={handleExecuteMove}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
}
