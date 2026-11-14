'use client';

import React from 'react';
import { SatellitePass } from '@shared/types/tracker';
import { List, Info } from '@/components/ui/icons';

interface UpcomingPassesCardProps {
  pass: SatellitePass | null;
  loading?: boolean;
  isConnected: boolean;
}

export function UpcomingPassesCard({ pass, loading, isConnected }: UpcomingPassesCardProps) {
  const hasPass = isConnected && pass && pass.maxElevation > 0;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
            <List className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-slate-900 text-base">Upcoming Passes</h2>
        </div>

        {!isConnected && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
            Offline
          </span>
        )}
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto my-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-semibold">
              <th className="py-2 px-2.5 w-8">#</th>
              <th className="py-2 px-2.5">AOS (UTC)</th>
              <th className="py-2 px-2.5">LOS (UTC)</th>
              <th className="py-2 px-2.5 text-center">Max El.</th>
              <th className="py-2 px-2.5 text-right">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {hasPass ? (
              <>
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-2.5 font-bold text-slate-900">1</td>
                  <td className="py-2.5 px-2.5">
                    {new Date(pass.aos).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-2.5">
                    {new Date(pass.los).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-2.5 text-center font-bold text-sky-600">
                    {pass.maxElevation.toFixed(0)}°
                  </td>
                  <td className="py-2.5 px-2.5 text-right text-slate-500">
                    {Math.round(pass.durationSeconds / 60)} min
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-2.5 font-bold text-slate-900">2</td>
                  <td className="py-2.5 px-2.5 text-slate-400">—</td>
                  <td className="py-2.5 px-2.5 text-slate-400">—</td>
                  <td className="py-2.5 px-2.5 text-center text-slate-400">—</td>
                  <td className="py-2.5 px-2.5 text-right text-slate-400">—</td>
                </tr>
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-2.5 font-bold text-slate-900">3</td>
                  <td className="py-2.5 px-2.5 text-slate-400">—</td>
                  <td className="py-2.5 px-2.5 text-slate-400">—</td>
                  <td className="py-2.5 px-2.5 text-center text-slate-400">—</td>
                  <td className="py-2.5 px-2.5 text-right text-slate-400">—</td>
                </tr>
              </>
            ) : (
              [1, 2, 3].map((rowNum) => (
                <tr key={rowNum} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-2.5 font-bold text-slate-900">{rowNum}</td>
                  <td className="py-2.5 px-2.5 text-slate-400">—</td>
                  <td className="py-2.5 px-2.5 text-slate-400">—</td>
                  <td className="py-2.5 px-2.5 text-center text-slate-400">—</td>
                  <td className="py-2.5 px-2.5 text-right text-slate-400">—</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Alert/Notice Banner */}
      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-[11px] text-slate-500 font-medium">
        <Info className="w-4 h-4 text-slate-400 shrink-0" />
        <span>
          {!isConnected
            ? 'Tracker offline. Pass schedule will calculate once connected.'
            : hasPass
            ? 'Passes computed via SGP4 orbital propagator with 10° elevation mask.'
            : 'No passes available in the next 48 hours.'}
        </span>
      </div>
    </div>
  );
}
