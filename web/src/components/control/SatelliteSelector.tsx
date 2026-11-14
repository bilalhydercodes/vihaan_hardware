'use client';

import React, { useEffect, useState } from 'react';
import { SatelliteInfo } from '@shared/types/tracker';
import { trackerApi } from '@/lib/api';
import { useTracker } from '@/context/TrackerContext';
import { Satellite, Check, ChevronDown, RefreshCw, AlertTriangle } from '@/components/ui/icons';

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

  // Search CelesTrak State
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);

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
        if (isMounted) onError(`Could not load satellite list: ${err.message}. Check tracker connection.`);
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
      await trackerApi.selectSatellite({
        noradId: sat.noradId,
        name: sat.name
      });

      if (autoTrack) {
        await trackerApi.setTracking('START');
      }

      await refreshStatus();
      onSuccess(`Now following ${sat.name}!`);
    } catch (err: any) {
      onError(`Could not switch satellite: ${err.message}. Make sure your token is saved.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchCelestrak = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchMsg(null);
    try {
      const results = await trackerApi.searchSatellites(searchQuery.trim());
      if (results && results.length > 0) {
        const found = results[0];
        // Add to state if not present
        if (!satellites.some(s => s.noradId === found.noradId)) {
          setSatellites(prev => [found, ...prev]);
        }
        setSelectedNorad(found.noradId);
        setSearchMsg(`Found "${found.name}" (NORAD ${found.noradId}) on CelesTrak! Selected below.`);
      } else {
        setSearchMsg(`No satellite matching "${searchQuery}" found on CelesTrak.`);
      }
    } catch (err: any) {
      setSearchMsg(`CelesTrak search error: ${err.message}`);
    } finally {
      setSearching(false);
    }
  };

  // Group satellites into Weather, NavIC, and Others
  const weatherSats = satellites.filter(s => s.group === 'WEATHER' || s.name.includes('METEOR') || s.name.includes('NOAA'));
  const navicSats = satellites.filter(s => s.group === 'NAVIC' || s.name.includes('NavIC') || s.name.includes('IRNSS'));
  const otherSats = satellites.filter(s => !weatherSats.includes(s) && !navicSats.includes(s));

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
          <Satellite className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Choose a Satellite</h2>
          <p className="text-xs text-slate-300">Select which satellite the antenna should aim at.</p>
        </div>
      </div>

      <form onSubmit={handleSelect} className="space-y-4">
        {/* Simple native dropdown grouped by category */}
        <div className="space-y-1.5">
          <label htmlFor="sat-select" className="block text-xs font-semibold text-slate-300">
            Available Satellites (from CelesTrak)
          </label>
          <div className="relative">
            <select
              id="sat-select"
              value={selectedNorad || ''}
              onChange={(e) => setSelectedNorad(Number(e.target.value))}
              disabled={disabled || loading}
              className="w-full appearance-none bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-base font-medium text-white focus:outline-none focus:border-cyan-400 disabled:opacity-50 cursor-pointer"
            >
              {weatherSats.length > 0 && (
                <optgroup label="Weather Satellites (137 MHz)" className="bg-slate-900 text-cyan-400 font-bold">
                  {weatherSats.map((sat) => (
                    <option key={sat.noradId} value={sat.noradId} className="bg-slate-900 text-white font-normal">
                      {sat.name} (NORAD {sat.noradId}) {sat.noradId === status?.noradId ? '— (Currently Aimed)' : ''}
                    </option>
                  ))}
                </optgroup>
              )}

              {navicSats.length > 0 && (
                <optgroup label="NavIC / IRNSS Constellation" className="bg-slate-900 text-cyan-400 font-bold">
                  {navicSats.map((sat) => (
                    <option key={sat.noradId} value={sat.noradId} className="bg-slate-900 text-white font-normal">
                      {sat.name} (NORAD {sat.noradId}) {sat.noradId === status?.noradId ? '— (Currently Aimed)' : ''}
                    </option>
                  ))}
                </optgroup>
              )}

              {otherSats.length > 0 && (
                <optgroup label="Space Stations & Others" className="bg-slate-900 text-cyan-400 font-bold">
                  {otherSats.map((sat) => (
                    <option key={sat.noradId} value={sat.noradId} className="bg-slate-900 text-white font-normal">
                      {sat.name} (NORAD {sat.noradId}) {sat.noradId === status?.noradId ? '— (Currently Aimed)' : ''}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Auto track checkbox */}
        <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-300">
          <input
            type="checkbox"
            checked={autoTrack}
            onChange={(e) => setAutoTrack(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
          />
          <span>Start tracking immediately after picking</span>
        </label>

        {/* Action Button */}
        <button
          type="submit"
          disabled={disabled || submitting || !selectedNorad}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-base font-bold transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
        >
          <Satellite className="w-4 h-4" />
          <span>{submitting ? 'Aiming at satellite...' : 'Aim at this Satellite'}</span>
        </button>
      </form>

      {/* Search any satellite on CelesTrak */}
      <div className="pt-2 border-t border-slate-800/80">
        <label className="block text-xs font-semibold text-slate-400 mb-1.5">
          Or search & load any satellite from CelesTrak:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. 59051, NOAA 20, or ISS"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled || searching}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="button"
            onClick={handleSearchCelestrak}
            disabled={disabled || searching || !searchQuery.trim()}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {searching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>{searching ? 'Finding...' : 'Find on CelesTrak'}</span>
          </button>
        </div>
        {searchMsg && (
          <p className="text-xs text-cyan-300 mt-2 font-medium">
            {searchMsg}
          </p>
        )}
      </div>
    </div>
  );
}
