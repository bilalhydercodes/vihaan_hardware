'use client';

import React from 'react';
import { useTracker } from '@/context/TrackerContext';
import { PolarSkyPlot } from '@/components/dashboard/PolarSkyPlot';
import { TelemetryGauges } from '@/components/dashboard/TelemetryGauges';
import { NextPassCard } from '@/components/dashboard/NextPassCard';
import {
  Compass,
  Satellite,
  Radio,
  CheckCircle,
  AlertTriangle,
  Clock,
  Activity
} from '@/components/ui/icons';

export default function DashboardPage() {
  const { telemetry, status, connectionStatus } = useTracker();

  const currentAngles = telemetry?.currentAngles || status?.currentAngles || { azimuth: 120.0, elevation: 45.0 };
  const targetAngles = telemetry?.targetAngles || status?.targetAngles || { azimuth: 120.0, elevation: 45.0 };
  const satName = status?.satelliteName || telemetry?.satelliteName || 'NavIC-1B';
  const state = telemetry?.state || status?.state || 'IDLE';

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Compass className="w-6 h-6 text-cyan-400" />
              Live Telemetry & Tracking Dashboard
            </h1>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                state === 'TRACKING'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                  : state === 'SLEWING'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {state}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time dual-axis antenna look angles, polar sky-plot projection, and SGP4 trajectory error
          </p>
        </div>

        {/* Quick Uptime & Health */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <span className="text-slate-500">UPTIME: </span>
            <strong className="text-white">
              {status ? `${Math.floor(status.uptimeSeconds / 60)}m ${status.uptimeSeconds % 60}s` : '--'}
            </strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <span className="text-slate-500">FW: </span>
            <strong className="text-cyan-400">{status?.firmwareVersion || '1.0.0'}</strong>
          </div>
        </div>
      </div>

      {/* Main Top Row: Polar Sky Plot & Next Pass Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Polar Sky Plot (7 cols) */}
        <div className="lg:col-span-7">
          <PolarSkyPlot
            current={currentAngles}
            target={targetAngles}
            satelliteName={satName}
            state={state}
          />
        </div>

        {/* Satellite & Pass Info (5 cols) */}
        <div className="lg:col-span-5">
          <NextPassCard />
        </div>
      </div>

      {/* Numerical Gauges & Sensor Status */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Axis Angles & Environmental Telemetry
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Rate-limited at ~1 Hz from ESP32
          </span>
        </div>

        <TelemetryGauges telemetry={telemetry} status={status} />
      </div>
    </div>
  );
}

