'use client';

import React, { useState } from 'react';
import { SatelliteInfo } from '@shared/types/tracker';
import { trackerApi } from '@/lib/api';
import { useTracker } from '@/context/TrackerContext';
import { RefreshCw, Satellite, CheckCircle } from '@/components/ui/icons';

interface TlePresetsProps {
  onSelectPreset: (sat: SatelliteInfo) => void;
  onSuccess: (msg: string) => void;
  onError: (err: string) => void;
}

export function TlePresets({ onSelectPreset, onSuccess, onError }: TlePresetsProps) {
  const { authToken, setTokenModalOpen, refreshStatus } = useTracker();
  const [satellites, setSatellites] = useState<SatelliteInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadSatellites = async () => {
    try {
      setLoading(true);
      const list = await trackerApi.getSatellites();
      setSatellites(list);
    } catch (e: any) {
      onError(`Failed to load satellite catalog: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadSatellites();
  }, []);

  const handleApplyDirect = async (sat: SatelliteInfo) => {
    if (!authToken) {
      setTokenModalOpen(true);
      return;
    }

    try {
      await trackerApi.setTle({
        satelliteName: sat.name,
        line1: sat.tle.line1,
        line2: sat.tle.line2
      });
      await refreshStatus();
      onSuccess(`Applied ${sat.name} TLE directly to tracker!`);
    } catch (err: any) {
      onError(err.message || 'Failed to apply preset');
    }
  };

  const handleRefreshCelestrak = async () => {
    setRefreshing(true);
    try {
      // Re-fetch catalog
      const list = await trackerApi.getSatellites();
      setSatellites(list);
      onSuccess('Refreshed satellite orbits from CelesTrak / cache successfully');
    } catch (e: any) {
      onError('Failed to refresh from CelesTrak');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Satellite className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-mono">CelesTrak / ISRO Presets</h3>
            <p className="text-xs text-slate-400">Quickly select or sync pre-validated Two-Line Elements</p>
          </div>
        </div>

        <button
          onClick={handleRefreshCelestrak}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-mono font-medium text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh from CelesTrak'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {satellites.map((sat) => (
          <div
            key={sat.noradId}
            className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex flex-col justify-between hover:border-slate-700 transition-colors"
          >
            <div className="mb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-white truncate mr-2">
                  {sat.name}
                </span>
                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  {sat.group}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                NORAD #{sat.noradId}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => onSelectPreset(sat)}
                className="flex-1 py-1 text-[11px] font-mono font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
              >
                Load in Editor
              </button>
              <button
                type="button"
                onClick={() => handleApplyDirect(sat)}
                className="flex-1 py-1 text-[11px] font-mono font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded transition-colors"
              >
                Apply to Mount
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

