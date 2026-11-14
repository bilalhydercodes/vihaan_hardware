'use client';

import React, { useState } from 'react';
import { AngleCoordinates } from '@shared/types/tracker';
import { Compass, Info, Target, Radio } from '@/components/ui/icons';

interface SkyMapCardProps {
  current: AngleCoordinates | null;
  target: AngleCoordinates | null;
  satelliteName?: string | null;
  isVisible?: boolean | null;
  minElevationMask?: number;
  isConnected: boolean;
}

export function SkyMapCard({
  current,
  target,
  satelliteName,
  isVisible,
  minElevationMask = 10,
  isConnected
}: SkyMapCardProps) {
  const [mode, setMode] = useState<'polar' | 'spherical'>('polar');
  const [showTooltip, setShowTooltip] = useState(false);

  // Scaled 1.5x in both length and breadth: size 380 (viewBox 0 0 380 380)
  const size = 380;
  const center = size / 2; // 190
  const maxRadius = center - 30; // 160 margin for N, E, S, W labels

  // Convert (Azimuth, Elevation) to 2D coordinates
  // Polar: Equidistant projection r = R * (1 - el/90)
  // Spherical: Orthographic hemisphere projection r = R * cos(el)
  const getRadiusForElevation = (el: number) => {
    const clampedEl = Math.max(0, Math.min(90, el));
    if (mode === 'spherical') {
      return maxRadius * Math.cos((clampedEl * Math.PI) / 180.0);
    }
    return maxRadius * (1 - clampedEl / 90.0);
  };

  const toXY = (az: number, el: number) => {
    const r = getRadiusForElevation(el);
    const azRad = (az - 90) * (Math.PI / 180.0);
    const x = center + r * Math.cos(azRad);
    const y = center + r * Math.sin(azRad);
    return { x, y };
  };

  const hasCurrent = isConnected && current !== null && current !== undefined;
  const hasTarget = isConnected && target !== null && target !== undefined;

  const currentPos = hasCurrent ? toXY(current!.azimuth, current!.elevation) : null;
  const targetPos = hasTarget ? toXY(target!.azimuth, target!.elevation) : null;
  const maskRadius = getRadiusForElevation(minElevationMask);
  const r30 = getRadiusForElevation(30);
  const r60 = getRadiusForElevation(60);
  const isSatelliteUp = hasTarget ? (isVisible ?? (target!.elevation >= minElevationMask)) : false;

  // Angular offset between target and current aim
  let angularError: number | null = null;
  if (hasCurrent && hasTarget) {
    const dAz = (target!.azimuth - current!.azimuth) * Math.cos((current!.elevation * Math.PI) / 180);
    const dEl = target!.elevation - current!.elevation;
    angularError = Math.sqrt(dAz * dAz + dEl * dEl);
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-lg tracking-tight">Sky Map (Hero View)</h2>
            <p className="text-xs text-slate-500">
              {mode === 'polar' ? 'Equidistant polar sky plot' : 'Orthographic spherical hemisphere view'}
            </p>
          </div>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              aria-label="Info"
            >
              <Info className="w-4 h-4" />
            </button>
            {showTooltip && (
              <div className="absolute left-6 top-0 w-64 p-2.5 bg-slate-900 text-white text-[11px] rounded-xl shadow-xl z-20 pointer-events-none leading-relaxed">
                Topocentric sky dome scaled 1.5x. Outer circle is 0° horizon; dashed line is the 10° local elevation mask; center is 90° zenith.
              </div>
            )}
          </div>
        </div>

        {/* Polar / Spherical Toggle */}
        <div className="flex items-center p-1 bg-slate-100/90 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('polar')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'polar'
                ? 'bg-white text-sky-600 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Polar
          </button>
          <button
            type="button"
            onClick={() => setMode('spherical')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === 'spherical'
                ? 'bg-white text-sky-600 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Spherical
          </button>
        </div>
      </div>

      {/* Main Content Area: Large 1.5x Radar + Look Angles & Telemetry Grid */}
      <div className="flex flex-col xl:flex-row items-center justify-between gap-6 my-auto">
        {/* Large 1.5x Scaled Radar Canvas */}
        <div className="relative flex items-center justify-center shrink-0 w-full max-w-[380px] aspect-square">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-full h-full select-none overflow-visible"
          >
            {/* Concentric Elevation Circles */}
            {/* 0° Horizon */}
            <circle
              cx={center}
              cy={center}
              r={maxRadius}
              fill="#f8fafc"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />

            {/* 10° Elevation Mask (Orange dashed line) */}
            <circle
              cx={center}
              cy={center}
              r={maskRadius}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text
              x={center + maskRadius - 6}
              y={center - 6}
              fill="#d97706"
              fontSize="9"
              fontWeight="bold"
              textAnchor="end"
            >
              10° Mask
            </text>

            {/* 30° Elevation */}
            <circle
              cx={center}
              cy={center}
              r={r30}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="1.2"
            />
            <text
              x={center + 5}
              y={center - r30 + 12}
              fill="#94a3b8"
              fontSize="9"
              fontWeight="semibold"
            >
              30°
            </text>

            {/* 60° Elevation */}
            <circle
              cx={center}
              cy={center}
              r={r60}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="1.2"
            />
            <text
              x={center + 5}
              y={center - r60 + 12}
              fill="#94a3b8"
              fontSize="9"
              fontWeight="semibold"
            >
              60°
            </text>

            {/* Zenith 90° (Center Point) */}
            <circle
              cx={center}
              cy={center}
              r="2.5"
              fill="#94a3b8"
            />

            {/* Cardinal Axes */}
            <line
              x1={center}
              y1={center - maxRadius}
              x2={center}
              y2={center + maxRadius}
              stroke="#e2e8f0"
              strokeWidth="1.2"
            />
            <line
              x1={center - maxRadius}
              y1={center}
              x2={center + maxRadius}
              y2={center}
              stroke="#e2e8f0"
              strokeWidth="1.2"
            />

            {/* Cardinal Labels with safe padding */}
            <text
              x={center}
              y={center - maxRadius - 12}
              fill="#0284c7"
              fontSize="13"
              fontWeight="extrabold"
              textAnchor="middle"
            >
              N (0°)
            </text>
            <text
              x={center + maxRadius + 22}
              y={center + 4}
              fill="#64748b"
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
            >
              E (90°)
            </text>
            <text
              x={center}
              y={center + maxRadius + 22}
              fill="#64748b"
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
            >
              S (180°)
            </text>
            <text
              x={center - maxRadius - 22}
              y={center + 4}
              fill="#64748b"
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
            >
              W (270°)
            </text>

            {/* Offset tracking vector line between Aim and Target */}
            {currentPos && targetPos && (
              <line
                x1={currentPos.x}
                y1={currentPos.y}
                x2={targetPos.x}
                y2={targetPos.y}
                stroke="#0284c7"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                strokeOpacity="0.7"
              />
            )}

            {/* Current Antenna Aim Marker (Crosshair) */}
            {currentPos && (
              <g transform={`translate(${currentPos.x}, ${currentPos.y})`}>
                <circle r="10" fill="#0284c7" fillOpacity="0.12" stroke="#0284c7" strokeWidth="1.5" />
                <line x1="-6" y1="0" x2="6" y2="0" stroke="#0284c7" strokeWidth="1.5" />
                <line x1="0" y1="-6" x2="0" y2="6" stroke="#0284c7" strokeWidth="1.5" />
                <circle r="2.5" fill="#0284c7" />
                {/* Aim label with overlap prevention */}
                <g transform={currentPos.y < center - maxRadius + 30 ? "translate(0, 18)" : "translate(0, -14)"}>
                  <rect x="-14" y="-8" width="28" height="14" rx="4" fill="#0284c7" fillOpacity="0.9" />
                  <text
                    x="0"
                    y="2"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    Aim
                  </text>
                </g>
              </g>
            )}

            {/* Target Satellite Marker */}
            {targetPos && (
              <g transform={`translate(${targetPos.x}, ${targetPos.y})`}>
                {/* Outer Glow */}
                <circle
                  r="12"
                  fill={isSatelliteUp ? '#0284c7' : '#94a3b8'}
                  fillOpacity="0.2"
                  className={isSatelliteUp ? 'animate-ping' : ''}
                />
                <circle
                  r="7.5"
                  fill={isSatelliteUp ? '#0284c7' : '#94a3b8'}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <circle
                  r="2.5"
                  fill="#ffffff"
                />
                <text
                  x="11"
                  y="3.5"
                  fill="#0f172a"
                  fontSize="11"
                  fontWeight="extrabold"
                >
                  {satelliteName ? satelliteName.split(' ')[0] : 'Target'}
                </text>
              </g>
            )}

            {/* Offline notice overlay in center if disconnected */}
            {!isConnected && (
              <g transform={`translate(${center}, ${center})`}>
                <rect x="-60" y="-14" width="120" height="28" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))" />
                <text x="0" y="4" fill="#64748b" fontSize="11" fontWeight="bold" textAnchor="middle">
                  Tracker Offline
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Look-Angle & Telemetry Side Panel */}
        <div className="w-full xl:w-56 space-y-3 text-xs">
          {/* Target Satellite Look Angles */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <span className={`w-2.5 h-2.5 rounded-full ${hasTarget ? 'bg-sky-600' : 'bg-slate-300'} shrink-0`} />
              <span>Target Satellite</span>
            </div>
            <div className="grid grid-cols-2 gap-1 pt-1 text-[11px] font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">Elevation</span>
                <span className="font-bold text-slate-800">{hasTarget ? `${target!.elevation.toFixed(1)}°` : '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Azimuth</span>
                <span className="font-bold text-slate-800">{hasTarget ? `${target!.azimuth.toFixed(1)}°` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Current Antenna Aim */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <span className={`w-3 h-3 rounded-full border-2 ${hasCurrent ? 'border-sky-600' : 'border-slate-300'} flex items-center justify-center shrink-0`}>
                <span className={`w-1 h-1 rounded-full ${hasCurrent ? 'bg-sky-600' : 'bg-slate-300'}`} />
              </span>
              <span>Antenna Aim</span>
            </div>
            <div className="grid grid-cols-2 gap-1 pt-1 text-[11px] font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">Elevation</span>
                <span className="font-bold text-slate-800">{hasCurrent ? `${current!.elevation.toFixed(1)}°` : '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Azimuth</span>
                <span className="font-bold text-slate-800">{hasCurrent ? `${current!.azimuth.toFixed(1)}°` : '—'}</span>
              </div>
            </div>
          </div>

          {/* Angular Pointing Error */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-600">Pointing Offset</span>
            <span className="font-mono font-bold text-xs text-sky-700">
              {angularError !== null ? `Δ ${angularError.toFixed(1)}°` : '—'}
            </span>
          </div>

          {/* Legend Items */}
          <div className="p-2.5 rounded-xl border border-dashed border-slate-200 space-y-1.5 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-3.5 border-t-2 border-dashed border-amber-500 shrink-0" />
              <span>10° Elevation Mask</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600 shrink-0" />
              <span>{isSatelliteUp ? 'Satellite Visible' : 'Below Horizon'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}