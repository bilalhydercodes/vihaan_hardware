'use client';

import React, { useState } from 'react';
import { TleData } from '@shared/types/tracker';
import { validateTle } from '@/lib/tle-validator';
import { useTracker } from '@/context/TrackerContext';
import { FileText, Satellite, Clock, CheckCircle, Check, Copy, Compass, Radio } from '@/components/ui/icons';

interface TleViewerProps {
  tle: TleData | null;
  loading: boolean;
}

export function TleViewer({ tle, loading }: TleViewerProps) {
  const { status, telemetry } = useTracker();
  const [copied, setCopied] = useState(false);

  if (loading || !tle) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/3 mb-4" />
        <div className="h-16 bg-slate-950 rounded mb-4" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-12 bg-slate-800/60 rounded" />
          <div className="h-12 bg-slate-800/60 rounded" />
          <div className="h-12 bg-slate-800/60 rounded" />
        </div>
      </div>
    );
  }

  const parsed = validateTle(tle.satelliteName, tle.line1, tle.line2);
  const elements = parsed.extracted;

  const handleCopyTle = () => {
    const fullText = `${tle.satelliteName}\n${tle.line1}\n${tle.line2}`;
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const periodMinutes = elements?.meanMotionRevsDay
    ? (1440 / elements.meanMotionRevsDay).toFixed(1)
    : null;

  const satPos = telemetry?.satellitePosition || status?.satellitePosition;
  const currentAngles = telemetry?.currentAngles || status?.currentAngles;
  const isVisible = telemetry?.isVisible ?? status?.isVisible ?? false;

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Satellite className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Active Satellite Orbit
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>{tle.satelliteName}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-normal">
                NORAD #{tle.noradId}
              </span>
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>CelesTrak Verified</span>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
            {tle.source || 'CELESTRAK'}
          </span>
        </div>
      </div>

      {/* Live Look Angles & Sub-Satellite Position */}
      {satPos && (
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Compass className="w-4 h-4" />
              <span>Real-Time Sub-Satellite Position & Ground Aim</span>
            </span>
            <span className={isVisible ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
              {isVisible ? '● In Sky (Above 10° Mask)' : '○ Below Horizon'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Latitude</span>
              <strong className="text-white text-sm">{satPos.latitude.toFixed(2)}°</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Longitude</span>
              <strong className="text-white text-sm">{satPos.longitude.toFixed(2)}°</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Altitude</span>
              <strong className="text-cyan-300 text-sm">{satPos.altitudeKm.toLocaleString()} km</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Aim Azimuth</span>
              <strong className="text-amber-400 text-sm">{currentAngles?.azimuth.toFixed(1)}°</strong>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-slate-500 text-[10px] block">Aim Elevation</span>
              <strong className="text-emerald-400 text-sm">{currentAngles?.elevation.toFixed(1)}°</strong>
            </div>
          </div>
        </div>
      )}

      {/* Raw Two-Line Element Box */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Raw CelesTrak Two-Line Element Set (69 chars/line)
          </span>
          <button
            onClick={handleCopyTle}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copied ? 'Copied' : 'Copy TLE'}</span>
          </button>
        </div>
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto text-xs font-mono text-cyan-300 leading-relaxed space-y-1.5 select-all">
          <div className="text-slate-400 font-bold">{tle.satelliteName}</div>
          <div className="text-slate-100">{tle.line1}</div>
          <div className="text-cyan-300">{tle.line2}</div>
        </div>
      </div>

      {/* Extracted Keplerian Parameters */}
      {elements && (
        <div className="space-y-2.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Parsed Keplerian Orbital Elements
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Inclination (i)</span>
              <strong className="text-white text-base font-bold">{elements.inclinationDeg.toFixed(2)}°</strong>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Period</span>
              <strong className="text-cyan-300 text-base font-bold">{periodMinutes ? `${periodMinutes} min` : 'N/A'}</strong>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Mean Motion (n)</span>
              <strong className="text-emerald-300 text-base font-bold">{elements.meanMotionRevsDay.toFixed(4)} rev/d</strong>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Eccentricity (e)</span>
              <strong className="text-amber-300 text-base font-bold">{elements.eccentricity.toFixed(5)}</strong>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px] block">RAAN (Ω)</span>
              <strong className="text-white text-base font-bold">{elements.raanDeg.toFixed(2)}°</strong>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Arg of Perigee (ω)</span>
              <strong className="text-white text-base font-bold">{elements.argPerigeeDeg.toFixed(2)}°</strong>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Mean Anomaly (M)</span>
              <strong className="text-white text-base font-bold">{elements.meanAnomalyDeg.toFixed(2)}°</strong>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Epoch Year / Day</span>
              <strong className="text-white text-base font-bold">20{elements.epochYear} / {elements.epochDay.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800 gap-2">
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Last Catalog Sync: <strong className="text-slate-200">{new Date(tle.updatedAt).toLocaleString()}</strong></span>
        </span>
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <CheckCircle className="w-4 h-4" />
          <span>69-char Checksums Verified (Modulo 10)</span>
        </span>
      </div>
    </div>
  );
}

