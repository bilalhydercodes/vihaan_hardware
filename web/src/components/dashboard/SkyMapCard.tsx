'use client';

import React, { useState } from 'react';
import { AngleCoordinates } from '@shared/types/tracker';
import { Compass, Info } from '@/components/ui/icons';

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

  const size = 260;
  const center = size / 2;
  const maxRadius = center - 22; // Margin for N, E, S, W labels

  // Convert (Azimuth, Elevation) to 2D coordinates for Polar Plot
  const toXY = (az: number, el: number) => {
    const clampedEl = Math.max(0, Math.min(90, el));
    const r = maxRadius * (1 - clampedEl / 90.0);
    const azRad = (az - 90) * (Math.PI / 180.0);
    const x = center + r * Math.cos(azRad);
    const y = center + r * Math.sin(azRad);
    return { x, y };
  };

  const hasCurrent = isConnected && current !== null && current !== undefined;
  const hasTarget = isConnected && target !== null && target !== undefined;

  const currentPos = hasCurrent ? toXY(current!.azimuth, current!.elevation) : null;
  const targetPos = hasTarget ? toXY(target!.azimuth, target!.elevation) : null;
  const maskRadius = maxRadius * (1 - minElevationMask / 90.0);
  const isSatelliteUp = hasTarget ? (isVisible ?? (target!.elevation >= minElevationMask)) : false;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
            <Compass className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-slate-900 text-base">Sky Map</h2>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Info"
            >
              <Info className="w-4 h-4" />
            </button>
            {showTooltip && (
              <div className="absolute left-6 top-0 w-52 p-2 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl z-20 pointer-events-none">
                Local topocentric sky view. 0° outer edge is the horizon, center is straight up (zenith 90°).
              </div>
            )}
          </div>
        </div>

        {/* Polar / Spherical Toggle */}
        <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setMode('polar')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              mode === 'polar'
                ? 'bg-sky-500 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Polar
          </button>
          <button
            onClick={() => setMode('spherical')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              mode === 'spherical'
                ? 'bg-sky-500 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Spherical
          </button>
        </div>
      </div>

      {/* Main Body: Radar Plot + Side Details */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 my-auto">
        {/* Circular Radar Plot */}
        <div className="relative shrink-0 select-none">
          <svg width={size} height={size} className="overflow-visible">
            {/* Radar Background */}
            <circle cx={center} cy={center} r={maxRadius} fill="#fafcff" stroke="#e2e8f0" strokeWidth="1.5" />

            {/* Elevation Rings: 30°, 60° */}
            {[30, 60].map((el) => {
              const r = maxRadius * (1 - el / 90.0);
              return (
                <g key={el}>
                  <circle
                    cx={center}
                    cy={center}
                    r={r}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={center + 3}
                    y={center - r + 9}
                    fill="#94a3b8"
                    fontSize="9"
                    fontWeight="500"
                  >
                    {el}°
                  </text>
                </g>
              );
            })}

            {/* 10° Minimum Elevation Mask Ring (Dashed Amber line) */}
            <circle
              cx={center}
              cy={center}
              r={maskRadius}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
            <text
              x={center + 3}
              y={center - maskRadius + 9}
              fill="#d97706"
              fontSize="8.5"
              fontWeight="bold"
            >
              10° Mask
            </text>

            {/* Crosshairs */}
            <line x1={center} y1={center - maxRadius} x2={center} y2={center + maxRadius} stroke="#e2e8f0" strokeWidth="1" />
            <line x1={center - maxRadius} y1={center} x2={center + maxRadius} y2={center} stroke="#e2e8f0" strokeWidth="1" />

            {/* Compass Cardinal Points */}
            <text x={center} y={center - maxRadius - 6} fill="#0ea5e9" fontSize="12" fontWeight="bold" textAnchor="middle">N</text>
            <text x={center + maxRadius + 14} y={center + 4} fill="#64748b" fontSize="11" fontWeight="bold" textAnchor="middle">E</text>
            <text x={center} y={center + maxRadius + 15} fill="#64748b" fontSize="11" fontWeight="bold" textAnchor="middle">S</text>
            <text x={center - maxRadius - 14} y={center + 4} fill="#64748b" fontSize="11" fontWeight="bold" textAnchor="middle">W</text>

            {/* Offline Center Label if no telemetry */}
            {!isConnected && (
              <text x={center} y={center + 4} fill="#94a3b8" fontSize="10.5" fontWeight="600" textAnchor="middle">
                Offline (No Telemetry)
              </text>
            )}

            {/* Connection Line between Aim and Satellite (only if both are active) */}
            {currentPos && targetPos && (
              <line
                x1={currentPos.x}
                y1={currentPos.y}
                x2={targetPos.x}
                y2={targetPos.y}
                stroke="#0284c7"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                strokeOpacity="0.6"
              />
            )}

            {/* Antenna Aim Position Marker (only if real current angles exist) */}
            {currentPos && (
              <g transform={`translate(${currentPos.x}, ${currentPos.y})`}>
                <circle r="7" fill="#0284c7" fillOpacity="0.12" stroke="#0284c7" strokeWidth="1.5" />
                <line x1="-4" y1="0" x2="4" y2="0" stroke="#0284c7" strokeWidth="1.2" />
                <line x1="0" y1="-4" x2="0" y2="4" stroke="#0284c7" strokeWidth="1.2" />
                <circle r="2" fill="#0284c7" />
                <text x="0" y="-10" fill="#0284c7" fontSize="10" fontWeight="bold" textAnchor="middle">
                  Aim
                </text>
              </g>
            )}

            {/* Target Satellite Position Marker (only if real target angles exist) */}
            {targetPos && (
              <g transform={`translate(${targetPos.x}, ${targetPos.y})`}>
                <circle
                  r="6.5"
                  fill={isSatelliteUp ? '#0284c7' : '#94a3b8'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <circle
                  r="2"
                  fill="#ffffff"
                />
                <text
                  x="9"
                  y="3"
                  fill="#0f172a"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {satelliteName ? satelliteName.split(' ')[0] : 'Sat'}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Legend / Metrics List on Right */}
        <div className="space-y-3.5 text-xs text-slate-600 sm:min-w-[130px]">
          {/* Satellite */}
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <span className={`w-2.5 h-2.5 rounded-full ${hasTarget ? 'bg-sky-600' : 'bg-slate-300'} shrink-0`} />
              <span>Satellite</span>
            </div>
            <div className="text-[11px] text-slate-500 pl-4">
              El: <span className="font-semibold text-slate-800">{hasTarget ? `${target!.elevation.toFixed(1)}°` : '—'}</span> Az: <span className="font-semibold text-slate-800">{hasTarget ? `${target!.azimuth.toFixed(1)}°` : '—'}</span>
            </div>
          </div>

          {/* Antenna Aim */}
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <span className={`w-3.5 h-3.5 rounded-full border ${hasCurrent ? 'border-sky-600' : 'border-slate-300'} flex items-center justify-center shrink-0`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasCurrent ? 'bg-sky-600' : 'bg-slate-300'}`} />
              </span>
              <span>Antenna Aim</span>
            </div>
            <div className="text-[11px] text-slate-500 pl-5">
              El: <span className="font-semibold text-slate-800">{hasCurrent ? `${current!.elevation.toFixed(1)}°` : '—'}</span> Az: <span className="font-semibold text-slate-800">{hasCurrent ? `${current!.azimuth.toFixed(1)}°` : '—'}</span>
            </div>
          </div>

          {/* Horizon (10° mask) */}
          <div className="pt-1">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="w-4 border-t-2 border-dashed border-amber-500 shrink-0" />
              <span>Horizon (10° mask)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
