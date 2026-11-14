'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTracker } from '@/context/TrackerContext';
import { trackerApi } from '@/lib/api';
import { SatellitePass } from '@shared/types/tracker';
import {
  Compass,
  Radio,
  Satellite,
  Activity,
  Calendar,
  SettingsIcon,
  ChevronRight
} from '@/components/ui/icons';

export default function HomePage() {
  const { status, telemetry, connectionStatus } = useTracker();
  const [pass, setPass] = useState<SatellitePass | null>(null);

  const isConnected = connectionStatus === 'connected';
  const isTracking = (telemetry?.state || status?.state) === 'TRACKING';
  const satName = status?.satelliteName || telemetry?.satelliteName || 'METEOR-M2 4';

  // Fetch upcoming pass prediction if connected
  useEffect(() => {
    let isMounted = true;
    if (!isConnected) {
      setPass(null);
      return;
    }
    async function loadPass() {
      try {
        const data = await trackerApi.getPrediction();
        if (isMounted) setPass(data);
      } catch {
        if (isMounted) setPass(null);
      }
    }
    loadPass();
    const interval = setInterval(loadPass, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isConnected, satName]);

  // Compute pass countdown
  const getPassCountdown = () => {
    if (!isConnected) return 'Tracker Offline';
    if (!pass || pass.maxElevation <= 0) return 'No pass in 48h';
    const now = Date.now();
    const aos = new Date(pass.aos).getTime();
    const los = new Date(pass.los).getTime();

    if (now >= aos && now <= los) {
      return 'Active Now';
    }
    const diffMins = Math.round((aos - now) / 60000);
    if (diffMins <= 0) return 'Starting now';
    if (diffMins < 60) return `in ${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `in ${hours}h ${mins}m`;
  };

  const getFrequency = (name: string) => {
    if (name.includes('METEOR')) return '137.1 MHz';
    if (name.includes('NOAA 19') || name.includes('NOAA 18')) return '137.9 MHz';
    if (name.includes('NOAA 15')) return '137.6 MHz';
    if (name.includes('NavIC') || name.includes('IRNSS')) return '1176.45 MHz';
    if (name.includes('ISS')) return '145.8 MHz';
    return '137.1 MHz';
  };

  const hasRealPass = isConnected && pass && pass.maxElevation > 0;

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-4 py-2">
      {/* 1. Clean, High-Impact Hero Banner (No Useless Overlay Lines) */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm bg-gradient-to-r from-sky-50 via-sky-100/40 to-slate-900/10 min-h-[220px] sm:min-h-[240px] flex flex-col justify-between p-5 sm:p-7">
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
        <div className="relative z-10 space-y-2 max-w-lg">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 text-[11px] font-semibold text-slate-700 shadow-2xs">
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
                : `Tracker Standby • ${satName}`}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            NAVIC<span className="text-sky-500">-TRACK</span>
          </h1>
          <p className="text-slate-600 font-medium text-xs sm:text-sm leading-relaxed max-w-md">
            Automated dual-axis satellite antenna rotator and telemetry tracking system.
          </p>
        </div>

        {/* Integrated Mission Telemetry Bar (Inside Banner, Zero Wasted Space) */}
        <div className="relative z-10 pt-4">
          <div className="inline-flex flex-wrap items-center gap-x-5 gap-y-2 px-3.5 py-2 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-2xs text-xs">
            {/* Status */}
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-sky-600" />
              <span className="text-slate-500 text-[11px]">Status:</span>
              <span className="font-bold text-slate-900">
                {!isConnected ? 'Offline' : isTracking ? 'Autonomous Tracking' : 'Standby'}
              </span>
            </div>

            <div className="hidden sm:block w-px h-3.5 bg-slate-200" />

            {/* Target Satellite */}
            <div className="flex items-center gap-2">
              <Satellite className="w-3.5 h-3.5 text-sky-600" />
              <span className="text-slate-500 text-[11px]">Target:</span>
              <span className="font-bold text-slate-900">
                {satName} <span className="font-normal text-sky-600">({getFrequency(satName)})</span>
              </span>
            </div>

            <div className="hidden sm:block w-px h-3.5 bg-slate-200" />

            {/* Next Pass */}
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span className="text-slate-500 text-[11px]">Next Pass:</span>
              <span className="font-bold text-slate-900 font-mono">
                {getPassCountdown()} {hasRealPass ? `• Peak ${pass.maxElevation.toFixed(0)}°` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Proper Medium Quick-Action Navigation Cards (Perfect 4-Column Alignment) */}
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
