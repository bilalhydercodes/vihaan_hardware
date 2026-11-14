'use client';

import React, { useState } from 'react';
import { TelemetryData, TrackerStatus } from '@shared/types/tracker';
import { useTracker } from '@/context/TrackerContext';
import {
  Compass,
  Activity,
  Clock,
  Radio,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from '@/components/ui/icons';

interface TelemetryGaugesProps {
  telemetry: TelemetryData | null;
  status: TrackerStatus | null;
}

function TelemetryGaugesComponent({ telemetry, status }: TelemetryGaugesProps) {
  const { syncTime } = useTracker();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const curAz = telemetry?.currentAngles.azimuth ?? status?.currentAngles.azimuth ?? 0;
  const curEl = telemetry?.currentAngles.elevation ?? status?.currentAngles.elevation ?? 0;
  const tgtAz = telemetry?.targetAngles.azimuth ?? status?.targetAngles.azimuth ?? 0;
  const tgtEl = telemetry?.targetAngles.elevation ?? status?.targetAngles.elevation ?? 0;
  const errorDeg = telemetry?.trackingErrorDeg ?? 0;

  const pitch = telemetry?.imu.pitch ?? status?.imu.pitch ?? 0;
  const roll = telemetry?.imu.roll ?? status?.imu.roll ?? 0;
  const isLevel = telemetry?.imu.isLevel ?? status?.imu.isLevel ?? true;

  const homed = telemetry?.homed ?? status?.homed ?? false;
  const state = telemetry?.state ?? status?.state ?? 'IDLE';
  const timeSync = status?.timeSync ?? 'SYNCED';

  const handleSyncTime = async () => {
    setIsSyncing(true);
    setSyncMsg(null);
    try {
      const res = await syncTime('NTP_SYNC');
      setSyncMsg(`Synced (${res.driftMs}ms drift)`);
      setTimeout(() => setSyncMsg(null), 3500);
    } catch (e: any) {
      setSyncMsg(e.message || 'Sync failed');
      setTimeout(() => setSyncMsg(null), 3500);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Azimuth Angle Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3 text-xs font-mono">
          <span className="text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-cyan-400" />
            Azimuth Axis (Yaw)
          </span>
          <span className="text-slate-500 text-[11px]">Range: 0.0° – 360.0°</span>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Current Angle</span>
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {curAz.toFixed(2)}°
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Commanded Target</span>
            <span className="text-xl font-bold font-mono text-amber-400">
              {tgtAz.toFixed(2)}°
            </span>
          </div>
        </div>

        {/* Visual Progress Bar (0 to 360 deg) */}
        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
          {/* Target marker indicator */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10"
            style={{ left: `${(tgtAz / 360) * 100}%` }}
            title={`Target: ${tgtAz}°`}
          />
          {/* Current fill */}
          <div
            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${(curAz / 360) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-slate-500">
          <span>0° (North)</span>
          <span>Delta: {(tgtAz - curAz).toFixed(2)}°</span>
          <span>360°</span>
        </div>
      </div>

      {/* 2. Elevation Angle Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3 text-xs font-mono">
          <span className="text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-emerald-400" />
            Elevation Axis (Pitch)
          </span>
          <span className="text-slate-500 text-[11px]">Range: 0.0° – 90.0°</span>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Current Angle</span>
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {curEl.toFixed(2)}°
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Commanded Target</span>
            <span className="text-xl font-bold font-mono text-amber-400">
              {tgtEl.toFixed(2)}°
            </span>
          </div>
        </div>

        {/* Visual Progress Bar (0 to 90 deg) */}
        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
          <div
            className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10"
            style={{ left: `${(tgtEl / 90) * 100}%` }}
            title={`Target: ${tgtEl}°`}
          />
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${(curEl / 90) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-slate-500">
          <span>0° (Horizon)</span>
          <span>Delta: {(tgtEl - curEl).toFixed(2)}°</span>
          <span>90° (Zenith)</span>
        </div>
      </div>

      {/* 3. Pointing Error & State */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-cyan-400" />
            Pointing Error & State
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              state === 'TRACKING'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : state === 'SLEWING'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : state === 'HOMING'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {state}
          </span>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div>
            <div className="text-3xl font-extrabold font-mono text-emerald-400">
              {errorDeg.toFixed(2)}°
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">
              Angular Boresight Separation
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-xs font-mono">
              Homed:{' '}
              <span className={`font-bold ${homed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {homed ? 'READY' : 'UN-HOMED'}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              Tolerance:{' '}
              <span className={errorDeg < 1.0 ? 'text-emerald-300' : errorDeg < 3.0 ? 'text-cyan-300' : 'text-amber-300'}>
                {errorDeg < 1.0 ? 'Nominal (<1°)' : errorDeg < 3.0 ? 'Acceptable (<3°)' : 'Aligning'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. IMU Attitude & Spirit Level (MPU-6050) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2 text-xs font-mono text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            MPU-6050 Level Sensor
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              isLevel
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {isLevel ? 'LEVEL OK' : 'TILT DETECTED'}
          </span>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="space-y-1 font-mono text-xs">
            <div>
              <span className="text-slate-400">Pitch:</span>{' '}
              <strong className="text-white">{pitch > 0 ? `+${pitch.toFixed(2)}` : pitch.toFixed(2)}°</strong>
            </div>
            <div>
              <span className="text-slate-400">Roll:</span>{' '}
              <strong className="text-white">{roll > 0 ? `+${roll.toFixed(2)}` : roll.toFixed(2)}°</strong>
            </div>
            <div className="text-[10px] text-slate-500">Static calibration threshold: ±2.0°</div>
          </div>

          {/* 2D Spirit Level Circle */}
          <div className="relative w-16 h-16 rounded-full border-2 border-slate-700 bg-slate-950 flex items-center justify-center overflow-hidden">
            <div className="absolute w-8 h-8 rounded-full border border-slate-800 pointer-events-none" />
            <div className="absolute w-full h-[1px] bg-slate-800 pointer-events-none" />
            <div className="absolute h-full w-[1px] bg-slate-800 pointer-events-none" />
            {/* Bubble */}
            <div
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 shadow-md ${
                isLevel ? 'bg-emerald-400 shadow-emerald-500/50' : 'bg-amber-400 shadow-amber-500/50'
              }`}
              style={{
                transform: `translate(${Math.max(-20, Math.min(20, roll * 5))}px, ${Math.max(-20, Math.min(20, pitch * 5))}px)`
              }}
              title={`Pitch: ${pitch}°, Roll: ${roll}°`}
            />
          </div>
        </div>
      </div>

      {/* 5. Time Sync & NTP Status Card */}
      <div className="md:col-span-2 bg-slate-900/40 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              Tracker Time Synchronization
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  timeSync === 'SYNCED'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : timeSync === 'MANUAL'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {timeSync}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Accurate time is essential for SGP4 orbital calculation without an onboard RTC.
              {status?.lastTimeSync && (
                <span className="ml-1 text-slate-400 font-mono">
                  (Last sync: {new Date(status.lastTimeSync).toLocaleTimeString()})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {syncMsg && (
            <span className="text-xs font-mono text-cyan-300 animate-fadeIn">
              {syncMsg}
            </span>
          )}
          <button
            onClick={handleSyncTime}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-mono font-medium text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Time (NTP)'}
          </button>
        </div>
      </div>
    </div>
  );
}

export const TelemetryGauges = React.memo(TelemetryGaugesComponent);

