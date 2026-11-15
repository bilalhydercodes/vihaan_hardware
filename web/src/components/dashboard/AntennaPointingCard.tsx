'use client';

import React, { useState } from 'react';
import { AngleCoordinates, TrackerStatus, SatellitePass } from '@shared/types/tracker';
import { Target, Info, Navigation, Satellite, Radio, Compass } from '@/components/ui/icons';
import { trackerApi } from '@/lib/api';
import { webSerial } from '@/lib/serial';
import { useTracker } from '@/context/TrackerContext';

interface AntennaPointingCardProps {
  current: AngleCoordinates | null;
  target?: AngleCoordinates | null;
  status?: TrackerStatus | null;
  pass?: SatellitePass | null;
  isConnected: boolean;
}

export function AntennaPointingCard({
  current,
  target,
  status,
  pass,
  isConnected
}: AntennaPointingCardProps) {
  const { refreshStatus } = useTracker();
  const [showTooltip, setShowTooltip] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Motor (Actual) angles
  const curAz = current?.azimuth ?? status?.currentAngles?.azimuth ?? 0;
  const curEl = current?.elevation ?? status?.currentAngles?.elevation ?? 0;

  // Target (METEOR-M2 4) look angles from celestial SGP4
  const targetAz = target?.azimuth ?? status?.targetAngles?.azimuth ?? 84.4;
  const targetEl = target?.elevation ?? status?.targetAngles?.elevation ?? 0.0;

  // Next pass AOS info
  const aosAz = pass?.aosAzimuth ?? status?.nextPass?.aosAzimuth ?? 118.8;
  const maxEl = pass?.maxElevation ?? status?.nextPass?.maxElevation ?? 25.6;

  // Error / offset
  const azDiff = Math.abs(curAz - targetAz);
  const elDiff = Math.abs(curEl - targetEl);
  const trackingError = Math.sqrt(azDiff * azDiff + elDiff * elDiff);
  const isAligned = trackingError <= 3.5;

  // Cardinal abbreviation
  const getCardinal = (az: number) => {
    const val = Math.floor((((az % 360) + 360) % 360) / 22.5 + 0.5);
    const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return arr[val % 16];
  };

  const showFeedback = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleAimAtSatellite = async () => {
    setActionLoading(true);
    try {
      const az = parseFloat(targetAz.toFixed(1));
      const el = parseFloat(Math.max(0, targetEl).toFixed(1));
      if (webSerial.isConnected()) {
        await webSerial.sendCommand(`GOTO,${az.toFixed(1)},${el.toFixed(1)}`);
      }
      await trackerApi.move({ azimuth: az, elevation: el });
      await refreshStatus();
      showFeedback(`Antenna aimed at METEOR-M2 4 (${az}°, ${el}°)!`, 'success');
    } catch (e: any) {
      showFeedback(`Command failed: ${e.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePreAimAOS = async () => {
    setActionLoading(true);
    try {
      const az = parseFloat(aosAz.toFixed(1));
      if (webSerial.isConnected()) {
        await webSerial.sendCommand(`GOTO,${az.toFixed(1)},0.0`);
      }
      await trackerApi.move({ azimuth: az, elevation: 0 });
      await refreshStatus();
      showFeedback(`Pre-aimed rotator to AOS Az ${az}°!`, 'success');
    } catch (e: any) {
      showFeedback(`Command failed: ${e.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJog45 = async () => {
    setActionLoading(true);
    try {
      const nextAz = parseFloat(((curAz + 45) % 360).toFixed(1));
      if (webSerial.isConnected()) {
        await webSerial.sendCommand(`GOTO,${nextAz.toFixed(1)},${curEl.toFixed(1)}`);
      }
      await trackerApi.move({ azimuth: nextAz, elevation: curEl });
      await refreshStatus();
      showFeedback(`Rotated azimuth +45° to ${nextAz}°!`, 'success');
    } catch (e: any) {
      showFeedback(`Command failed: ${e.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleHome = async () => {
    setActionLoading(true);
    try {
      if (webSerial.isConnected()) {
        await webSerial.sendCommand('HOME');
      }
      await trackerApi.home();
      await refreshStatus();
      showFeedback('Homed antenna to 0.0°, 0.0°', 'info');
    } catch (e: any) {
      showFeedback(`Command failed: ${e.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between h-full space-y-3">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight leading-none">Antenna Pointing</h2>
            <p className="text-[11px] text-slate-500">Live dual-axis rotator vs. METEOR-M2 4 look angles</p>
          </div>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              aria-label="Info"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
            {showTooltip && (
              <div className="absolute left-6 top-0 w-56 p-2 bg-slate-900 text-white text-[10px] rounded-xl shadow-xl z-20 pointer-events-none leading-relaxed">
                Dual-axis stepper angles compared in real time with the SGP4 celestial orbital position of METEOR-M2 4.
              </div>
            )}
          </div>
        </div>

        {/* Status Pill */}
        {isAligned ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            🎯 On Target
          </span>
        ) : isConnected ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            Antenna Active
          </span>
        ) : (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            Celestial Mode
          </span>
        )}
      </div>

      {/* 2. 2x2 Telemetry Grid (Motor vs Target Look Angles) */}
      <div className="grid grid-cols-2 gap-2">
        {/* Box 1: Motor Azimuth (Physical) */}
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-100/90 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
            <Navigation
              className="w-4 h-4 transition-transform duration-500"
              style={{ transform: `rotate(${curAz - 45}deg)` }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate flex items-center gap-1">
              <span>Motor Az</span>
              <span className="text-sky-700 font-extrabold">({getCardinal(curAz)})</span>
            </div>
            <div className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight font-mono">
              {curAz.toFixed(1)}°
            </div>
            <div className="text-[9px] text-slate-400 font-medium">Rotator Heading</div>
          </div>
        </div>

        {/* Box 2: Motor Elevation (Tilt) */}
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-100/90 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h16" />
              <path d="m4 20 12-12" />
              <path d="M12 20a8 8 0 0 0-4-7" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate flex items-center gap-1">
              <span>Motor Tilt</span>
              <span className="text-slate-600 text-[9px] font-semibold">({curEl === 0 ? 'Horiz' : curEl >= 80 ? 'Zenith' : `${curEl.toFixed(0)}°`})</span>
            </div>
            <div className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight font-mono">
              {curEl.toFixed(1)}°
            </div>
            <div className="text-[9px] text-slate-400 font-medium">Physical Pitch</div>
          </div>
        </div>

        {/* Box 3: Target Azimuth (METEOR-M2 4) */}
        <div className="bg-sky-50/60 border border-sky-200/80 rounded-xl p-2.5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Satellite className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-sky-800 uppercase tracking-tight truncate flex items-center gap-1">
              <span>Target Az</span>
              <span className="text-sky-900 font-extrabold">({getCardinal(targetAz)})</span>
            </div>
            <div className="text-base sm:text-lg font-extrabold text-sky-950 leading-tight font-mono">
              {targetAz.toFixed(1)}°
            </div>
            <div className="text-[9px] text-sky-600 font-medium truncate">METEOR-M2 4 SGP4</div>
          </div>
        </div>

        {/* Box 4: Target Elevation / AOS */}
        <div className="bg-sky-50/60 border border-sky-200/80 rounded-xl p-2.5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Compass className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-sky-800 uppercase tracking-tight truncate flex items-center gap-1">
              <span>Target El</span>
              <span className="text-sky-900 text-[9px] font-bold">(Pk {maxEl.toFixed(0)}°)</span>
            </div>
            <div className="text-base sm:text-lg font-extrabold text-sky-950 leading-tight font-mono">
              {targetEl.toFixed(1)}°
            </div>
            <div className="text-[9px] text-sky-600 font-medium truncate">AOS Az: {aosAz.toFixed(0)}°</div>
          </div>
        </div>
      </div>

      {/* 3. Tracking Alignment Differential Banner */}
      <div className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
        isAligned
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-amber-50/80 border-amber-200/90 text-amber-900'
      }`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isAligned ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="font-bold text-[11px] truncate">
            {isAligned
              ? 'Rotator Aligned with METEOR-M2 4'
              : `Tracking Offset: Δ ${trackingError.toFixed(1)}° (${getCardinal(targetAz)} ${targetAz.toFixed(1)}°)`}
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/80 border border-current/20 shrink-0">
          Δ {trackingError.toFixed(1)}°
        </span>
      </div>

      {/* 4. Compact Antenna Dish Rotator & Overlays */}
      <div className="relative w-full h-[115px] flex items-center justify-center select-none overflow-hidden bg-slate-50/50 rounded-xl border border-slate-100">
        <div className="relative w-[260px] h-[110px] flex items-center justify-center">
          {/* Compressed Antenna Dish with Dynamic Tilt */}
          <div
            className="relative w-[115px] h-[95px] flex items-center justify-center transition-transform duration-700 ease-out"
            style={{
              transform: `rotate(-${Math.min(30, curEl * 0.35)}deg)`
            }}
          >
            <picture>
              <source srcSet="/antenna-dish.webp" type="image/webp" />
              <img
                src="/antenna-dish.png"
                alt="Antenna Dish Rotator"
                width={115}
                height={95}
                className="object-contain drop-shadow-sm select-none pointer-events-none transition-all duration-300"
                loading="eager"
              />
            </picture>
          </div>

          {/* SVG Overlay for Direction Indicators & Badges */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            viewBox="0 0 260 110"
          >
            {/* Azimuth Rotation Curved Arrow */}
            <path
              d="M 75,98 A 45,10 0 0,0 170,98"
              fill="none"
              stroke="#0284c7"
              strokeWidth="1.8"
            />
            <polygon
              points="168,93 177,99 167,103"
              fill="#0284c7"
            />

            {/* Motor Actual Badge */}
            <g transform="translate(180, 96)">
              <rect
                x="0"
                y="-9"
                width="72"
                height="18"
                rx="5"
                fill="#f0f9ff"
                stroke="#0284c7"
                strokeWidth="1"
              />
              <text
                x="36"
                y="3.5"
                fill="#0284c7"
                fontSize="9"
                fontWeight="extrabold"
                textAnchor="middle"
              >
                Motor {curAz.toFixed(0)}°/{curEl.toFixed(0)}°
              </text>
            </g>

            {/* Target Celestial Badge */}
            <g transform="translate(8, 20)">
              <rect
                x="0"
                y="-9"
                width="78"
                height="18"
                rx="5"
                fill="#ecfdf5"
                stroke="#10b981"
                strokeWidth="1"
              />
              <text
                x="39"
                y="3.5"
                fill="#047857"
                fontSize="9"
                fontWeight="extrabold"
                textAnchor="middle"
              >
                Target {targetAz.toFixed(0)}°/{targetEl.toFixed(0)}°
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* 5. 1-Click Interactive Action Bar */}
      <div className="space-y-1.5 pt-1">
        {feedback && (
          <div className={`text-[11px] font-bold px-2.5 py-1 rounded-lg text-center transition-all ${
            feedback.type === 'error'
              ? 'bg-rose-100 text-rose-800'
              : feedback.type === 'info'
              ? 'bg-sky-100 text-sky-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}>
            {feedback.msg}
          </div>
        )}

        <div className="space-y-1.5">
          {/* Row 1: Primary Aim Action */}
          <button
            type="button"
            onClick={handleAimAtSatellite}
            disabled={actionLoading}
            className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            title={`Slew rotator directly to ${targetAz.toFixed(1)}° azimuth`}
          >
            <span>🎯</span>
            <span className="truncate">{actionLoading ? 'Aiming Motors...' : `Aim at METEOR-M2 4 (${targetAz.toFixed(0)}° Az)`}</span>
          </button>

          {/* Row 2: Secondary Shortcuts */}
          <div className="grid grid-cols-3 gap-1.5">
            {/* Pre-Aim AOS */}
            <button
              type="button"
              onClick={handlePreAimAOS}
              disabled={actionLoading}
              className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] border border-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              title={`Pre-aim to next pass AOS azimuth (${aosAz.toFixed(1)}°)`}
            >
              <span>⚡</span>
              <span className="truncate">AOS {aosAz.toFixed(0)}°</span>
            </button>

            {/* Jog +45° */}
            <button
              type="button"
              onClick={handleJog45}
              disabled={actionLoading}
              className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] border border-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              title="Jog rotator +45°"
            >
              <span>↻</span>
              <span className="truncate">+45° Jog</span>
            </button>

            {/* Home / Zero */}
            <button
              type="button"
              onClick={handleHome}
              disabled={actionLoading}
              className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-[11px] border border-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              title="Reset rotator to 0.0°, 0.0°"
            >
              <span>🏠</span>
              <span className="truncate">Zero (0°)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
