'use client';

import React, { useState } from 'react';
import { trackerApi } from '@/lib/api';
import { useTracker } from '@/context/TrackerContext';
import { webSerial } from '@/lib/serial';
import {
  Compass,
  Radio,
  Sliders,
  AlertTriangle,
  Navigation,
  StopCircle
} from '@/components/ui/icons';
import { ConfirmModal } from './ConfirmModal';

interface ManualMoveCardProps {
  disabled: boolean;
  disabledReason?: string;
  onError: (err: string) => void;
  onSuccess: (msg: string) => void;
}

export function ManualMoveCard({ disabled, disabledReason, onError, onSuccess }: ManualMoveCardProps) {
  const { status, telemetry, refreshStatus, connectionStatus } = useTracker();
  const isConnected = connectionStatus === 'connected';

  const curAz = isConnected
    ? (telemetry?.currentAngles.azimuth ?? status?.currentAngles.azimuth ?? 0)
    : null;
  const curEl = isConnected
    ? (telemetry?.currentAngles.elevation ?? status?.currentAngles.elevation ?? 0)
    : null;

  const [targetAz, setTargetAz] = useState<number>(180);
  const [targetEl, setTargetEl] = useState<number>(45);
  const [speed, setSpeed] = useState<number>(2.5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleExecuteMove = async () => {
    setIsSubmitting(true);
    try {
      await trackerApi.move({
        azimuth: targetAz,
        elevation: targetEl,
        speedDegS: speed
      });
      await refreshStatus();
      onSuccess(`Moving antenna to Azimuth: ${targetAz.toFixed(0)}°, Elevation: ${targetEl.toFixed(0)}°`);
    } catch (err: any) {
      onError(`Could not move motors: ${err.message}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJog = async (cmd: 'AZ_CW' | 'AZ_CCW' | 'EL_CW' | 'EL_CCW' | 'TEST_EL') => {
    setIsSubmitting(true);
    try {
      if (webSerial.isConnected()) {
        await webSerial.sendCommand(cmd);
      } else if (cmd === 'TEST_EL') {
        await trackerApi.jog('ELEVATION', 'CW', 'TEST_EL');
      } else {
        const axis = cmd.startsWith('AZ') ? 'AZIMUTH' : 'ELEVATION';
        const dir = cmd.includes('CCW') ? 'CCW' : 'CW';
        await trackerApi.jog(axis, dir, cmd);
      }
      await refreshStatus();
      onSuccess(`Motor moved (${cmd})!`);
    } catch (err: any) {
      onError(`Could not jog motor: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmergencyStop = async () => {
    try {
      if (webSerial.isConnected()) {
        await webSerial.sendCommand('STOP');
      } else {
        await trackerApi.stop();
      }
      await refreshStatus();
      onSuccess('STOP sent! Motor coils released.');
    } catch (err: any) {
      onError(`Could not stop: ${err.message}`);
    }
  };

  const onSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (targetAz < 0 || targetAz > 360) {
      onError('Azimuth angle must be between 0° and 360°');
      return;
    }
    if (targetEl < 0 || targetEl > 90) {
      onError('Elevation angle must be between 0° and 90°');
      return;
    }
    if (speed <= 0 || speed > 5.0) {
      onError('Speed must be between 0.5°/s and 5.0°/s');
      return;
    }

    handleExecuteMove();
  };

  const adjustAz = (delta: number) => {
    setTargetAz((prev) => Math.min(360, Math.max(0, Math.round(prev + delta))));
  };

  const adjustEl = (delta: number) => {
    setTargetEl((prev) => Math.min(90, Math.max(0, Math.round(prev + delta))));
  };

  return (
    <>
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Manual Controls</h2>
              <p className="text-xs text-slate-500">Test or move your antenna motors manually</p>
            </div>
          </div>

          {/* Current Angles readout */}
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Current Angles</span>
            <span className="text-xs font-mono font-bold text-slate-700">
              {isConnected && curAz !== null && curEl !== null
                ? `Az ${curAz.toFixed(1)}° / El ${curEl.toFixed(1)}°`
                : '— / —'}
            </span>
          </div>
        </div>

        {/* Direct Stepper Jog & Emergency Stop Keypad */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-sky-600" />
              Quick Motor Test Buttons
            </span>
            <span className="text-[11px] text-slate-500 font-mono">128 steps (~11°)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleJog('AZ_CW')}
              disabled={disabled || isSubmitting}
              className="px-3 py-2.5 rounded-xl bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-slate-800 font-bold text-xs transition-all shadow-2xs cursor-pointer flex flex-col items-center gap-1"
            >
              <span className="font-mono text-sky-600 font-extrabold">◀ Turn Left</span>
              <span className="text-[10px] text-slate-500 font-normal">AZ_CW</span>
            </button>

            <button
              type="button"
              onClick={() => handleJog('AZ_CCW')}
              disabled={disabled || isSubmitting}
              className="px-3 py-2.5 rounded-xl bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-slate-800 font-bold text-xs transition-all shadow-2xs cursor-pointer flex flex-col items-center gap-1"
            >
              <span className="font-mono text-sky-600 font-extrabold">Turn Right ▶</span>
              <span className="text-[10px] text-slate-500 font-normal">AZ_CCW</span>
            </button>

            <button
              type="button"
              onClick={() => handleJog('EL_CW')}
              disabled={disabled || isSubmitting}
              className="px-3 py-2.5 rounded-xl bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-slate-800 font-bold text-xs transition-all shadow-2xs cursor-pointer flex flex-col items-center gap-1"
            >
              <span className="font-mono text-emerald-600 font-extrabold">▲ Tilt Up</span>
              <span className="text-[10px] text-slate-500 font-normal">EL_CW</span>
            </button>

            <button
              type="button"
              onClick={() => handleJog('EL_CCW')}
              disabled={disabled || isSubmitting}
              className="px-3 py-2.5 rounded-xl bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-slate-800 font-bold text-xs transition-all shadow-2xs cursor-pointer flex flex-col items-center gap-1"
            >
              <span className="font-mono text-emerald-600 font-extrabold">▼ Tilt Down</span>
              <span className="text-[10px] text-slate-500 font-normal">EL_CCW</span>
            </button>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={handleEmergencyStop}
              className="w-full px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <StopCircle className="w-4 h-4 text-rose-600" />
              <span>🛑 STOP / Release Motors</span>
            </button>
            <button
              type="button"
              onClick={() => handleJog('TEST_EL' as any)}
              disabled={disabled || isSubmitting}
              className="w-full mt-2 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Radio className="w-4 h-4 text-emerald-600" />
              <span>⚡ Test Tilt Sweep (Up & Down)</span>
            </button>
          </div>
        </div>

        <form onSubmit={onSubmitForm} className="space-y-5">
          {/* 1. Azimuth (Pan / Yaw) */}
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-sky-600" />
                Left / Right Direction (Compass: 0° to 360°)
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-sky-600 font-mono px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200">
                  {targetAz}°
                </span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={targetAz}
              onChange={(e) => setTargetAz(Number(e.target.value))}
              disabled={disabled}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500 disabled:opacity-50"
            />

            {/* Steppers & Presets */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
              <div className="flex items-center gap-1">
                {[
                  { label: 'N (0°)', az: 0 },
                  { label: 'E (90°)', az: 90 },
                  { label: 'S (180°)', az: 180 },
                  { label: 'W (270°)', az: 270 }
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setTargetAz(p.az)}
                    disabled={disabled}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                      targetAz === p.az
                        ? 'bg-sky-500 text-white border-sky-500'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Fine nudge */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustAz(-10)}
                  disabled={disabled}
                  className="px-1.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-600"
                >
                  -10°
                </button>
                <button
                  type="button"
                  onClick={() => adjustAz(-1)}
                  disabled={disabled}
                  className="px-1.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-600"
                >
                  -1°
                </button>
                <button
                  type="button"
                  onClick={() => adjustAz(1)}
                  disabled={disabled}
                  className="px-1.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-600"
                >
                  +1°
                </button>
                <button
                  type="button"
                  onClick={() => adjustAz(10)}
                  disabled={disabled}
                  className="px-1.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-600"
                >
                  +10°
                </button>
              </div>
            </div>
          </div>

          {/* 2. Elevation (Tilt / Pitch) */}
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-600" />
                Tilt Up / Down (0° Horizon to 90° Straight Up)
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-emerald-600 font-mono px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                  {targetEl}°
                </span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max="90"
              step="1"
              value={targetEl}
              onChange={(e) => setTargetEl(Number(e.target.value))}
              disabled={disabled}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
            />

            {/* Steppers & Presets */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
              <div className="flex items-center gap-1">
                {[
                  { label: 'Horizon (0°)', el: 0 },
                  { label: '30°', el: 30 },
                  { label: '45°', el: 45 },
                  { label: 'Straight Up (90°)', el: 90 }
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setTargetEl(p.el)}
                    disabled={disabled}
                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                      targetEl === p.el
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Fine nudge */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustEl(-5)}
                  disabled={disabled}
                  className="px-1.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-600"
                >
                  -5°
                </button>
                <button
                  type="button"
                  onClick={() => adjustEl(-1)}
                  disabled={disabled}
                  className="px-1.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-600"
                >
                  -1°
                </button>
                <button
                  type="button"
                  onClick={() => adjustEl(1)}
                  disabled={disabled}
                  className="px-1.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-600"
                >
                  +1°
                </button>
                <button
                  type="button"
                  onClick={() => adjustEl(5)}
                  disabled={disabled}
                  className="px-1.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-600"
                >
                  +5°
                </button>
              </div>
            </div>
          </div>

          {/* Motor Speed summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Motor Speed:</span>
              {[
                { label: 'Slow (1.0°/s)', val: 1.0 },
                { label: 'Normal (2.5°/s)', val: 2.5 },
                { label: 'Fast (4.0°/s)', val: 4.0 }
              ].map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setSpeed(s.val)}
                  disabled={disabled}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border transition-colors ${
                    speed === s.val
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={disabled || isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-sm transition-all shadow-sm shadow-sky-500/20 cursor-pointer disabled:cursor-not-allowed"
          >
            <Navigation className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Moving antenna motors...'
                : `Aim Motors to Azimuth ${targetAz}°, Elevation ${targetEl}°`}
            </span>
          </button>
        </form>
      </div>
    </>
  );
}