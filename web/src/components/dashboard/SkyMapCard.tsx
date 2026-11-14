'use client';

import React, { useState } from 'react';
import { AngleCoordinates } from '@shared/types/tracker';
import { Compass, Info, Radio, Satellite } from '@/components/ui/icons';

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
  const [mode, setMode] = useState<'3d' | 'polar' | 'spherical'>('3d');
  const [showTooltip, setShowTooltip] = useState(false);

  // Balanced 360x360 coordinate space with safe padding for labels
  const size = 360;
  const center = size / 2; // 180
  const maxRadius = center - 35; // 145 margin for N, E, S, W labels

  // Convert (Azimuth, Elevation) to 2D coordinates for Polar/Spherical radar
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

  // 3D Orbital Space calculations: map look angles onto 3D orbit trajectory around Earth
  // Earth radius in SVG space: 78px (156px diameter)
  const earthRadius = 78;
  // Orbit trajectory ellipse semi-major and semi-minor axes
  const orbitA = 135;
  const orbitB = 58;
  const orbitTiltDeg = -22; // Incline orbit across view

  // Position of satellite on 3D orbit:
  // Use target azimuth & elevation if available, or orbit parameter
  let sat3dX = center + 105;
  let sat3dY = center - 62;
  if (hasTarget) {
    // Map Azimuth [0..360] around orbit ellipse
    const theta = ((target!.azimuth - 45) * Math.PI) / 180;
    const rawX = orbitA * Math.cos(theta);
    const rawY = orbitB * Math.sin(theta);
    // Rotate by orbit inclination
    const radTilt = (orbitTiltDeg * Math.PI) / 180;
    sat3dX = center + (rawX * Math.cos(radTilt) - rawY * Math.sin(radTilt));
    sat3dY = center + (rawX * Math.sin(radTilt) + rawY * Math.cos(radTilt));
  }

  // Antenna aim position on 3D Earth
  let aim3dX = center + 65;
  let aim3dY = center - 35;
  if (hasCurrent) {
    const thetaAim = ((current!.azimuth - 45) * Math.PI) / 180;
    const rawX = (earthRadius * 0.9) * Math.cos(thetaAim);
    const rawY = (earthRadius * 0.5) * Math.sin(thetaAim);
    const radTilt = (orbitTiltDeg * Math.PI) / 180;
    aim3dX = center + (rawX * Math.cos(radTilt) - rawY * Math.sin(radTilt));
    aim3dY = center + (rawX * Math.sin(radTilt) + rawY * Math.cos(radTilt));
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between h-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
              {mode === '3d' ? '3D Orbital Space View' : 'Topocentric Sky Map'}
            </h2>
            <p className="text-xs text-slate-500">
              {mode === '3d'
                ? 'High-definition 3D Earth orbit trajectory'
                : mode === 'polar'
                ? 'Equidistant polar radar projection'
                : 'Orthographic spherical hemisphere view'}
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
                {mode === '3d'
                  ? '3D geocentric Earth orbital view with real-time satellite footprint beam, cardinal axes, and horizon mask.'
                  : 'Topocentric sky dome view. Outer perimeter is 0° horizon; dashed circle is 10° elevation mask; center is 90° zenith.'}
              </div>
            )}
          </div>
        </div>

        {/* View Mode Toggle (3D Orbit / Polar / Spherical) */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('3d')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === '3d'
                ? 'bg-sky-500 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3D Orbit
          </button>
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

      {/* Main Visual Display */}
      {mode === '3d' ? (
        /* 1. 3D Space & Rotating Earth Orbit View (Matching User Reference Design) */
        <div className="relative w-full h-[320px] sm:h-[350px] rounded-2xl overflow-hidden select-none border border-slate-900/10 shadow-inner flex items-center justify-center">
          {/* High-Resolution Uncompressed Space Starfield Background */}
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center pointer-events-none select-none"
            style={{ backgroundImage: "url('/space-starfield.png')" }}
          />

          {/* Soft Dark Vignette Overlay for Depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/40 pointer-events-none" />

          {/* SVG Orbital Geometry & Cardinal Axes Overlay */}
          <svg
            viewBox={`0 0 ${size} ${size}`}
            preserveAspectRatio="xMidYMid meet"
            className="absolute inset-0 w-full h-full select-none overflow-visible z-10 pointer-events-none"
          >
            <defs>
              {/* Transmission Cone Beam Gradient */}
              <linearGradient id="satBeamGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.05" />
              </linearGradient>

              {/* Glowing Atmosphere Filter */}
              <filter id="atmosphereGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Orbit Inclination Ring Ellipse (Tilted orbit plane) */}
            <ellipse
              cx={center}
              cy={center}
              rx={orbitA}
              ry={orbitB}
              transform={`rotate(${orbitTiltDeg} ${center} ${center})`}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              opacity="0.8"
            />

            {/* 10° Horizon Mask Boundary Ring */}
            <circle
              cx={center}
              cy={center}
              r={earthRadius + 22}
              fill="none"
              stroke="#0284c7"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.5"
            />

            {/* Cardinal Direction Ticks and Labels */}
            {/* North (Top) */}
            <line x1={center} y1={center - earthRadius - 28} x2={center} y2={center - earthRadius - 16} stroke="#38bdf8" strokeWidth="2" />
            <text x={center} y={center - earthRadius - 34} fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle">
              N
            </text>

            {/* South (Bottom) */}
            <line x1={center} y1={center + earthRadius + 16} x2={center} y2={center + earthRadius + 28} stroke="#38bdf8" strokeWidth="2" />
            <text x={center} y={center + earthRadius + 44} fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle">
              S
            </text>

            {/* West (Left) */}
            <line x1={center - orbitA - 12} y1={center} x2={center - orbitA} y2={center} stroke="#38bdf8" strokeWidth="2" />
            <text x={center - orbitA - 20} y={center + 4} fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle">
              W
            </text>

            {/* East (Right) */}
            <line x1={center + orbitA} y1={center} x2={center + orbitA + 12} y2={center} stroke="#38bdf8" strokeWidth="2" />
            <text x={center + orbitA + 22} y={center + 4} fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle">
              E
            </text>

            {/* Satellite Transmission Cone Beam (Footprint onto Earth) */}
            {(hasTarget || true) && (
              <polygon
                points={`${sat3dX},${sat3dY} ${center - 24},${center + 10} ${center + 45},${center + 25}`}
                fill="url(#satBeamGrad)"
                className={isSatelliteUp ? 'animate-pulse' : ''}
              />
            )}

            {/* Antenna Aim Position Vector onto Earth */}
            {hasCurrent && (
              <g transform={`translate(${aim3dX}, ${aim3dY})`}>
                <circle r="7" fill="#38bdf8" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="1.5" />
                <circle r="2.5" fill="#38bdf8" />
              </g>
            )}

            {/* Target Satellite Marker with New Isometric Image */}
            <g transform={`translate(${sat3dX}, ${sat3dY})`}>
              {/* Active Ping Glow if In Sky View */}
              {isSatelliteUp && (
                <circle
                  r="24"
                  fill="#38bdf8"
                  fillOpacity="0.25"
                  className="animate-ping"
                />
              )}

              {/* Satellite Image (Centered on position) */}
              <image
                href="/satellite-isometric.png"
                x="-24"
                y="-18"
                width="48"
                height="36"
                preserveAspectRatio="xMidYMid meet"
                className="filter drop-shadow-[0_4px_12px_rgba(56,189,248,0.6)]"
              />
            </g>

            {/* Offline indicator if disconnected */}
            {!isConnected && (
              <g transform={`translate(${center}, ${center + earthRadius + 4})`}>
                <rect x="-56" y="-12" width="112" height="24" rx="6" fill="#0f172a" fillOpacity="0.8" stroke="#334155" strokeWidth="1" />
                <text x="0" y="4" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle">
                  Tracker Offline
                </text>
              </g>
            )}
          </svg>

          {/* 3D Photorealistic Earth Globe (Centered in space) */}
          <div className="relative z-0 pointer-events-none select-none flex items-center justify-center">
            {/* Glowing Atmosphere Halo behind Earth */}
            <div
              className="absolute rounded-full w-[172px] h-[172px] bg-sky-400/25 blur-xl pointer-events-none"
            />
            {/* High-res 3D Earth Globe Image */}
            <img
              src="/earth-3d.png"
              alt="3D Earth in Orbit"
              className="w-[156px] h-[156px] object-contain drop-shadow-[0_0_25px_rgba(56,189,248,0.45)] pointer-events-none"
            />
          </div>

          {/* Bottom Left Legend (Glassmorphism Pill) */}
          <div className="absolute bottom-3 left-3 z-20 bg-slate-950/70 backdrop-blur-md border border-white/10 px-3 py-2 rounded-xl text-white text-[11px] space-y-1 shadow-lg pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span className="font-semibold text-slate-200">Satellite</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="font-semibold text-slate-200">Antenna Aim</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-[10px]">
              <span className="font-mono">--</span>
              <span>Horizon (10° mask)</span>
            </div>
          </div>

          {/* Bottom Right Floating Look-Angle Readout Card (Matching User Mockup) */}
          <div className="absolute bottom-3 right-3 z-20 bg-slate-950/75 backdrop-blur-md border border-white/10 px-3.5 py-2.5 rounded-xl text-white shadow-xl min-w-[125px] space-y-1.5 pointer-events-none">
            {/* Elevation */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <span className="p-0.5 rounded bg-sky-500/20 text-sky-400 font-mono text-[10px]">El</span>
                <span>Elevation</span>
              </span>
              <span className="font-mono font-extrabold text-white text-sm">
                {hasTarget ? `${target!.elevation.toFixed(1)}°` : '—'}
              </span>
            </div>
            {/* Azimuth */}
            <div className="flex items-center justify-between gap-3 text-xs pt-1 border-t border-white/10">
              <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <span className="p-0.5 rounded bg-sky-500/20 text-sky-400 font-mono text-[10px]">Az</span>
                <span>Azimuth</span>
              </span>
              <span className="font-mono font-extrabold text-white text-sm">
                {hasTarget ? `${target!.azimuth.toFixed(1)}°` : '—'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* 2. Topocentric Polar & Spherical Radar Sky Dome View */
        <div className="relative w-full max-w-[340px] sm:max-w-[360px] aspect-square mx-auto flex items-center justify-center select-none py-1 my-auto">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full select-none overflow-visible"
          >
            {/* Concentric Elevation Circles */}
            {/* 0° Horizon (Outer Boundary) */}
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
              x={center + maskRadius * 0.707 + 4}
              y={center - maskRadius * 0.707 - 2}
              fill="#d97706"
              fontSize="9"
              fontWeight="bold"
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
              y={center - r30 + 11}
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
              y={center - r60 + 11}
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

            {/* Cardinal Crosshair Axes */}
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

            {/* Cardinal Direction Labels */}
            <text
              x={center}
              y={center - maxRadius - 10}
              fill="#0284c7"
              fontSize="13"
              fontWeight="extrabold"
              textAnchor="middle"
            >
              N (0°)
            </text>
            <text
              x={center + maxRadius + 18}
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
              y={center + maxRadius + 18}
              fill="#64748b"
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
            >
              S (180°)
            </text>
            <text
              x={center - maxRadius - 18}
              y={center + 4}
              fill="#64748b"
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
            >
              W (270°)
            </text>

            {/* Offset vector line between Aim and Target */}
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

            {/* Target Satellite Marker with New Isometric Image */}
            {targetPos && (
              <g transform={`translate(${targetPos.x}, ${targetPos.y})`}>
                <circle
                  r="16"
                  fill={isSatelliteUp ? '#0284c7' : '#94a3b8'}
                  fillOpacity="0.2"
                  className={isSatelliteUp ? 'animate-ping' : ''}
                />
                <image
                  href="/satellite-isometric.png"
                  x="-16"
                  y="-12"
                  width="32"
                  height="24"
                  preserveAspectRatio="xMidYMid meet"
                  className="filter drop-shadow-sm select-none"
                />
                <text
                  x="18"
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
                <rect x="-56" y="-13" width="112" height="26" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.06))" />
                <text x="0" y="4" fill="#64748b" fontSize="11" fontWeight="bold" textAnchor="middle">
                  Tracker Offline
                </text>
              </g>
            )}
          </svg>
        </div>
      )}

      {/* Look-Angle Telemetry Strip at Bottom */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
        {/* Target Satellite */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
            Target Angles
          </span>
          <div className="text-xs font-mono font-bold text-slate-800 mt-0.5 truncate">
            {hasTarget ? `El ${target!.elevation.toFixed(1)}° • Az ${target!.azimuth.toFixed(1)}°` : '—'}
          </div>
        </div>

        {/* Antenna Aim */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
            Antenna Aim
          </span>
          <div className="text-xs font-mono font-bold text-slate-800 mt-0.5 truncate">
            {hasCurrent ? `El ${current!.elevation.toFixed(1)}° • Az ${current!.azimuth.toFixed(1)}°` : '—'}
          </div>
        </div>

        {/* Pointing Offset */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
            Pointing Error
          </span>
          <div className="text-xs font-mono font-bold text-sky-700 mt-0.5">
            {angularError !== null ? `Δ ${angularError.toFixed(1)}°` : '—'}
          </div>
        </div>

        {/* Horizon Mask Status */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
            Horizon Status
          </span>
          <div className="text-xs font-bold mt-0.5 flex items-center gap-1.5 truncate">
            <span className={`w-2 h-2 rounded-full ${isSatelliteUp ? 'bg-emerald-500' : 'bg-slate-400'} shrink-0`} />
            <span className={isSatelliteUp ? 'text-emerald-700' : 'text-slate-600'}>
              {isSatelliteUp ? 'In View (>10°)' : 'Below 10°'}
            </span>
          </div>
        </div>
      </div>
      {/* Look-Angle Telemetry Strip at Bottom (Generous horizontal width, no cramped columns) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-xs">
        {/* Target Satellite */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
            Target Angles
          </span>
          <div className="text-xs font-mono font-bold text-slate-800 mt-0.5 truncate">
            {hasTarget ? `El ${target!.elevation.toFixed(1)}° • Az ${target!.azimuth.toFixed(1)}°` : '—'}
          </div>
        </div>

        {/* Antenna Aim */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
            Antenna Aim
          </span>
          <div className="text-xs font-mono font-bold text-slate-800 mt-0.5 truncate">
            {hasCurrent ? `El ${current!.elevation.toFixed(1)}° • Az ${current!.azimuth.toFixed(1)}°` : '—'}
          </div>
        </div>

        {/* Pointing Offset */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
            Pointing Error
          </span>
          <div className="text-xs font-mono font-bold text-sky-700 mt-0.5">
            {angularError !== null ? `Δ ${angularError.toFixed(1)}°` : '—'}
          </div>
        </div>

        {/* Horizon Mask Status */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">
            Horizon Status
          </span>
          <div className="text-xs font-bold mt-0.5 flex items-center gap-1.5 truncate">
            <span className={`w-2 h-2 rounded-full ${isSatelliteUp ? 'bg-emerald-500' : 'bg-slate-400'} shrink-0`} />
            <span className={isSatelliteUp ? 'text-emerald-700' : 'text-slate-600'}>
              {isSatelliteUp ? 'In View (>10°)' : 'Below 10°'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}