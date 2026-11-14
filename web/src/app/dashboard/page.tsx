'use client';

import React from 'react';
import { useTracker } from '@/context/TrackerContext';
import { PolarSkyPlot } from '@/components/dashboard/PolarSkyPlot';
import { TelemetryGauges } from '@/components/dashboard/TelemetryGauges';
import { NextPassCard } from '@/components/dashboard/NextPassCard';
import {
  Compass,
  CheckCircle,
  AlertTriangle,
  Wifi,
  WifiOff
} from '@/components/ui/icons';

export default function DashboardPage() {
  const { telemetry, status, connectionStatus } = useTracker();

  const currentAngles = telemetry?.currentAngles || status?.currentAngles || { azimuth: 120.0, elevation: 45.0 };
  const targetAngles = telemetry?.targetAngles || status?.targetAngles || { azimuth: 120.0, elevation: 45.0 };
  const satName = status?.satelliteName || telemetry?.satelliteName || 'NavIC Satellite';
  const state = telemetry?.state || status?.state || 'IDLE';

  const isConnected = connectionStatus === 'connected';
  const isTracking = state === 'TRACKING';
  const isMoving = state === 'SLEWING';
  const isVisible = telemetry?.isVisible ?? status?.isVisible ?? false;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Friendly Status Sentence Banner */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        !isConnected
          ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          : isTracking && isVisible
          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
          : isTracking && !isVisible
          ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
          : isMoving
          ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200'
          : 'bg-slate-900 border-slate-800 text-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {!isConnected ? (
              <WifiOff className="w-6 h-6 text-rose-400 shrink-0" />
            ) : isTracking && isVisible ? (
              <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : isTracking && !isVisible ? (
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
            ) : isMoving ? (
              <Compass className="w-6 h-6 text-cyan-400 animate-spin shrink-0" />
            ) : (
              <Compass className="w-6 h-6 text-slate-400 shrink-0" />
            )}
            <div>
              <div className="text-lg sm:text-xl font-bold">
                {!isConnected
                  ? 'Not connected. Check that the tracker is switched on.'
                  : isTracking && isVisible
                  ? `Tracking ${satName}. Aim is good & satellite is in sky.`
                  : isTracking && !isVisible
                  ? `Following ${satName}. Satellite is currently below horizon (elevation < 10°).`
                  : isMoving
                  ? `Adjusting position to aim at ${satName}...`
                  : 'Tracker is ready. Press Start Tracking to follow a satellite.'}
              </div>
              <div className="text-xs sm:text-sm text-slate-300">
                {!isConnected
                  ? 'Make sure your computer or phone is on the same local network as the tracker.'
                  : isTracking && isVisible
                  ? 'The antenna is actively moving with the satellite in real time.'
                  : isTracking && !isVisible
                  ? 'The rotator is waiting at the horizon, and will automatically track when the satellite rises.'
                  : 'You can change the target satellite anytime from the control page.'}
              </div>
            </div>
          </div>

          <div className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-slate-950/60 border border-slate-800">
            {isConnected ? 'Status: Online' : 'Status: Offline'}
          </div>
        </div>
      </div>

      {/* Main Row: Simple Sky Map + Target Satellite Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sky Map (7 cols) */}
        <div className="lg:col-span-7">
          <PolarSkyPlot
            current={currentAngles}
            target={targetAngles}
            satelliteName={satName}
            state={state}
            isVisible={isVisible}
          />
        </div>

        {/* Target & Tracking Card (5 cols) */}
        <div className="lg:col-span-5">
          <NextPassCard />
        </div>
      </div>

      {/* Numerical Direction Angles & Collapsed Details */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Compass className="w-5 h-5 text-cyan-400" />
          Where the Antenna is Pointing
        </h2>
        <TelemetryGauges telemetry={telemetry} status={status} />
      </div>
    </div>
  );
}
