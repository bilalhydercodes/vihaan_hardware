'use client';

import React, { useState } from 'react';
import { AngleCoordinates } from '@shared/types/tracker';
import { Target, Info, Navigation } from '@/components/ui/icons';

interface AntennaPointingCardProps {
  current: AngleCoordinates | null;
  target?: AngleCoordinates | null;
  isConnected: boolean;
}

export function AntennaPointingCard({ current, target, isConnected }: AntennaPointingCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Only display real values if connected and current angles exist
  const hasAngles = isConnected && current !== null && current !== undefined;
  const azText = hasAngles ? `${current.azimuth.toFixed(1)}°` : '—';
  const elText = hasAngles ? `${current.elevation.toFixed(1)}°` : '—';

  // Helper for cardinal abbreviation
  const getCardinal = (az: number) => {
    const val = Math.floor((az / 22.5) + 0.5);
    const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return arr[val % 16];
  };

  const cardinal = hasAngles ? getCardinal(current.azimuth) : '';

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-lg tracking-tight">Antenna Pointing</h2>
            <p className="text-xs text-slate-500">Dual-axis motor rotator attitude</p>
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
              <div className="absolute left-6 top-0 w-56 p-2.5 bg-slate-900 text-white text-[11px] rounded-xl shadow-xl z-20 pointer-events-none leading-relaxed">
                Real-time motor pointing angles and 3D physical rotator attitude representation.
              </div>
            )}
          </div>
        </div>

        {!isConnected ? (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
            Offline
          </span>
        ) : (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Pose
          </span>
        )}
      </div>

      {/* Top 2 Stat Boxes */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Azimuth Box */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100/80 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
            <Navigation className="w-5 h-5 -rotate-45" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Azimuth {cardinal ? `(${cardinal})` : ''}
            </div>
            <div className="text-2xl font-extrabold text-slate-900 leading-tight font-mono">
              {azText}
            </div>
          </div>
        </div>

        {/* Elevation Box */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100/80 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h16" />
              <path d="m4 20 12-12" />
              <path d="M12 20a8 8 0 0 0-4-7" />
            </svg>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Elevation (Tilt)</div>
            <div className="text-2xl font-extrabold text-slate-900 leading-tight font-mono">
              {elText}
            </div>
          </div>
        </div>
      </div>

      {/* Antenna Dish Illustration with Compressed Fast-Loading Image & Overlays */}
      <div className="relative w-full flex items-center justify-center py-4 select-none my-auto">
        <div className="relative w-[280px] h-[180px] flex items-center justify-center">
          {/* Compressed Antenna Dish (WebP with PNG fallback, 39KB, loads instantly) */}
          <div className="relative w-[160px] h-[140px] flex items-center justify-center mb-2">
            <picture>
              <source srcSet="/antenna-dish.webp" type="image/webp" />
              <img
                src="/antenna-dish.png"
                alt="Antenna Dish Rotator"
                width={160}
                height={140}
                onLoad={() => setImgLoaded(true)}
                className={`object-contain drop-shadow-md select-none pointer-events-none transition-all duration-300 ${
                  imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                } ${hasAngles ? 'filter-none' : 'grayscale-[40%] contrast-90'}`}
                loading="eager"
                decoding="async"
              />
            </picture>
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-sky-200 border-t-sky-500 animate-spin" />
              </div>
            )}
          </div>

          {/* SVG Overlay for Real Direction Indicators */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            viewBox="0 0 280 180"
          >
            {/* Azimuth Rotation Curved Arrow around the base */}
            <path
              d="M 80,158 A 55,14 0 0,0 190,158"
              fill="none"
              stroke={hasAngles ? '#0284c7' : '#94a3b8'}
              strokeWidth="2"
              strokeDasharray={hasAngles ? 'none' : '3 3'}
            />
            {/* Arrowhead */}
            <polygon
              points="188,153 197,159 187,163"
              fill={hasAngles ? '#0284c7' : '#94a3b8'}
            />

            {/* Azimuth Readout Badge */}
            <g transform="translate(198, 160)">
              <rect
                x="0"
                y="-10"
                width="72"
                height="20"
                rx="6"
                fill={hasAngles ? '#f0f9ff' : '#f8fafc'}
                stroke={hasAngles ? '#bae6fd' : '#cbd5e1'}
                strokeWidth="1.2"
              />
              <text
                x="36"
                y="4"
                fill={hasAngles ? '#0284c7' : '#64748b'}
                fontSize="10"
                fontWeight="extrabold"
                textAnchor="middle"
              >
                Az {azText}
              </text>
            </g>

            {/* Elevation Angle Indicator Line to the Dish */}
            <line
              x1="190"
              y1="45"
              x2="190"
              y2="68"
              stroke={hasAngles ? '#0284c7' : '#94a3b8'}
              strokeWidth="1.5"
              strokeDasharray={hasAngles ? 'none' : '3 3'}
            />
            <line
              x1="190"
              y1="45"
              x2="202"
              y2="45"
              stroke={hasAngles ? '#0284c7' : '#94a3b8'}
              strokeWidth="1.5"
            />

            {/* Elevation Readout Badge */}
            <g transform="translate(205, 45)">
              <rect
                x="0"
                y="-10"
                width="68"
                height="20"
                rx="6"
                fill={hasAngles ? '#f0f9ff' : '#f8fafc'}
                stroke={hasAngles ? '#bae6fd' : '#cbd5e1'}
                strokeWidth="1.2"
              />
              <text
                x="34"
                y="4"
                fill={hasAngles ? '#0284c7' : '#64748b'}
                fontSize="10"
                fontWeight="extrabold"
                textAnchor="middle"
              >
                El {elText}
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}