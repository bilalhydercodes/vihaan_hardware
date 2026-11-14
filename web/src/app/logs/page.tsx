'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { TelemetryLogEntry, TrackingState } from '@shared/types/tracker';
import { trackerApi } from '@/lib/api';
import { cacheLogsInIndexedDB, getCachedLogsFromIndexedDB, clearIndexedDBLogs } from '@/lib/idb-logs';
import { AngleHistoryChart } from '@/components/logs/AngleHistoryChart';
import { CsvExportButton } from '@/components/logs/CsvExportButton';
import {
  Activity,
  HardDrive,
  RefreshCw,
  Sliders,
  CheckCircle,
  AlertTriangle
} from '@/components/ui/icons';

export default function LogsPage() {
  const [logs, setLogs] = useState<TelemetryLogEntry[]>([]);
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);
  const [loading, setLoading] = useState(true);
  const [indexedDbCount, setIndexedDbCount] = useState(0);

  // Load initial from IndexedDB, then fetch latest from tracker
  const loadInitialLogs = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Read local cache
      const cached = await getCachedLogsFromIndexedDB();
      if (cached && cached.length > 0) {
        setLogs(cached);
        setIndexedDbCount(cached.length);
      }

      // 2. Fetch fresh ring buffer from tracker
      const latest = await trackerApi.getLogs(100);
      if (latest && latest.length > 0) {
        cacheLogsInIndexedDB(latest);
        setLogs((prev) => {
          const map = new Map<string, TelemetryLogEntry>();
          for (const item of prev) map.set(item.id, item);
          for (const item of latest) map.set(item.id, item);
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          setIndexedDbCount(merged.length);
          return merged;
        });
      }
    } catch (err) {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialLogs();
  }, [loadInitialLogs]);

  // Periodic polling if live streaming is active
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(async () => {
      try {
        const latest = await trackerApi.getLogs(30);
        if (latest && latest.length > 0) {
          cacheLogsInIndexedDB(latest);
          setLogs((prev) => {
            const map = new Map<string, TelemetryLogEntry>();
            for (const item of prev) map.set(item.id, item);
            for (const item of latest) map.set(item.id, item);
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            setIndexedDbCount(merged.length);
            return merged;
          });
        }
      } catch (err) {}
    }, 3000);

    return () => clearInterval(interval);
  }, [isLiveStreaming]);

  const handleClearCache = async () => {
    if (confirm('Clear local IndexedDB telemetry logs cache?')) {
      await clearIndexedDBLogs();
      setLogs([]);
      setIndexedDbCount(0);
      loadInitialLogs();
    }
  };

  const filteredLogs = stateFilter === 'ALL'
    ? logs
    : logs.filter((l) => l.state === stateFilter);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-cyan-400" />
            Telemetry Logs & Pointing Analysis
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical commanded vs actual tracking angles with IndexedDB browser persistence and CSV export
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CsvExportButton logs={filteredLogs} />
        </div>
      </div>

      {/* Persistence Info Banner */}
      <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            Storage: Real ESP32 ring buffer stores ~100–200 frames in RAM. Browser{' '}
            <strong className="text-emerald-300">IndexedDB ({indexedDbCount} points cached)</strong>{' '}
            persists full historical passes offline.
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={isLiveStreaming}
              onChange={(e) => setIsLiveStreaming(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Live Sync (2s)</span>
          </label>
          <button
            onClick={handleClearCache}
            className="text-rose-400 hover:text-rose-300 underline cursor-pointer"
          >
            Clear Cache
          </button>
        </div>
      </div>

      {/* 1. Time Series Chart */}
      <AngleHistoryChart logs={filteredLogs} />

      {/* 2. Table Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white font-mono">Telemetry Data Table</h3>
            <p className="text-xs text-slate-400">Showing {filteredLogs.length} recorded telemetry samples</p>
          </div>

          {/* Filter Dropdown */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Filter State:</span>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">ALL STATES</option>
              <option value="TRACKING">TRACKING</option>
              <option value="SLEWING">SLEWING</option>
              <option value="IDLE">IDLE</option>
              <option value="HOMING">HOMING</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-3.5 py-2.5 font-semibold">Timestamp (Local)</th>
                <th className="px-3.5 py-2.5 font-semibold">Cmd Azimuth</th>
                <th className="px-3.5 py-2.5 font-semibold">Actual Azimuth</th>
                <th className="px-3.5 py-2.5 font-semibold">Cmd Elevation</th>
                <th className="px-3.5 py-2.5 font-semibold">Actual Elevation</th>
                <th className="px-3.5 py-2.5 font-semibold">Error (Δθ)</th>
                <th className="px-3.5 py-2.5 font-semibold">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-mono">
                    No telemetry logs recorded yet. Connect to tracker or trigger motion.
                  </td>
                </tr>
              ) : (
                filteredLogs.slice(-50).reverse().map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-3.5 py-2 text-slate-400">
                      {new Date(row.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-3.5 py-2 text-amber-300">{row.commandedAzimuth.toFixed(2)}°</td>
                    <td className="px-3.5 py-2 text-cyan-300 font-bold">{row.actualAzimuth.toFixed(2)}°</td>
                    <td className="px-3.5 py-2 text-amber-300">{row.commandedElevation.toFixed(2)}°</td>
                    <td className="px-3.5 py-2 text-emerald-300 font-bold">{row.actualElevation.toFixed(2)}°</td>
                    <td className="px-3.5 py-2">
                      <span
                        className={`font-semibold ${
                          row.trackingErrorDeg < 1.0
                            ? 'text-emerald-400'
                            : row.trackingErrorDeg < 3.0
                            ? 'text-cyan-300'
                            : 'text-amber-400'
                        }`}
                      >
                        {row.trackingErrorDeg.toFixed(2)}°
                      </span>
                    </td>
                    <td className="px-3.5 py-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          row.state === 'TRACKING'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : row.state === 'SLEWING'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : row.state === 'HOMING'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {row.state}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

