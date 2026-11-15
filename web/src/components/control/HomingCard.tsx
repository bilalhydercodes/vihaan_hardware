'use client';

import React, { useState } from 'react';
import { trackerApi } from '@/lib/api';
import { useTracker } from '@/context/TrackerContext';
import {
  HomeIcon,
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Radio,
  Navigation,
  Satellite,
  Compass,
  Target,
  StopCircle,
  Sparkles,
  Activity
} from '@/components/ui/icons';
import { ConfirmModal } from './ConfirmModal';

interface HomingCardProps {
  disabled: boolean;
  disabledReason?: string;
  onError: (err: string) => void;
  onSuccess: (msg: string) => void;
}

function getCardinal(az: number): string {
  const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.floor((((az % 360) + 360) % 360) / 22.5 + 0.5) % 16;
  return arr[idx];
}

function formatCountdown(isoString?: string): string {
  if (!isoString) return '—';
  const diffMs = new Date(isoString).getTime() - Date.now();
  if (diffMs <= 0) return 'In Progress';
  const totalMins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs > 0) return `in ${hrs}h ${mins}m`;
  return `in ${mins}m`;
}

function formatPassTime(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC';
  } catch {
    return '—';
  }
}

export function HomingCard({ disabled, disabledReason, onError, onSuccess }: HomingCardProps) {
  const { status, telemetry, refreshStatus, connectionStatus } = useTracker();
  const [isConfirmHomeOpen, setIsConfirmHomeOpen] = useState(false);
  const [isHomingLoading, setIsHomingLoading] = useState(false);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [isSimLoading, setIsSimLoading] = useState(false);
  const [isStopLoading, setIsStopLoading] = useState(false);

  const isConnected = connectionStatus === 'connected';
  const isAutoTracking = status?.autoTrackingEnabled || status?.state === 'TRACKING';
  const isSimulation = status?.simulationActive || false;
  const isHomed = status?.homed;

  const targetAz = status?.targetAngles?.azimuth ?? telemetry?.targetAngles?.azimuth ?? 0;
  const targetEl = status?.targetAngles?.elevation ?? telemetry?.targetAngles?.elevation ?? 0;
  const currentAz = status?.currentAngles?.azimuth ?? telemetry?.currentAngles?.azimuth ?? 0;
  const currentEl = status?.currentAngles?.elevation ?? telemetry?.currentAngles?.elevation ?? 0;

  const trackingError = status?.trackingErrorDeg ?? Math.hypot(targetAz - currentAz, targetEl - currentEl);
  const isVisible = status?.isVisible ?? false;
  const nextPass = status?.nextPass;
  const pointingState = status?.antennaPointing || (isAutoTracking ? (trackingError <= 2.5 ? 'ON TARGET' : 'SLEWING') : 'IDLE');

  // Start / Stop Auto-Tracking
  const handleToggleTracking = async () => {
    setIsTrackingLoading(true);
    try {
      const action = isAutoTracking ? 'STOP' : 'START';
      await trackerApi.setTracking(action);
      await refreshStatus();
      if (action === 'START') {
        onSuccess('Auto-tracking METEOR-M2-4 active! Target angles are being sent to physical motors.');
      } else {
        onSuccess('Auto-tracking paused. Antenna holding current position.');
      }
    } catch (err: any) {
      onError(`Auto-tracking error: ${err.message}`);
    } finally {
      setIsTrackingLoading(false);
    }
  };

  // Start / Stop Hardware Pass Simulation (45-second test sweep)
  const handleToggleSimulation = async () => {
    setIsSimLoading(true);
    try {
      if (isSimulation) {
        await trackerApi.stopSimulation();
        await refreshStatus();
        onSuccess('Pass simulation stopped. Motors halted.');
      } else {
        await trackerApi.startSimulation();
        await refreshStatus();
        onSuccess('⚡ 45-Second Hardware Pass Simulation Started! Watch your physical antenna rotate and tilt.');
      }
    } catch (err: any) {
      onError(`Simulation error: ${err.message}`);
    } finally {
      setIsSimLoading(false);
    }
  };

  // Center / Home Motors
  const handleExecuteHome = async () => {
    setIsHomingLoading(true);
    try {
      const res = await trackerApi.home('ALL');
      await refreshStatus();
      onSuccess(res.message || 'Antenna motors reset to 0° Azimuth (North) and 0° Elevation.');
    } catch (err: any) {
      onError(`Could not reset position: ${err.message}`);
    } finally {
      setIsHomingLoading(false);
      setIsConfirmHomeOpen(false);
    }
  };

  // Emergency Stop
  const handleEmergencyStop = async () => {
    setIsStopLoading(true);
    try {
      await trackerApi.stop();
      await refreshStatus();
      onSuccess('🛑 Emergency Stop triggered! All motor motion halted immediately.');
    } catch (err: any) {
      onError(`Emergency Stop error: ${err.message}`);
    } finally {
      setIsStopLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
        {/* 1. Header with Active Tracking State Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-600">
              <Satellite className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">METEOR-M2-4 Real-Time Tracker</h2>
                <span className="text-[10px] font-mono font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                  NORAD 59051
                </span>
              </div>
              <p className="text-xs text-slate-500">Autonomous SGP4 look-angles & physical antenna rotator aiming</p>
            </div>
          </div>

          {/* Operational State Pill */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isSimulation
                    ? 'bg-purple-500 animate-ping'
                    : isAutoTracking
                    ? 'bg-emerald-500 animate-pulse'
                    : status?.state === 'SLEWING'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-slate-400'
                }`}
              />
              <span className="font-bold">
                {isSimulation
                  ? '⚡ Pass Simulating'
                  : isAutoTracking
                  ? '🎯 Auto-Tracking'
                  : status?.state === 'SLEWING'
                  ? '🔄 Slewing'
                  : '⚪ Standby'}
              </span>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              <span>{isConnected ? 'ESP32 Online' : 'Hardware Ready'}</span>
            </div>
          </div>
        </div>

        {/* 2. Target SGP4 Coordinates vs Actual Antenna Motor Angles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* SGP4 Predicted Astronomical Look Angles */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-sky-50/70 to-blue-50/40 border border-sky-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                <Target className="w-4 h-4 text-sky-600" />
                <span>Target Look Angles (SGP4)</span>
              </div>
              <span className="text-[10px] font-semibold text-sky-600 bg-sky-100/70 px-2 py-0.5 rounded-md">
                DTU Station
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-lg border border-sky-100 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Target Azimuth</span>
                <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
                  {targetAz.toFixed(1)}°
                  <span className="text-xs text-sky-600 ml-1 font-sans font-bold">({getCardinal(targetAz)})</span>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-lg border border-sky-100 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Target Elevation</span>
                <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
                  {targetEl.toFixed(1)}°
                  <span className="text-xs text-slate-500 ml-1 font-sans font-medium">{targetEl >= 10 ? 'Visible' : 'Masked'}</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-sky-700/80 mt-2">
              Ground Station: Lat 28.6139° N, Lon 77.2090° E • 10° Cutoff Mask
            </p>
          </div>

          {/* Actual Physical Rotator Angles */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/70 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Navigation className="w-4 h-4 text-slate-700" />
                <span>Actual Antenna Position</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  pointingState === 'ON TARGET'
                    ? 'bg-emerald-100 text-emerald-800'
                    : pointingState === 'SLEWING'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {pointingState}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Motor Azimuth</span>
                <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
                  {currentAz.toFixed(1)}°
                  <span className="text-xs text-slate-500 ml-1 font-sans font-medium">({getCardinal(currentAz)})</span>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Motor Elevation</span>
                <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
                  {currentEl.toFixed(1)}°
                  <span className="text-xs text-slate-500 ml-1 font-sans font-medium">
                    {isHomed ? '0° Calibrated' : 'Uncalibrated'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-600 mt-2">
              <span>Pointing Error: <strong className="font-mono text-slate-900">{trackingError.toFixed(1)}°</strong></span>
              <span>Deadband: <strong className="text-slate-900">±1.5°</strong></span>
            </div>
          </div>
        </div>

        {/* 3. METEOR-M2-4 Real-Time Orbital Telemetry & RF Parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Sub-Satellite Point</span>
            <div className="font-mono font-bold text-slate-800 mt-0.5 truncate">
              {status?.satellitePosition
                ? `${status.satellitePosition.latitude.toFixed(1)}°, ${status.satellitePosition.longitude.toFixed(1)}°`
                : 'Propagating...'}
            </div>
            <span className="text-[10px] text-slate-500">
              Alt: {status?.satellitePosition?.altitudeKm ? `${Math.round(status.satellitePosition.altitudeKm)} km` : '846 km'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Slant Range</span>
            <div className="font-mono font-bold text-slate-800 mt-0.5">
              {status?.slantRangeKm ? `${Math.round(status.slantRangeKm).toLocaleString()} km` : '—'}
            </div>
            <span className="text-[10px] text-slate-500">
              Rate: {status?.rangeRateKmS ? `${status.rangeRateKmS > 0 ? '+' : ''}${status.rangeRateKmS.toFixed(2)} km/s` : '—'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Doppler Shift</span>
            <div className="font-mono font-bold text-slate-800 mt-0.5">
              {status?.dopplerShiftHz ? `${status.dopplerShiftHz > 0 ? '+' : ''}${status.dopplerShiftHz} Hz` : '0 Hz'}
            </div>
            <span className="text-[10px] text-slate-500">Freq: 137.100 MHz</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">TLE Freshness</span>
            <div className="font-mono font-bold text-emerald-700 mt-0.5 truncate">
              {status?.tleAgeHours !== undefined ? `${status.tleAgeHours.toFixed(1)}h ago` : 'Real-time'}
            </div>
            <span className="text-[10px] text-slate-500">Source: CelesTrak SGP4</span>
          </div>
        </div>

        {/* 4. Next Pass Schedule & Local Visibility */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full shrink-0 ${isVisible ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`} />
            <div>
              <span className="font-bold text-slate-900 block">
                {isVisible ? '🟢 METEOR-M2-4 Is Above Local Horizon (> 10°)' : '⚪ Satellite Below Horizon — Scheduled Pass Ready'}
              </span>
              <span className="text-slate-500 text-[11px]">
                {nextPass
                  ? `Next AOS: ${formatPassTime(nextPass.aos)} (${formatCountdown(nextPass.aos)}) • Max Elevation: ${nextPass.maxElevation.toFixed(1)}° • Trajectory: Az ${nextPass.aosAzimuth.toFixed(0)}° → ${nextPass.losAzimuth.toFixed(0)}°`
                  : 'Calculating next METEOR-M2-4 pass over Delhi...'}
              </span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Station Horizon</span>
            <span className="text-xs font-bold text-slate-800">10.0° Mask Limit</span>
          </div>
        </div>

        {/* 5. RF Signal Reception vs Orbital Geometry (Section 5 Requirement) */}
        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/90 text-xs text-amber-900 flex items-start gap-3">
          <Radio className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <strong className="font-bold text-amber-950">RF Signal Demodulation:</strong>
              <span className="font-mono text-[11px] bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded font-semibold">
                ⚠️ Awaiting RTL-SDR Receiver Stream (137.100 MHz LRPT)
              </span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Orbital propagation confirms geometric visibility and antenna pointing angles. Actual satellite signal reception and SNR measurements require an active RTL-SDR / receiver feed. Orbital geometry alone does not confirm signal lock.
            </p>
          </div>
        </div>

        {/* 6. Hardware Action Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          {/* Follow METEOR-M2-4 Button */}
          {isAutoTracking ? (
            <button
              type="button"
              onClick={handleToggleTracking}
              disabled={disabled || isTrackingLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs shadow-sm shadow-amber-500/20 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <Pause className="w-4 h-4 fill-white" />
              <span>{isTrackingLoading ? 'Stopping...' : 'Pause Auto-Tracking'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleToggleTracking}
              disabled={disabled || isTrackingLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isTrackingLoading ? 'Starting...' : '▶ Follow METEOR-M2-4'}</span>
            </button>
          )}

          {/* Test 45-Second Hardware Pass Simulation Button */}
          {isSimulation ? (
            <button
              type="button"
              onClick={handleToggleSimulation}
              disabled={disabled || isSimLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs shadow-sm shadow-purple-600/20 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <StopCircle className="w-4 h-4" />
              <span>{isSimLoading ? 'Halting...' : '⏹ Stop Simulation'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleToggleSimulation}
              disabled={disabled || isSimLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs shadow-sm shadow-indigo-600/20 transition-all cursor-pointer disabled:cursor-not-allowed"
              title="Runs a 45-second simulated satellite flyover on your physical motors to demonstrate real-time dynamic antenna tracking"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSimLoading ? 'Starting...' : '⚡ Test Pass on Hardware'}</span>
            </button>
          )}

          {/* Center / Home Motors */}
          <button
            type="button"
            onClick={handleExecuteHome}
            disabled={disabled || isHomingLoading}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 text-slate-800 font-bold text-xs border border-slate-200 shadow-2xs transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <HomeIcon className="w-4 h-4 text-amber-500" />
            <span>{isHomingLoading ? 'Resetting...' : '🔄 Reset to 0° (Center)'}</span>
          </button>

          {/* Emergency Stop */}
          <button
            type="button"
            onClick={handleEmergencyStop}
            disabled={disabled || isStopLoading}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 text-rose-700 font-bold text-xs shadow-2xs transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <StopCircle className="w-4 h-4 text-rose-600" />
            <span>{isStopLoading ? 'Stopping...' : '🛑 Emergency Stop'}</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500 text-center">
          Mechanical limits enforced: Azimuth 0°–360°, Elevation 0°–90°. Auto-tracking moves motors when METEOR-M2-4 exceeds 10° elevation mask.
        </p>
      </div>

      {/* Confirmation Dialog for Reset Position */}
      <ConfirmModal
        isOpen={isConfirmHomeOpen}
        title="Recalibrate Limit Switches?"
        message="This will slowly move both azimuth and elevation axes until they hit physical limit switches to re-synchronize 0° home coordinates. The tracker will pause any active tracking."
        confirmLabel="Yes, Calibrate Home"
        variant="warning"
        onConfirm={handleExecuteHome}
        onCancel={() => setIsConfirmHomeOpen(false)}
      />
    </>
  );
}
