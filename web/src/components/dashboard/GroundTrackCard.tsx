'use client';

import React, { useState } from 'react';
import { Map, Info } from '@/components/ui/icons';

interface GroundTrackCardProps {
  satPos?: {
    latitude: number;
    longitude: number;
    altitudeKm: number;
  } | null;
  satelliteName?: string | null;
  isConnected: boolean;
}

export function GroundTrackCard({ satPos, satelliteName, isConnected }: GroundTrackCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const width = 360;
  const height = 180;

  // Convert (lat, lon) to SVG (x, y) in Equirectangular projection
  const toMapXY = (longitude: number, latitude: number) => {
    const x = ((longitude + 180) / 360) * width;
    const y = ((90 - latitude) / 180) * height;
    return { x, y };
  };

  const hasRealPos = isConnected && satPos !== null && satPos !== undefined;
  const lat = hasRealPos ? satPos!.latitude : null;
  const lon = hasRealPos ? satPos!.longitude : null;

  const currentPoint = hasRealPos ? toMapXY(lon!, lat!) : null;

  // Calculate sinusoidal orbit curve passing through (lon, lat) ONLY if real coordinates are present
  let orbitD = '';
  if (hasRealPos) {
    const inclination = Math.abs(lat!) > 40 ? 82 : 55;
    const orbitPathPoints: string[] = [];
    for (let x = 0; x <= width; x += 4) {
      const l = (x / width) * 360 - 180;
      const phase = ((lon! + 180) / 360) * (2 * Math.PI) - Math.asin(Math.max(-0.99, Math.min(0.99, lat! / inclination)));
      const yLat = inclination * Math.sin(((l + 180) / 360) * (2 * Math.PI) - phase);
      const { y } = toMapXY(l, yLat);
      orbitPathPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    orbitD = `M ${orbitPathPoints.join(' L ')}`;
  }

  // Solar night terminator based on real current UTC hour
  const now = new Date();
  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  const sunLon = -((utcHour - 12) * 15);
  const nightCenterLon = ((sunLon + 180 + 180) % 360) - 180;
  const nightCenterX = ((nightCenterLon + 180) / 360) * width;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
            <Map className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-slate-900 text-base">Ground Track</h2>
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
                Real-time sub-satellite position and orbital track across the world.
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

      {/* World Map Container */}
      <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-[#edf5fd] my-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block select-none">
          <defs>
            <linearGradient id="nightTerminator" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" stopOpacity="0.0" />
              <stop offset="25%" stopColor="#334155" stopOpacity="0.25" />
              <stop offset="75%" stopColor="#334155" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#475569" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Oceans Background */}
          <rect width={width} height={height} fill="#eaf2fa" />

          {/* Latitude & Longitude Subtle Grid */}
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="3 3" />
          <line x1={width / 2} y1="0" x2={width / 2} y2={height} stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="3 3" />

          {/* Continent Outlines */}
          <g fill="#cbd5e1" stroke="#b4c2d3" strokeWidth="0.6">
            <path d="M 30,22 Q 45,15 75,18 Q 110,25 105,45 Q 95,65 80,75 Q 65,85 55,75 Q 40,65 30,50 Z" />
            <path d="M 120,12 Q 135,10 142,20 Q 138,32 125,28 Z" />
            <path d="M 85,85 Q 110,88 120,105 Q 115,135 95,155 Q 85,150 82,125 Q 75,100 85,85 Z" />
            <path d="M 160,30 Q 190,26 200,45 Q 190,55 170,55 Q 160,45 160,30 Z" />
            <path d="M 165,60 Q 200,60 210,80 Q 215,115 195,135 Q 175,125 168,95 Q 160,75 165,60 Z" />
            <path d="M 205,25 Q 260,20 310,35 Q 320,65 290,85 Q 260,85 240,75 Q 215,60 205,25 Z" />
            <path d="M 235,68 Q 248,72 250,88 Q 242,98 236,88 Z" />
            <path d="M 285,115 Q 320,110 325,135 Q 305,150 285,140 Z" />
            <path d="M 260,95 Q 285,98 280,105 Q 260,102 260,95 Z" />
          </g>

          {/* Real Solar Night Shadow (terminator overlay) */}
          <path
            d={`M ${Math.max(0, nightCenterX - 75)},0 Q ${nightCenterX},${height / 2} ${Math.max(0, nightCenterX - 75)},${height} L ${Math.min(width, nightCenterX + 75)},${height} Q ${nightCenterX},${height / 2} ${Math.min(width, nightCenterX + 75)},0 Z`}
            fill="url(#nightTerminator)"
          />

          {/* Real Orbit Ground Track Curve (only if connected with real coords) */}
          {hasRealPos && orbitD && (
            <path
              d={orbitD}
              fill="none"
              stroke="#0284c7"
              strokeWidth="1.8"
              strokeDasharray="4 2"
            />
          )}

          {/* Real Sub-Satellite Point Marker (only if connected with real coords) */}
          {hasRealPos && currentPoint && (
            <g transform={`translate(${currentPoint.x}, ${currentPoint.y})`}>
              <circle r="7" fill="none" stroke="#0284c7" strokeWidth="2" />
              <circle r="3" fill="#0284c7" />
            </g>
          )}
        </svg>

        {/* Informative offline overlay if not connected */}
        {!hasRealPos && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none bg-slate-900/5 p-4 text-center">
            <span className="text-xs font-bold text-slate-700">Sub-Satellite Position Offline</span>
            <span className="text-[11px] text-slate-500">Connect tracker to receive live orbital track</span>
          </div>
        )}
      </div>

      {/* Legend at bottom */}
      <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500 font-medium">
        <div className="flex items-center gap-1.5">
          <span className={`w-4 h-0.5 ${hasRealPos ? 'bg-sky-600' : 'bg-slate-300'} inline-block`} />
          <span>Orbit (ground track)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full border ${hasRealPos ? 'border-sky-600' : 'border-slate-300'} inline-block`} />
          <span>Satellite (current)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2.5 rounded-xs bg-slate-400/50 inline-block" />
          <span>Night (shadow)</span>
        </div>
      </div>
    </div>
  );
}
