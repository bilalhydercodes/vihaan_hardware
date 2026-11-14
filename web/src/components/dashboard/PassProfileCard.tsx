'use client';

import React, { useState } from 'react';
import { SatellitePass } from '@shared/types/tracker';
import { TrendingUp, Info, Calendar, WifiOff } from '@/components/ui/icons';

interface PassProfileCardProps {
  pass: SatellitePass | null;
  loading?: boolean;
  isConnected: boolean;
}

export function PassProfileCard({ pass, loading, isConnected }: PassProfileCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const width = 340;
  const height = 180;
  const paddingLeft = 40;
  const paddingBottom = 28;
  const paddingTop = 15;
  const paddingRight = 15;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Y-axis levels: 0, 30, 60, 90
  const yLevels = [90, 60, 30, 0];

  const getY = (el: number) => {
    return paddingTop + chartHeight * (1 - el / 90.0);
  };

  const hasRealPass = isConnected && pass && pass.maxElevation > 0;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-slate-900 text-base">Pass Profile (Next Pass)</h2>
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
                Predicted antenna elevation curve over time during the next satellite pass.
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

      {/* Chart Canvas */}
      <div className="relative w-full rounded-xl overflow-hidden my-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto block select-none">
          <defs>
            <linearGradient id="passCurveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="emptyArcGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Y Axis Label (Elevation) */}
          <text
            x={10}
            y={height / 2 - 5}
            transform={`rotate(-90, 10, ${height / 2 - 5})`}
            fill="#64748b"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
          >
            Elevation
          </text>

          {/* Y Gridlines and Labels */}
          {yLevels.map((lvl) => {
            const y = getY(lvl);
            return (
              <g key={lvl}>
                <text
                  x={paddingLeft - 6}
                  y={y + 3.5}
                  fill="#64748b"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="end"
                >
                  {lvl}°
                </text>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
              </g>
            );
          })}

          {/* Left Y-axis border line */}
          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={paddingTop + chartHeight}
            stroke="#94a3b8"
            strokeWidth="1.2"
          />

          {/* X Axis Label */}
          <text
            x={paddingLeft + chartWidth / 2}
            y={height - 6}
            fill="#64748b"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
          >
            Time (UTC)
          </text>

          {/* Pass data or Empty state */}
          {hasRealPass ? (
            <g>
              {(() => {
                const maxEl = Math.min(90, pass.maxElevation);
                const peakY = getY(maxEl);
                const baseY = getY(0);
                const startX = paddingLeft + chartWidth * 0.15;
                const endX = paddingLeft + chartWidth * 0.85;
                const midX = (startX + endX) / 2;

                const pathD = `M ${startX},${baseY} Q ${midX},${peakY} ${endX},${baseY}`;
                const areaD = `${pathD} L ${endX},${baseY} L ${startX},${baseY} Z`;

                return (
                  <>
                    <path d={areaD} fill="url(#passCurveGradient)" />
                    <path d={pathD} fill="none" stroke="#0284c7" strokeWidth="2.5" />
                    <circle cx={midX} cy={peakY} r="4" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                    <text
                      x={midX}
                      y={peakY - 7}
                      fill="#0284c7"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {maxEl.toFixed(0)}° Max
                    </text>
                  </>
                );
              })()}
            </g>
          ) : (
            <g>
              <path
                d={`M ${paddingLeft},${getY(0)} Q ${paddingLeft + chartWidth / 2},${getY(60)} ${width - paddingRight},${getY(0)}`}
                fill="url(#emptyArcGradient)"
                stroke="#bae6fd"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>

        {/* Empty state overlay message */}
        {!hasRealPass && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-4">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-500 mb-1">
              {!isConnected ? <WifiOff className="w-5 h-5 text-slate-400" /> : <Calendar className="w-5 h-5 text-slate-500" />}
            </div>
            <div className="text-xs font-bold text-slate-800">
              {!isConnected ? 'Tracker Offline' : 'No visible pass'}
            </div>
            <div className="text-[11px] text-slate-500">
              {!isConnected ? 'Connect tracker to predict passes' : 'in next 48 hours'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
