'use client';

import React from 'react';
import Link from 'next/link';
import { SatellitePass } from '@shared/types/tracker';
import { Calendar, List, Info, Clock, ExternalLink } from '@/components/ui/icons';

interface UpcomingPassesCardProps {
  pass: SatellitePass | null;
  loading?: boolean;
  isConnected: boolean;
}

export function UpcomingPassesCard({ pass, loading, isConnected }: UpcomingPassesCardProps) {
  const hasPass = isConnected && pass && pass.maxElevation > 0;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-lg tracking-tight">Pass Schedule</h2>
            <p className="text-xs text-slate-500">Upcoming visibility windows & look angles</p>
          </div>
        </div>

        {!isConnected ? (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
            Offline
          </span>
        ) : (
          <Link
            href="/tle"
            className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>TLE Ephemeris</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Next Pass Spotlight Banner */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 mb-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-900 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            Next Visibility Window
          </span>
          {hasPass && (
            <span className="px-2 py-0.5 rounded-full bg-sky-100/80 text-sky-700 font-extrabold text-[10px]">
              Peak {pass.maxElevation.toFixed(0)}°
            </span>
          )}
        </div>

        <div className="text-xs text-slate-600">
          {!isConnected ? (
            <p className="text-slate-500">Connect tracker to compute look-angle ephemeris and pass schedule.</p>
          ) : loading ? (
            <p className="text-sky-600 font-medium">Computing SGP4 trajectory...</p>
          ) : hasPass ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
              <div>
                <span className="font-extrabold text-slate-900 block text-sm">
                  {new Date(pass.aos).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(pass.aos).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
                </span>
                <span className="text-[11px] text-slate-500">
                  Duration: ~{Math.round(pass.durationSeconds / 60)} minutes &bull; Peak elevation: {pass.maxElevation.toFixed(0)}°
                </span>
              </div>
              <div className="text-right sm:border-l sm:border-slate-200 sm:pl-3 shrink-0">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Window Closes</span>
                <span className="font-mono font-bold text-slate-800 text-xs">
                  {new Date(pass.los).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-500">No pass above 10° elevation predicted in the next 48 hours for this location.</p>
          )}
        </div>
      </div>

      {/* Passes Table */}
      <div className="w-full overflow-x-auto my-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold">
              <th className="py-2 px-2.5 w-8">#</th>
              <th className="py-2 px-2.5">AOS (UTC)</th>
              <th className="py-2 px-2.5">LOS (UTC)</th>
              <th className="py-2 px-2.5 text-center">Peak El.</th>
              <th className="py-2 px-2.5 text-right">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {hasPass ? (
              <>
                <tr className="bg-sky-50/50 hover:bg-sky-50 transition-colors">
                  <td className="py-2.5 px-2.5 font-bold text-sky-700">1</td>
                  <td className="py-2.5 px-2.5 font-bold text-slate-900">
                    {new Date(pass.aos).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-2.5 text-slate-600">
                    {new Date(pass.los).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-2.5 text-center font-extrabold text-sky-600">
                    {pass.maxElevation.toFixed(0)}°
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-semibold text-slate-600">
                    {Math.round(pass.durationSeconds / 60)} min
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80 transition-colors text-slate-400">
                  <td className="py-2.5 px-2.5 font-bold text-slate-500">2</td>
                  <td className="py-2.5 px-2.5">—</td>
                  <td className="py-2.5 px-2.5">—</td>
                  <td className="py-2.5 px-2.5 text-center">—</td>
                  <td className="py-2.5 px-2.5 text-right">—</td>
                </tr>
                <tr className="hover:bg-slate-50/80 transition-colors text-slate-400">
                  <td className="py-2.5 px-2.5 font-bold text-slate-500">3</td>
                  <td className="py-2.5 px-2.5">—</td>
                  <td className="py-2.5 px-2.5">—</td>
                  <td className="py-2.5 px-2.5 text-center">—</td>
                  <td className="py-2.5 px-2.5 text-right">—</td>
                </tr>
              </>
            ) : (
              [1, 2, 3].map((rowNum) => (
                <tr key={rowNum} className="hover:bg-slate-50/80 transition-colors text-slate-400">
                  <td className="py-2.5 px-2.5 font-bold text-slate-500">{rowNum}</td>
                  <td className="py-2.5 px-2.5">—</td>
                  <td className="py-2.5 px-2.5">—</td>
                  <td className="py-2.5 px-2.5 text-center">—</td>
                  <td className="py-2.5 px-2.5 text-right">—</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom SGP4 Info Note */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>SGP4 propagator &bull; 10° horizon mask</span>
        </span>
        <span className="font-mono text-slate-400">WGS-84</span>
      </div>
    </div>
  );
}