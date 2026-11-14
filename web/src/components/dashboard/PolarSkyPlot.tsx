'use client';

import React from 'react';
import { AngleCoordinates } from '@shared/types/tracker';

interface PolarSkyPlotProps {
  current: AngleCoordinates;
  target: AngleCoordinates;
  satelliteName?: string | null;
  state: string;
}

function PolarSkyPlotComponent({ current, target, satelliteName, state }: PolarSkyPlotProps) {
  const size = 340;
  const center = size / 2;
  const maxRadius = center - 28; // Leave margin for labels (N, E, S, W)

  // Convert (Azimuth, Elevation) to polar (x, y) coordinates on canvas/SVG
  // Azimuth 0 = North (Up, -Y), 90 = East (+X), 180 = South (+Y), 270 = West (-X)
  // Elevation 90 = Center (radius = 0), Elevation 0 = Outer Ring (radius = maxRadius)
  const toXY = (az: number, el: number) => {
    const clampedEl = Math.max(0, Math.min(90, el));
    const r = maxRadius * (1 - clampedEl / 90.0);
    const azRad = (az - 90) * (Math.PI / 180.0); // Offset so 0 deg is top (North)
    const x = center + r * Math.cos(azRad);
    const y = center + r * Math.sin(azRad);
    return { x, y };
  };

  const currentPos = toXY(current.azimuth, current.elevation);
  const targetPos = toXY(target.azimuth, target.elevation);

  return (
    <div className="flex flex-col items-center bg-slate-900/60 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
      <div className="w-full flex items-center justify-between mb-3 text-xs font-mono">
        <span className="text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Polar Sky Plot (Topocentric)
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
          Center = Zenith (90° El)
        </span>
      </div>

      <div className="relative">
        <svg width={size} height={size} className="select-none overflow-visible">
          {/* Radial Gradient Glow in Center */}
          <defs>
            <radialGradient id="skyGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={center} cy={center} r={maxRadius} fill="url(#skyGlow)" />

          {/* Elevation Concentric Circles (0°, 30°, 60°) */}
          {[0, 30, 60].map((el) => {
            const r = maxRadius * (1 - el / 90.0);
            return (
              <g key={el}>
                <circle
                  cx={center}
                  cy={center}
                  r={r}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray={el === 0 ? 'none' : '3 3'}
                />
                <text
                  x={center + 4}
                  y={center - r + 10}
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {el}°
                </text>
              </g>
            );
          })}

          {/* Cardinal Axis Lines */}
          <line x1={center} y1={center - maxRadius} x2={center} y2={center + maxRadius} stroke="#1e293b" strokeWidth="1.5" />
          <line x1={center - maxRadius} y1={center} x2={center + maxRadius} y2={center} stroke="#1e293b" strokeWidth="1.5" />

          {/* Diagonal Guides (45°, 135°, 225°, 315°) */}
          <line
            x1={center - maxRadius * 0.707}
            y1={center - maxRadius * 0.707}
            x2={center + maxRadius * 0.707}
            y2={center + maxRadius * 0.707}
            stroke="#1e293b"
            strokeWidth="0.8"
            strokeDasharray="2 4"
          />
          <line
            x1={center - maxRadius * 0.707}
            y1={center + maxRadius * 0.707}
            x2={center + maxRadius * 0.707}
            y2={center - maxRadius * 0.707}
            stroke="#1e293b"
            strokeWidth="0.8"
            strokeDasharray="2 4"
          />

          {/* Cardinal Direction Labels */}
          <text x={center} y={center - maxRadius - 8} fill="#38bdf8" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">N (0°)</text>
          <text x={center + maxRadius + 16} y={center + 4} fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="monospace">E (90°)</text>
          <text x={center} y={center + maxRadius + 18} fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="monospace">S (180°)</text>
          <text x={center - maxRadius - 16} y={center + 4} fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="monospace">W (270°)</text>

          {/* Line Connecting Current to Target */}
          <line
            x1={currentPos.x}
            y1={currentPos.y}
            x2={targetPos.x}
            y2={targetPos.y}
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.7"
          />

          {/* Commanded Target Satellite Marker */}
          <g transform={`translate(${targetPos.x}, ${targetPos.y})`}>
            <circle r="7" fill="#f59e0b" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1.5" />
            <circle r="2" fill="#f59e0b" />
            <text x="9" y="-4" fill="#fbbf24" fontSize="10" fontFamily="monospace" fontWeight="bold">
              {satelliteName ? satelliteName.split(' ')[0] : 'TARGET'}
            </text>
            <text x="9" y="7" fill="#f59e0b" fontSize="8" fontFamily="monospace">
              {target.azimuth.toFixed(1)}°, {target.elevation.toFixed(1)}°
            </text>
          </g>

          {/* Current Mount Beam Orientation Marker */}
          <g transform={`translate(${currentPos.x}, ${currentPos.y})`}>
            {/* Outer radar reticle ring */}
            <circle r="12" fill="#06b6d4" fillOpacity="0.15" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="3 2" />
            {/* Antenna beam boresight crosshair */}
            <line x1="-6" y1="0" x2="6" y2="0" stroke="#38bdf8" strokeWidth="1.5" />
            <line x1="0" y1="-6" x2="0" y2="6" stroke="#38bdf8" strokeWidth="1.5" />
            <circle r="3" fill="#38bdf8" />
            <text x="-8" y="-12" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="end">
              MOUNT
            </text>
          </g>
        </svg>
      </div>

      <div className="w-full flex items-center justify-between mt-3 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 border border-cyan-300" />
          <span>Mount Beam: <strong className="text-white">{current.azimuth.toFixed(1)}° / {current.elevation.toFixed(1)}°</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-300" />
          <span>Target: <strong className="text-amber-300">{target.azimuth.toFixed(1)}° / {target.elevation.toFixed(1)}°</strong></span>
        </div>
      </div>
    </div>
  );
}

export const PolarSkyPlot = React.memo(PolarSkyPlotComponent);

