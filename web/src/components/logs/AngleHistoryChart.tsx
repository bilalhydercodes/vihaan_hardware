'use client';

import React, { useState, useMemo } from 'react';
import { TelemetryLogEntry } from '@shared/types/tracker';
import { Activity, Compass, Radio } from '@/components/ui/icons';

interface AngleHistoryChartProps {
  logs: TelemetryLogEntry[];
}

function AngleHistoryChartComponent({ logs }: AngleHistoryChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Take the most recent 60 data points for clarity
  const data = logs.slice(-60);

  const width = 800;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Max angle is 360 deg
  const maxAngle = 360;
  const minAngle = 0;

  const getX = (idx: number) => padding.left + (idx / Math.max(1, data.length - 1)) * plotWidth;
  const getY = (val: number) => padding.top + plotHeight - ((val - minAngle) / (maxAngle - minAngle)) * plotHeight;

  // Generate SVG path strings memoized (MUST be called before any early return)
  const { actualAzPath, cmdAzPath, actualElPath, cmdElPath } = useMemo(() => {
    if (data.length < 2) {
      return { actualAzPath: '', cmdAzPath: '', actualElPath: '', cmdElPath: '' };
    }
    return {
      actualAzPath: data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.actualAzimuth)}`).join(' '),
      cmdAzPath: data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.commandedAzimuth)}`).join(' '),
      actualElPath: data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.actualElevation)}`).join(' '),
      cmdElPath: data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.commandedElevation)}`).join(' ')
    };
  }, [data]);

  if (data.length < 2) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 font-mono text-xs h-64">
        <Activity className="w-8 h-8 text-cyan-400 mb-2 animate-pulse" />
        <span>Accumulating telemetry stream... (Need at least 2 log points)</span>
      </div>
    );
  }

  const hoveredPoint = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-base font-bold text-white">
              Antenna Aim Accuracy Over Time
            </h3>
            <p className="text-xs text-slate-400">Shows commanded satellite position vs where the antenna actually pointed.</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 bg-cyan-400 rounded-full" />
            <span className="text-slate-200">Actual Left/Right</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b-2 border-dashed border-amber-400" />
            <span className="text-amber-300">Target Left/Right</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 bg-emerald-400 rounded-full" />
            <span className="text-slate-200">Actual Up/Down</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b-2 border-dashed border-amber-400" />
            <span className="text-amber-300">Target Up/Down</span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible font-mono text-[9px]"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Background Grid Lines */}
          {[0, 90, 180, 270, 360].map((deg) => {
            const y = getY(deg);
            return (
              <g key={deg}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <text x={padding.left - 6} y={y + 3} textAnchor="end" fill="#64748b">
                  {deg}°
                </text>
              </g>
            );
          })}

          {/* Commanded Azimuth (Dashed Amber) */}
          <path
            d={cmdAzPath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.8"
          />

          {/* Actual Azimuth (Solid Cyan) */}
          <path
            d={actualAzPath}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Commanded Elevation (Dashed Amber) */}
          <path
            d={cmdElPath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.8"
          />

          {/* Actual Elevation (Solid Emerald) */}
          <path
            d={actualElPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Invisible Overlay Rectangles for Hover Detection */}
          {data.map((_, idx) => {
            const x = getX(idx);
            const w = plotWidth / (data.length - 1);
            return (
              <rect
                key={idx}
                x={x - w / 2}
                y={padding.top}
                width={w}
                height={plotHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
              />
            );
          })}

          {/* Hover Indicator Crosshair */}
          {hoveredIdx !== null && (
            <g>
              <line
                x1={getX(hoveredIdx)}
                y1={padding.top}
                x2={getX(hoveredIdx)}
                y2={padding.top + plotHeight}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx={getX(hoveredIdx)} cy={getY(data[hoveredIdx].actualAzimuth)} r="4" fill="#06b6d4" />
              <circle cx={getX(hoveredIdx)} cy={getY(data[hoveredIdx].actualElevation)} r="4" fill="#10b981" />
            </g>
          )}

          {/* Time axis labels */}
          <text x={padding.left} y={height - 8} fill="#64748b" textAnchor="start">
            {new Date(data[0].timestamp).toLocaleTimeString()}
          </text>
          <text x={width - padding.right} y={height - 8} fill="#64748b" textAnchor="end">
            {new Date(data[data.length - 1].timestamp).toLocaleTimeString()}
          </text>
        </svg>
      </div>

      {/* Hover Info Tooltip Bar */}
      {hoveredPoint ? (
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between text-xs font-mono">
          <span className="text-slate-400">
            Time: <strong className="text-white">{new Date(hoveredPoint.timestamp).toLocaleTimeString()}</strong>
          </span>
          <span className="text-cyan-300">
            Az: <strong>{hoveredPoint.actualAzimuth.toFixed(2)}°</strong> (Cmd: {hoveredPoint.commandedAzimuth.toFixed(2)}°)
          </span>
          <span className="text-emerald-300">
            El: <strong>{hoveredPoint.actualElevation.toFixed(2)}°</strong> (Cmd: {hoveredPoint.commandedElevation.toFixed(2)}°)
          </span>
          <span className="text-amber-300">
            Error: <strong>{hoveredPoint.trackingErrorDeg.toFixed(2)}°</strong>
          </span>
          <span className="text-slate-400 uppercase">
            State: <strong className="text-white">{hoveredPoint.state}</strong>
          </span>
        </div>
      ) : (
        <div className="text-[11px] font-mono text-slate-500 text-center py-1">
          Hover over the chart to inspect discrete telemetry frames
        </div>
      )}
    </div>
  );
}

export const AngleHistoryChart = React.memo(AngleHistoryChartComponent);

