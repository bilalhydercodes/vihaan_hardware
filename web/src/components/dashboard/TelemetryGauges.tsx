'use client';

import React, { useState } from 'react';
import { TelemetryData, TrackerStatus } from '@shared/types/tracker';
import { useTracker } from '@/context/TrackerContext';
import {
  Compass,
  Radio,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Activity,
  Satellite
} from '@/components/ui/icons';

interface TelemetryGaugesProps {
  telemetry: TelemetryData | null;
  status: TrackerStatus | null;
}

function TelemetryGaugesComponent({ telemetry, status }: TelemetryGaugesProps) {
  const { syncTime } = useTracker();
  const [showDetails, setShowDetails] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const curAz = telemetry?.currentAngles.azimuth ?? status?.currentAngles.azimuth ?? 0;
  const curEl = telemetry?.currentAngles.elevation ?? status?.currentAngles.elevation ?? 0;
  const tgtAz = telemetry?.targetAngles.azimuth ?? status?.targetAngles.azimuth ?? 0;
  const tgtEl = telemetry?.targetAngles.elevation ?? status?.targetAngles.elevation ?? 0;
  const errorDeg = telemetry?.trackingErrorDeg ?? 0;

  const satPos = telemetry?.satellitePosition ?? status?.satellitePosition;
  const isHardwareConnected = status?.hardwareConnected ?? false;

  const pitch = telemetry?.imu.pitch ?? status?.imu.pitch ?? 0;
  const roll = telemetry?.imu.roll ?? status?.imu.roll ?? 0;
  const isLevel = telemetry?.imu.isLevel ?? status?.imu.isLevel ?? true;

  const timeSync = status?.timeSync ?? 'SYNCED';

  const handleSyncTime = async () => {
    setIsSyncing(true);
    setSyncMsg(null);
    try {
      const res = await syncTime('NTP_SYNC');
      setSyncMsg('Clock updated successfully');
      setTimeout(() => setSyncMsg(null), 3500);
    } catch (e: any) {
      setSyncMsg(e.message || 'Clock update failed');
      setTimeout(() => setSyncMsg(null), 3500);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 2 Main Angle Cards (Left/Right & Up/Down) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Left/Right Direction (Azimuth) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white font-bold text-base flex items-center gap-2">
              <Compass className="w-5 h-5 text-cyan-400" />
              Left / Right Direction
            </span>
            <span className="text-xs text-slate-400">0° to 360°</span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-xs text-slate-400 block">Current Direction</span>
              <span className="text-3xl font-extrabold text-white">
                {curAz.toFixed(0)}°
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Target Direction</span>
              <span className="text-2xl font-bold text-amber-400">
                {tgtAz.toFixed(0)}°
              </span>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
            <div
              className="absolute top-0 bottom-0 w-1.5 bg-amber-400 z-10 rounded-full"
              style={{ left: `${Math.min(100, Math.max(0, (tgtAz / 360) * 100))}%` }}
              title={`Target: ${tgtAz.toFixed(0)}°`}
            />
            <div
              className="h-full bg-cyan-500 rounded-full transition-[width] duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, (curAz / 360) * 100))}%` }}
            />
          </div>

          <p className="text-xs text-slate-400 pt-1">
            0° is North &bull; 90° East &bull; 180° South &bull; 270° West
          </p>
        </div>

        {/* 2. Up/Down Angle (Elevation) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-white font-bold text-base flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-400" />
              Up / Down Angle
            </span>
            <span className="text-xs text-slate-400">0° to 90°</span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-xs text-slate-400 block">Current Angle</span>
              <span className="text-3xl font-extrabold text-white">
                {curEl.toFixed(0)}°
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Target Angle</span>
              <span className="text-2xl font-bold text-amber-400">
                {tgtEl.toFixed(0)}°
              </span>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
            <div
              className="absolute top-0 bottom-0 w-1.5 bg-amber-400 z-10 rounded-full"
              style={{ left: `${Math.min(100, Math.max(0, (tgtEl / 90) * 100))}%` }}
              title={`Target: ${tgtEl.toFixed(0)}°`}
            />
            <div
              className="h-full bg-emerald-500 rounded-full transition-[width] duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, (curEl / 90) * 100))}%` }}
            />
          </div>

          <p className="text-xs text-slate-400 pt-1">
            0° is flat on horizon &bull; Minimum mask is 10° &bull; 90° is straight up
          </p>
        </div>
      </div>

      {/* Satellite Position Card (Latitude, Longitude, Altitude km from SGP4) */}
      {satPos && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Satellite className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-white">Sub-Satellite Position:</span>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-400 block text-[11px]">Latitude</span>
              <span className="font-bold text-white text-sm">
                {Math.abs(satPos.latitude).toFixed(2)}° {satPos.latitude >= 0 ? 'N' : 'S'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Longitude</span>
              <span className="font-bold text-white text-sm">
                {Math.abs(satPos.longitude).toFixed(2)}° {satPos.longitude >= 0 ? 'E' : 'W'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Altitude</span>
              <span className="font-bold text-cyan-300 text-sm">
                {Math.round(satPos.altitudeKm)} km
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Show Details Toggle Button */}
      <div className="flex items-center justify-center pt-1">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
        >
          {showDetails ? (
            <>
              <span>Hide extra details</span>
              <ChevronUp className="w-4 h-4 text-slate-400" />
            </>
          ) : (
            <>
              <span>Show extra details (stand level, clock, accuracy, hardware)</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </>
          )}
        </button>
      </div>

      {/* Collapsed Details Section */}
      {showDetails && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Is the stand level? */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1.5">
            <div className="text-xs font-semibold text-slate-400">Is the stand level?</div>
            <div className="flex items-center gap-2 pt-0.5">
              {isLevel ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white">Yes, stand is level</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-amber-300">Slightly tilted</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Internal sensor measures tilt ({Math.abs(pitch).toFixed(1)}°).
            </p>
          </div>

          {/* Aim accuracy */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-1.5">
            <div className="text-xs font-semibold text-slate-400">How far off the aim is</div>
            <div className="flex items-center gap-2 pt-0.5">
              <span className={`text-base font-bold ${errorDeg <= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {errorDeg <= 1 ? 'Aim is directly on target' : `Off by ${errorDeg.toFixed(1)}°`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Antenna beam covers up to 10°, so small differences do not hurt reception.
            </p>
          </div>

          {/* Internal clock */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Internal Clock</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {timeSync === 'SYNCED' ? 'On Time' : timeSync}
              </span>
            </div>
            <button
              onClick={handleSyncTime}
              disabled={isSyncing}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Updating clock...' : 'Update clock'}</span>
            </button>
            {syncMsg && <div className="text-[11px] text-cyan-300 text-center">{syncMsg}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export const TelemetryGauges = React.memo(TelemetryGaugesComponent);
