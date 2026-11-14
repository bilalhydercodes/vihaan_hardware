'use client';

import React from 'react';
import Link from 'next/link';
import { useTracker } from '@/context/TrackerContext';
import {
  Compass,
  Radio,
  ChevronRight,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertTriangle
} from '@/components/ui/icons';

export default function HomePage() {
  const { status, telemetry, connectionStatus } = useTracker();

  const isConnected = connectionStatus === 'connected';
  const isTracking = (telemetry?.state || status?.state) === 'TRACKING';
  const isMoving = (telemetry?.state || status?.state) === 'SLEWING';
  const satName = status?.satelliteName || telemetry?.satelliteName || 'NavIC satellite';

  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-16 space-y-8">
      {/* Header & One-line description */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          NAVIC<span className="text-sky-500">-TRACK</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-600 max-w-xl mx-auto leading-relaxed">
          An automated motorized mount that aims your antenna directly at navigation satellites for clear signal reception.
        </p>
      </div>

      {/* Big Friendly Status Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Status</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-2.5">
              {!isConnected ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-500 shrink-0" />
                  <span>Not Connected</span>
                </>
              ) : isTracking ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Tracking {satName}</span>
                </>
              ) : isMoving ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full bg-sky-500 shrink-0" />
                  <span>Moving to Position...</span>
                </>
              ) : (
                <>
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Ready to Track</span>
                </>
              )}
            </div>
            <p className="text-sm sm:text-base text-slate-600 pt-1">
              {!isConnected
                ? 'Check that the tracker hardware is switched on and connected to your Wi-Fi.'
                : isTracking
                ? 'The antenna is actively following the satellite across the sky. Aim is good.'
                : isMoving
                ? 'The antenna is adjusting its position.'
                : 'Select a satellite on the dashboard or control page to begin tracking.'}
            </p>
          </div>

          <div className="shrink-0">
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold shadow-2xs">
                <Wifi className="w-4 h-4 text-emerald-600" /> Tracker Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold shadow-2xs">
                <WifiOff className="w-4 h-4 text-rose-600" /> Offline
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Two Clear Main Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-lg shadow-md shadow-sky-500/15 transition-all hover:scale-[1.01] cursor-pointer"
        >
          <Compass className="w-5 h-5 text-white" />
          <span>Open Dashboard</span>
          <ChevronRight className="w-5 h-5 text-white/80" />
        </Link>

        <Link
          href="/control"
          className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-lg border border-slate-200 shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
        >
          <Radio className="w-5 h-5 text-sky-500" />
          <span>Control Tracker</span>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </Link>
      </div>

      {/* Footer note */}
      <div className="text-center pt-6">
        <Link
          href="/about"
          className="text-sm text-slate-500 hover:text-sky-600 underline transition-colors"
        >
          Want to know about the hardware, 3D printed frame, or parts? Read the Project Specs &rarr;
        </Link>
      </div>
    </div>
  );
}
