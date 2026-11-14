'use client';

import React, { useState } from 'react';
import { AngleCoordinates } from '@shared/types/tracker';
import { trackerApi } from '@/lib/api';
import { useTracker } from '@/context/TrackerContext';
import { Compass, Radio, Sliders, AlertTriangle } from '@/components/ui/icons';
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

  const [targetAz, setTargetAz] = useState<number>(180);
  const [targetEl, setTargetEl] = useState<number>(45);
  const [speed, setSpeed] = useState<number>(3.5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Large Move Confirmation Dialog state
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
      onSuccess(`Commanded slewing to Az: ${targetAz.toFixed(1)}°, El: ${targetEl.toFixed(1)}° at ${speed} deg/s`);
    } catch (err: any) {
      onError(err.message || 'Motor move rejected by tracker');
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
      onError('Azimuth angle out of bounds: must be between 0.0 and 360.0 degrees');
      return;
    }
    if (targetEl < 0 || targetEl > 90) {
      onError('Elevation angle out of bounds: must be between 0.0 and 90.0 degrees');
      return;
    }
    if (speed <= 0 || speed > 5.0) {
      onError('Slewing speed exceeds safe stepper limits (max 5.0 deg/s)');
      return;
    }

    const delta = calculateDelta(targetAz, targetEl);
    if (delta > 30.0) {
      // Require confirmation for moves larger than 30 degrees
      setIsConfirmOpen(true);
    } else {
      handleExecuteMove();
    }
  };

  const setPreset = (az: number, el: number) => {
    setTargetAz(az);
    setTargetEl(el);
  };

  const deltaDeg = calculateDelta(targetAz, targetEl);

  return (
    <>
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">Manual Jog / Angle Command</h3>
              <p className="text-xs text-slate-400">Command mount to fixed topocentric Azimuth & Elevation</p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            Current: {curAz.toFixed(1)}° / {curEl.toFixed(1)}°
          </span>
        </div>

        {/* Quick Angle Presets */}
        <div className="mb-4">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5">Quick Presets</span>
          <div className="flex flex-wrap gap-1.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setPreset(0, 0)}
              disabled={disabled}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded border border-slate-700 transition-colors"
            >
              Park (0°, 0°)
            </button>
            <button
              type="button"
              onClick={() => setPreset(0, 45)}
              disabled={disabled}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded border border-slate-700 transition-colors"
            >
              North (0°, 45°)
            </button>
            <button
              type="button"
              onClick={() => setPreset(90, 45)}
              disabled={disabled}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded border border-slate-700 transition-colors"
            >
              East (90°, 45°)
            </button>
            <button
              type="button"
              onClick={() => setPreset(180, 45)}
              disabled={disabled}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded border border-slate-700 transition-colors"
            >
              South (180°, 45°)
            </button>
            <button
              type="button"
              onClick={() => setPreset(270, 45)}
              disabled={disabled}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded border border-slate-700 transition-colors"
            >
              West (270°, 45°)
            </button>
            <button
              type="button"
              onClick={() => setPreset(curAz, 90)}
              disabled={disabled}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-300 rounded border border-cyan-800 transition-colors"
            >
              Zenith (90° El)
            </button>
          </div>
        </div>

        <form onSubmit={onSubmitForm} className="space-y-4">
          {/* Azimuth Axis Slider & Input */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-cyan-400" />
                Azimuth Angle (0.0° – 360.0°)
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="360"
                  step="0.5"
                  value={targetAz}
                  onChange={(e) => setTargetAz(parseFloat(e.target.value) || 0)}
                  disabled={disabled}
                  className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-cyan-300 text-sm focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-slate-400 font-bold">°</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="0.5"
              value={targetAz}
              onChange={(e) => setTargetAz(parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full accent-cyan-400 cursor-pointer disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0° (North)</span>
              <span>90° (East)</span>
              <span>180° (South)</span>
              <span>270° (West)</span>
              <span>360°</span>
            </div>
          </div>

          {/* Elevation Axis Slider & Input */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-400" />
                Elevation Angle (0.0° – 90.0°)
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="90"
                  step="0.5"
                  value={targetEl}
                  onChange={(e) => setTargetEl(parseFloat(e.target.value) || 0)}
                  disabled={disabled}
                  className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-emerald-300 text-sm focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-slate-400 font-bold">°</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              step="0.5"
              value={targetEl}
              onChange={(e) => setTargetEl(parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full accent-emerald-400 cursor-pointer disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0° (Horizon)</span>
              <span>30°</span>
              <span>60°</span>
              <span>90° (Zenith)</span>
            </div>
          </div>

          {/* Slewing Speed Input */}
          <div className="flex items-center justify-between bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Slewing Speed Limit:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.5"
                max="5.0"
                step="0.5"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value) || 1)}
                disabled={disabled}
                className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-right font-mono text-amber-300 text-xs focus:outline-none"
              />
              <span className="text-slate-400">°/s (Max 5.0°/s)</span>
            </div>
          </div>

          {/* Delta Warning Badge if > 30 deg */}
          {deltaDeg > 30 && (
            <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                Large angular slew detected (<strong className="font-mono text-amber-300">Δ {deltaDeg.toFixed(1)}°</strong>). A confirmation prompt will be required.
              </span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={disabled || isSubmitting}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:pointer-events-none text-slate-950 font-bold font-mono text-xs rounded-lg transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-slate-950" />
              {isSubmitting ? 'Commanding Motor Slew...' : `Move to Az: ${targetAz.toFixed(1)}°, El: ${targetEl.toFixed(1)}°`}
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal for Large Moves */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Confirm Large Angle Movement"
        message="You are commanding a large angular movement exceeding 30 degrees. Verify that the antenna patch cable has sufficient slack and that the rotation path is unobstructed."
        confirmLabel="Execute Move"
        cancelLabel="Abort Move"
        variant="warning"
        details={
          <>
            <div>Current Position: <strong className="text-white">{curAz.toFixed(1)}° Az, {curEl.toFixed(1)}° El</strong></div>
            <div>Commanded Target: <strong className="text-cyan-300">{targetAz.toFixed(1)}° Az, {targetEl.toFixed(1)}° El</strong></div>
            <div>Angular Displacement: <strong className="text-amber-400">{deltaDeg.toFixed(1)}°</strong></div>
            <div>Slewing Speed: <strong className="text-white">{speed} deg/s</strong></div>
          </>
        }
        onConfirm={handleExecuteMove}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
}

