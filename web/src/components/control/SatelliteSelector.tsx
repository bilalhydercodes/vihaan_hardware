'use client';

import React, { useEffect, useState } from 'react';
import { SatelliteInfo } from '@shared/types/tracker';
import { trackerApi } from '@/lib/api';
import { useTracker } from '@/context/TrackerContext';
import { Satellite, CheckCircle, Radio, RefreshCw } from '@/components/ui/icons';

interface SatelliteSelectorProps {
  disabled: boolean;
  disabledReason?: string;
  onError: (err: string) => void;
  onSuccess: (msg: string) => void;
}

export function SatelliteSelector({ disabled, disabledReason, onError, onSuccess }: SatelliteSelectorProps) {
  const { status, refreshStatus } = useTracker();
  const [satellites, setSatellites] = useState<SatelliteInfo[]>([]);
  const [selectedNorad, setSelectedNorad] = useState<number | undefined>(status?.noradId || undefined);
  const [autoTrack, setAutoTrack] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchList() {
      setLoading(true);
      try {
        const list = await trackerApi.getSatellites();
        if (isMounted) {
          setSatellites(list);
          if (!selectedNorad && list.length > 0) {
            setSelectedNorad(status?.noradId || list[0].noradId);
          }
        }
      } catch (err: any) {
        if (isMounted) onError(`Failed to fetch satellite list: ${err.message}`);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchList();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (status?.noradId) {
      setSelectedNorad(status.noradId);
    }
  }, [status?.noradId]);

  const handleSelect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNorad) return;

    const sat = satellites.find(s => s.noradId === selectedNorad);
    if (!sat) return;

    setSubmitting(true);
    try {
      const res = await trackerApi.selectSatellite({
        noradId: sat.noradId,
        name: sat.name,
        autoTrack
      });
      await refreshStatus();
      onSuccess(`Target orbit locked to ${res.satelliteName} (NORAD #${res.noradId})`);
    } catch (err: any) {
      onError(err.message || 'Failed to select target satellite');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Satellite className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-mono">Target Satellite Orbit</h3>
            <p className="text-xs text-slate-400">Select NavIC constellation or LEO target for tracking</p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
          {satellites.length} Satellites Loaded
        </span>
      </div>

      <form onSubmit={handleSelect} className="space-y-4">
        <div>
          <label className="block text-xs font-mono uppercase text-slate-300 mb-2">
            Constellation Catalog
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {satellites.map((sat) => {
              const isSelected = selectedNorad === sat.noradId;
              const isCurrent = status?.noradId === sat.noradId;
              return (
                <div
                  key={sat.noradId}
                  onClick={() => !disabled && setSelectedNorad(sat.noradId)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-100'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="truncate mr-2">
                    <div className="font-mono font-bold text-xs truncate text-white">
                      {sat.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      NORAD #{sat.noradId} &bull; {sat.group}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isCurrent && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                        ACTIVE
                      </span>
                    )}
                    <span
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                          : 'border-slate-600'
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={autoTrack}
              onChange={(e) => setAutoTrack(e.target.checked)}
              disabled={disabled}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Immediately engage SGP4 autonomous tracking</span>
          </label>

          <button
            type="submit"
            disabled={disabled || submitting || !selectedNorad}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:pointer-events-none text-slate-950 font-bold font-mono text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5" />
            {submitting ? 'Engaging...' : 'Set Active Satellite'}
          </button>
        </div>
      </form>
    </div>
  );
}

