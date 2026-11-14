'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { AngleCoordinates } from '@shared/types/tracker';
import { Target, Info, Navigation } from '@/components/ui/icons';

interface AntennaPointingCardProps {
  current: AngleCoordinates | null;
  target?: AngleCoordinates | null;
  isConnected: boolean;
}

export function AntennaPointingCard({ current, target, isConnected }: AntennaPointingCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Only display values if connected and current angles exist
  const hasAngles = isConnected && current !== null && current !== undefined;
  const azText = hasAngles ? `${current.azimuth.toFixed(1)}°` : '—';
  const elText = hasAngles ? `${current.elevation.toFixed(1)}°` : '—';

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
            <Target className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-slate-900 text-base">Antenna Pointing</h2>
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
                Real-time motor pointing angles and 3D rotator attitude representation.
              </div>
            )}
          </div>
        </div>

        {!isConnected && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
            Offline
          </span>
        )}
      </div>

      {/* Top 2 Stat Boxes */}
      <div className="grid grid-cols-2 gap-3 mb-2">
        {/* Azimuth Box */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <Navigation className="w-4 h-4 -rotate-45" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">Azimuth</div>
            <div className="text-xl font-extrabold text-slate-900 leading-tight">
              {azText}
            </div>
          </div>
        </div>

        {/* Elevation Box */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h16" />
              <path d="m4 20 12-12" />
              <path d="M12 20a8 8 0 0 0-4-7" />
            </svg>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-500">Elevation</div>
            <div className="text-xl font-extrabold text-slate-900 leading-tight">
              {elText}
            </div>
          </div>
        </div>
      </div>

      {/* Antenna Dish PNG with Dynamic Overlay Indicators */}
      <div className="relative w-full flex items-center justify-center py-2 select-none">
        <div className="relative w-[240px] h-[160px] flex items-center justify-center">
          {/* Real Antenna Dish PNG */}
          <div className="relative w-[150px] h-[130px] flex items-center justify-center">
            <Image
              src="/antenna-dish.png"
              alt="Antenna Dish Rotator"
              width={150}
              height={130}
              className={`object-contain drop-shadow-md select-none pointer-events-none transition-opacity ${
                hasAngles ? 'opacity-100' : 'opacity-70'
              }`}
              priority
            />
          </div>

          {/* SVG Overlay for Real Indicators */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            viewBox="0 0 240 160"
          >
            {/* Azimuth Rotation Curved Arrow around the base */}
            <path
              d="M 68,144 A 42,12 0 0,0 156,144"
              fill="none"
              stroke={hasAngles ? '#0284c7' : '#94a3b8'}
              strokeWidth="1.8"
              strokeDasharray={hasAngles ? 'none' : '3 3'}
            />
            {/* Arrowhead */}
            <polygon
              points="155,140 162,145 154,148"
              fill={hasAngles ? '#0284c7' : '#94a3b8'}
            />

            {/* Azimuth Readout Badge */}
            <g transform="translate(158, 146)">
              <rect
                x="0"
                y="-9"
                width="64"
                height="18"
                rx="5"
                fill={hasAngles ? '#f0f9ff' : '#f8fafc'}
                stroke={hasAngles ? '#bae6fd' : '#e2e8f0'}
                strokeWidth="1"
              />
              <text
                x="32"
                y="3.5"
                fill={hasAngles ? '#0284c7' : '#64748b'}
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
              >
                Az {azText}
              </text>
            </g>

            {/* Elevation Angle Indicator Line to the Dish */}
            <line
              x1="168"
              y1="48"
              x2="168"
              y2="68"
              stroke={hasAngles ? '#0284c7' : '#94a3b8'}
              strokeWidth="1.2"
              strokeDasharray={hasAngles ? 'none' : '3 3'}
            />
            <line
              x1="168"
              y1="48"
              x2="176"
              y2="48"
              stroke={hasAngles ? '#0284c7' : '#94a3b8'}
              strokeWidth="1.2"
            />

            {/* Elevation Readout Badge */}
            <g transform="translate(178, 48)">
              <rect
                x="0"
                y="-9"
                width="60"
                height="18"
                rx="5"
                fill={hasAngles ? '#f0f9ff' : '#f8fafc'}
                stroke={hasAngles ? '#bae6fd' : '#e2e8f0'}
                strokeWidth="1"
              />
              <text
                x="30"
                y="3.5"
                fill={hasAngles ? '#0284c7' : '#64748b'}
                fontSize="10"
                fontWeight="bold"
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
