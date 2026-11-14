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
    <div className="w-full max-w-[1400px] mx-auto space-y-5 py-2">
      {/* 1. Clean, High-Impact Hero Banner */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm bg-gradient-to-r from-sky-50 via-sky-100/40 to-slate-900/10 min-h-[220px] sm:min-h-[260px] flex flex-col justify-center p-6 sm:p-10">
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

      {/* 2. Proper Medium Quick-Action Navigation Cards (Perfect 4-Column Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Dashboard */}
        <Link
          href="/dashboard"
          className="group bg-white border border-slate-200/90 hover:border-sky-400 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition-colors">
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-sky-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              <span>Open</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base group-hover:text-sky-600 transition-colors">
              Live Dashboard
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              3D Earth orbit visualization, topocentric radar sky map, and real-time antenna rotator attitude.
            </p>
          </div>
        </Link>

        {/* Card 2: Satellite Details */}
        <Link
          href="/tle"
          className="group bg-white border border-slate-200/90 hover:border-sky-400 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition-colors">
              <Satellite className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-sky-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              <span>View</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base group-hover:text-sky-600 transition-colors">
              Satellite Details
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              NORAD two-line orbital elements, downlink frequencies, and live constellation ephemeris.
            </p>
          </div>
        </Link>

        {/* Card 3: Motor Jog & Controls */}
        <Link
          href="/control"
          className="group bg-white border border-slate-200/90 hover:border-sky-400 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition-colors">
              <Radio className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-sky-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              <span>Control</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base group-hover:text-sky-600 transition-colors">
              Motor Controls
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Dual-axis pan/tilt manual motor jogging, 0° hardware limit switch homing, and auto tracking.
            </p>
          </div>
        </Link>

        {/* Card 4: Settings */}
        <Link
          href="/settings"
          className="group bg-white border border-slate-200/90 hover:border-sky-400 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition-colors">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-sky-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              <span>Configure</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base group-hover:text-sky-600 transition-colors">
              Settings & Wi-Fi
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Ground station coordinates, security access tokens, Wi-Fi credentials, and sensor offsets.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
