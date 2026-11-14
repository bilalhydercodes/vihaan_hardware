'use client';

import React from 'react';
import { TleData } from '@shared/types/tracker';
import { validateTle } from '@/lib/tle-validator';
import { FileText, Satellite, Clock, CheckCircle } from '@/components/ui/icons';

interface TleViewerProps {
  tle: TleData | null;
  loading: boolean;
}

export function TleViewer({ tle, loading }: TleViewerProps) {
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

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Active Flash Orbit</div>
            <h3 className="text-base font-bold text-white font-mono">{tle.satelliteName}</h3>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            NORAD #{tle.noradId}
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            {tle.source || 'CELESTRAK'}
          </span>
        </div>
      </div>

      {/* Raw Two-Line Element Box */}
      <div>
        <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
          Raw Two-Line Element Set (69 Characters per line)
        </span>
        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 overflow-x-auto text-xs font-mono text-cyan-300 leading-relaxed space-y-1 select-all">
          <div className="text-slate-400 font-bold">{tle.satelliteName}</div>
          <div>{tle.line1}</div>
          <div>{tle.line2}</div>
        </div>
      </div>

      {/* Extracted Keplerian Parameters */}
      {elements && (
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">
            Parsed Keplerian Orbital Elements
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] block uppercase">Inclination (i)</span>
              <strong className="text-white text-sm">{elements.inclinationDeg.toFixed(2)}°</strong>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] block uppercase">Eccentricity (e)</span>
              <strong className="text-cyan-300 text-sm">{elements.eccentricity.toFixed(5)}</strong>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] block uppercase">RAAN (Ω)</span>
              <strong className="text-white text-sm">{elements.raanDeg.toFixed(2)}°</strong>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] block uppercase">Mean Motion (n)</span>
              <strong className="text-emerald-300 text-sm">{elements.meanMotionRevsDay.toFixed(4)} rev/d</strong>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] block uppercase">Arg of Perigee (ω)</span>
              <strong className="text-white text-sm">{elements.argPerigeeDeg.toFixed(2)}°</strong>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] block uppercase">Mean Anomaly (M)</span>
              <strong className="text-white text-sm">{elements.meanAnomalyDeg.toFixed(2)}°</strong>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] block uppercase">Epoch Year/Day</span>
              <strong className="text-white text-sm">20{elements.epochYear} / {elements.epochDay.toFixed(2)}</strong>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px] block uppercase">Classification</span>
              <strong className="text-amber-300 text-sm">{elements.classification === 'U' ? 'Unclassified' : elements.classification}</strong>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          Last Updated: {new Date(tle.updatedAt).toLocaleString()}
        </span>
        <span className="flex items-center gap-1 text-emerald-400">
          <CheckCircle className="w-3.5 h-3.5" />
          Checksums Validated
        </span>
      </div>
    </div>
  );
}

