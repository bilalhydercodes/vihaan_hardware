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
  ChevronRight,
  SettingsIcon
} from '@/components/ui/icons';

export default function HomePage() {
  const { status, telemetry, connectionStatus } = useTracker();
  const [pass, setPass] = useState<SatellitePass | null>(null);

  const isConnected = connectionStatus === 'connected';
  const isTracking = (telemetry?.state || status?.state) === 'TRACKING';
  const isMoving = (telemetry?.state || status?.state) === 'SLEWING';
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
    if (!isConnected) return 'Offline';
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

  // Satellite frequency helper
  const getFrequency = (name: string) => {
    if (name.includes('METEOR')) return '137.1 MHz';
    if (name.includes('NOAA 19') || name.includes('NOAA 18')) return '137.9 MHz';
    if (name.includes('NOAA 15')) return '137.6 MHz';
    if (name.includes('NavIC') || name.includes('IRNSS')) return '1176.45 MHz (L5)';
    if (name.includes('ISS')) return '145.800 MHz';
    return '137.1 MHz';
  };

  const hasRealPass = isConnected && pass && pass.maxElevation > 0;

  return (
    <div className="w-full max-w-[1400px] mx-auto flex-1 flex flex-col justify-between gap-4 py-2">
      {/* 1. Cinematic Clean Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200/90 shadow-md shadow-sky-500/5 bg-gradient-to-r from-sky-50 via-sky-100/50 to-slate-900/10 min-h-[220px] max-h-[260px] flex flex-col justify-between p-6 sm:p-7">
        {/* Background Image: High-res Satellite orbiting Earth */}
        <picture className="absolute inset-0 w-full h-full pointer-events-none select-none">
          <source srcSet="/hero-satellite.webp" type="image/webp" />
          <img
            src="/hero-satellite.jpg"
            alt="Satellite in orbit over Earth"
            className="w-full h-full object-cover object-right md:object-center opacity-90"
            loading="eager"
          />
        </picture>

        {/* Soft Left Gradient Overlay for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent w-full md:w-3/5 lg:w-1/2 pointer-events-none" />

        {/* Orbital Trajectory Arc SVG */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none overflow-visible opacity-35 select-none"
          viewBox="0 0 1200 260"
          preserveAspectRatio="none"
        >
          <path
            d="M -100,180 C 300,90 800,40 1300,70"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <path
            d="M -50,240 C 400,140 900,90 1350,110"
            fill="none"
            stroke="#0284c7"
            strokeWidth="1.2"
            strokeOpacity="0.6"
          />
        </svg>

        {/* Brand Title & Status Pill */}
        <div className="relative z-10 space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/85 backdrop-blur-md border border-slate-200/80 text-[11px] font-semibold text-slate-700 shadow-2xs">
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
                ? 'Tracker Offline • Hardware Standby'
                : isTracking
                ? `Tracking Active • ${satName}`
                : isMoving
                ? `Slewing to ${satName}`
                : `Tracker Ready • ${satName}`}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            NAVIC<span className="text-sky-500">-TRACK</span>
          </h1>
          <p className="text-slate-600 font-medium text-xs sm:text-sm leading-relaxed max-w-md">
            Automated satellite tracking and dual-axis antenna pointing system for optimal telemetry and downlink reception.
          </p>
        </div>

        {/* Primary Quick CTA Buttons in Banner */}
        <div className="relative z-10 flex flex-wrap items-center gap-3 pt-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold text-xs sm:text-sm shadow-sm shadow-sky-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Open Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/control"
            className="px-4 py-2 rounded-xl bg-white/90 hover:bg-white active:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 font-bold text-xs sm:text-sm shadow-2xs backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Radio className="w-4 h-4 text-sky-600" />
            <span>Motor Jog & Control</span>
          </Link>
        </div>
      </div>

      {/* 2. Slim Non-Redundant Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: System Connection */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Tracker Status</span>
            <span className="text-xs sm:text-sm font-extrabold text-slate-900 block truncate">
              {!isConnected ? 'Hardware Disconnected' : isTracking ? 'Autonomous Tracking' : 'Standby / Ready'}
            </span>
          </div>
        </div>

        {/* Metric 2: Target Satellite & Frequency */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <Satellite className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Target Satellite</span>
            <span className="text-xs sm:text-sm font-extrabold text-slate-900 block truncate">
              {satName} <span className="text-[11px] text-sky-600 font-normal">({getFrequency(satName)})</span>
            </span>
          </div>
        </div>

        {/* Metric 3: Next Pass Window */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Next Pass Window</span>
            <span className="text-xs sm:text-sm font-extrabold text-slate-900 block truncate">
              {getPassCountdown()} {hasRealPass ? `• Peak ${pass.maxElevation.toFixed(0)}°` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Medium Action Buttons Grid (Simple, Non-Redundant & User-Friendly) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Button 1: Live Dashboard */}
        <Link
          href="/dashboard"
          className="group bg-white border border-slate-200/90 hover:border-sky-400 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition-colors">
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-100">
              3D Orbit
            </span>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-sky-600 transition-colors">
              Live Dashboard
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              Interactive 3D Earth orbit, polar radar sky map, and real-time antenna rotator attitude.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-600">
            <span>Open Dashboard</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Button 2: Satellite Details (TLE) */}
        <Link
          href="/tle"
          className="group bg-white border border-slate-200/90 hover:border-sky-400 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition-colors">
              <Satellite className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              NORAD
            </span>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-sky-600 transition-colors">
              Satellite Details & TLE
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              Orbital two-line element sets, downlink frequencies, and constellation ephemeris library.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-600">
            <span>View Details</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Button 3: Motor Control */}
        <Link
          href="/control"
          className="group bg-white border border-slate-200/90 hover:border-sky-400 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition-colors">
              <Radio className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Manual / Auto
            </span>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-sky-600 transition-colors">
              Antenna Aiming & Jog
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              Dual-axis motor rotator manual controls, 0° limit switch calibration, and auto tracking.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-600">
            <span>Open Controls</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Button 4: System Settings */}
        <Link
          href="/settings"
          className="group bg-white border border-slate-200/90 hover:border-sky-400 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 group-hover:bg-sky-500 group-hover:text-white transition-colors">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Config
            </span>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-sky-600 transition-colors">
              Settings & Calibration
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              Ground station coordinates, tracker access tokens, Wi-Fi, and sensor offsets.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-600">
            <span>Manage Settings</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
}
