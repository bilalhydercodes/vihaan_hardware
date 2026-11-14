'use client';

import React, { useState, useMemo } from 'react';
import { SatelliteInfo } from '@shared/types/tracker';
import { trackerApi } from '@/lib/api';
import { useTracker } from '@/context/TrackerContext';
import { RefreshCw, Satellite, CheckCircle, Search, Compass, Radio } from '@/components/ui/icons';

interface TlePresetsProps {
  onSelectPreset?: (sat: SatelliteInfo) => void;
  onSuccess: (msg: string) => void;
  onError: (err: string) => void;
}

export function TlePresets({ onSelectPreset, onSuccess, onError }: TlePresetsProps) {
  const { authToken, setTokenModalOpen, refreshStatus, status } = useTracker();
  const [satellites, setSatellites] = useState<SatelliteInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'NAVIC' | 'WEATHER' | 'LEO'>('ALL');
  const [applyingNorad, setApplyingNorad] = useState<number | null>(null);

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

    setApplyingNorad(sat.noradId);
    try {
      await trackerApi.selectSatellite({
        noradId: sat.noradId,
        name: sat.name
      });
      await trackerApi.setTracking('START');
      await refreshStatus();
      onSuccess(`Locked onto ${sat.name}! Mount is now tracking.`);
    } catch (err: any) {
      onError(err.message || 'Failed to apply satellite');
    } finally {
      setApplyingNorad(null);
    }
  };

  const handleRefreshCelestrak = async () => {
    setRefreshing(true);
    try {
      const res = await trackerApi.refreshTle();
      const list = await trackerApi.getSatellites();
      setSatellites(list);
      await refreshStatus();
      onSuccess(`Refreshed ${list.length} real satellites from CelesTrak!`);
    } catch (e: any) {
      onError('Failed to refresh live data from CelesTrak');
    } finally {
      setRefreshing(false);
    }
  };

  // Filtered satellite list
  const filteredSats = useMemo(() => {
    return satellites.filter((sat) => {
      // Group filter
      if (activeTab === 'NAVIC' && sat.group !== 'NAVIC') return false;
      if (activeTab === 'WEATHER' && sat.group !== 'WEATHER') return false;
      if (activeTab === 'LEO' && sat.group !== 'LEO') return false;

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesName = sat.name.toLowerCase().includes(query);
        const matchesNorad = sat.noradId.toString().includes(query);
        return matchesName || matchesNorad;
      }
      return true;
    });
  }, [satellites, activeTab, search]);

  const activeNoradId = status?.noradId;

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Real CelesTrak Satellite Catalog
            </h3>
            <p className="text-xs text-slate-400">
              Live orbital elements synchronized directly from NORAD space tracking ({satellites.length} satellites loaded)
            </p>
          </div>
        </div>

        <button
          onClick={handleRefreshCelestrak}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-xs font-semibold text-cyan-300 transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Syncing CelesTrak...' : 'Refresh from CelesTrak'}</span>
        </button>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            All ({satellites.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('NAVIC')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'NAVIC'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            🇮🇳 NavIC / IRNSS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('WEATHER')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'WEATHER'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            ⛅ Weather (137 MHz)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LEO')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              activeTab === 'LEO'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            🛰️ Space Stations (ISS)
          </button>
        </div>

        {/* Search input */}
        <div className="relative min-w-[200px] sm:min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or NORAD ID..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Satellite Cards Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-xs animate-pulse">
          Loading live CelesTrak orbital catalog...
        </div>
      ) : filteredSats.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
          No satellites match your search. Try another search term or click "Refresh from CelesTrak".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
          {filteredSats.map((sat) => {
            const isCurrentlySelected = activeNoradId === sat.noradId;
            const isApplying = applyingNorad === sat.noradId;

            return (
              <div
                key={sat.noradId}
                className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                  isCurrentlySelected
                    ? 'bg-cyan-950/30 border-cyan-500/50 shadow-md shadow-cyan-950/40'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-xs text-white line-clamp-1">
                      {sat.name}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        sat.group === 'NAVIC'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : sat.group === 'WEATHER'
                          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {sat.group}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                    <span>NORAD #{sat.noradId}</span>
                    <span>&bull;</span>
                    <span className="text-slate-500">2-Line Elements</span>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-900 flex items-center gap-2">
                  {onSelectPreset && (
                    <button
                      type="button"
                      onClick={() => onSelectPreset(sat)}
                      className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      View
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isApplying || isCurrentlySelected}
                    onClick={() => handleApplyDirect(sat)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isCurrentlySelected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm'
                    }`}
                  >
                    {isCurrentlySelected ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Active Target</span>
                      </>
                    ) : (
                      <>
                        <Radio className="w-3.5 h-3.5" />
                        <span>{isApplying ? 'Aiming...' : 'Track Satellite'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
