'use client';

import React from 'react';
import Link from 'next/link';
import { useTracker } from '@/context/TrackerContext';
import {
  Compass,
  Radio,
  Satellite,
  SettingsIcon,
  ChevronRight
} from '@/components/ui/icons';

export default function HomePage() {
  const { status, telemetry, connectionStatus } = useTracker();

  const isConnected = connectionStatus === 'connected';
  const isTracking = (telemetry?.state || status?.state) === 'TRACKING';
  const satName = status?.satelliteName || telemetry?.satelliteName || 'METEOR-M2 4';

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-4 py-2">
      {/* 1. Clean, High-Impact Hero Banner */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm bg-gradient-to-r from-sky-50 via-sky-100/40 to-slate-900/10 min-h-[220px] sm:min-h-[250px] flex flex-col justify-center p-6 sm:p-10">
        {/* Clean Satellite Orbit Background Image */}
        <picture className="absolute inset-0 w-full h-full pointer-events-none select-none">
          <source srcSet="/hero-satellite.webp" type="image/webp" />
          <img
            src="/hero-satellite.jpg"
            alt="Satellite in orbit over Earth"
            className="w-full h-full object-cover object-right md:object-center"
            loading="eager"
          />
        </picture>

        {/* Soft Linear Gradient for Title Legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent w-full md:w-3/5 lg:w-1/2 pointer-events-none" />

        {/* Brand Title & Description */}
        <div className="relative z-10 space-y-2.5 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-2xs">
            <span
              className={`w-2 h-2 rounded-full ${
                !isConnected
                  ? 'bg-rose-500'
                  : isTracking
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-emerald-500'
              }`}
            />
            <span>
              {!isConnected
                ? 'Hardware Disconnected'
                : isTracking
                ? `Tracking Active • ${satName}`
                : `Tracker Ready • ${satName}`}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            NAVIC<span className="text-sky-500">-TRACK</span>
          </h1>
          <p className="text-slate-600 font-medium text-xs sm:text-sm lg:text-base leading-relaxed max-w-md">
            Automated dual-axis satellite antenna rotator and telemetry tracking system.
          </p>
        </div>
      </div>

      {/* 2. Visual Navigation Buttons */}
      <div className="space-y-3">
        {/* Top Primary Pair: Live Dashboard (Blue Theme) & Satellite Details (Clean Simple) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Button 1: Live Dashboard (Signature Blue Theme) */}
          <Link
            href="/dashboard"
            className="group relative overflow-hidden bg-gradient-to-br from-sky-500 via-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-600 rounded-2xl p-5 shadow-sm shadow-sky-500/25 hover:shadow-md hover:shadow-sky-500/35 transition-all flex flex-col justify-between min-h-[135px] text-white cursor-pointer"
          >
            {/* Subtle light orb in top right */}
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-xs">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 group-hover:bg-white group-hover:text-sky-600 transition-colors flex items-center gap-1">
                <span>Launch Dashboard</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>

            <div className="relative z-10 pt-2">
              <h3 className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                Live Dashboard
              </h3>
              <p className="text-xs text-sky-100/90 mt-1 leading-relaxed max-w-md">
                3D orbital Earth globe, topocentric radar sky map, and real-time antenna rotator attitude.
              </p>
            </div>
          </Link>

          {/* Button 2: Satellite Details (Clean, Simple White Theme) */}
          <Link
            href="/tle"
            className="group bg-white hover:bg-slate-50/50 border border-slate-200/90 hover:border-sky-300 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between min-h-[135px] cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-700 group-hover:bg-sky-50 group-hover:text-sky-600 transition-colors">
                <Satellite className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-600 group-hover:text-sky-600 transition-colors flex items-center gap-1">
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>

            <div className="pt-2">
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight group-hover:text-sky-600 transition-colors">
                Satellite Details & TLE
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-md">
                Live NORAD two-line orbital elements, downlink frequencies, and constellation ephemeris.
              </p>
            </div>
          </Link>
        </div>

        {/* Bottom Secondary Pair: Motor Controls & Settings (Small & Clean) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Button 3: Motor Controls (Small & Clean) */}
          <Link
            href="/control"
            className="group bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 rounded-xl px-4 py-3 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                <Radio className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-sky-600 transition-colors truncate">
                  Motor Controls & Jog
                </h4>
                <p className="text-[11px] text-slate-500 truncate">
                  Dual-axis manual aiming and homing calibration
                </p>
              </div>
            </div>
            <div className="text-slate-400 group-hover:text-sky-600 pl-2 shrink-0 transition-colors">
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Button 4: Settings & Calibration (Small & Clean) */}
          <Link
            href="/settings"
            className="group bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 rounded-xl px-4 py-3 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600 shrink-0">
                <SettingsIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm group-hover:text-sky-600 transition-colors truncate">
                  Settings & Calibration
                </h4>
                <p className="text-[11px] text-slate-500 truncate">
                  Ground station coordinates, Wi-Fi & tokens
                </p>
              </div>
            </div>
            <div className="text-slate-400 group-hover:text-sky-600 pl-2 shrink-0 transition-colors">
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
