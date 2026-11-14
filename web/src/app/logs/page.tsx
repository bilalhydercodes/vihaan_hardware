'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { TelemetryLogEntry } from '@shared/types/tracker';
import { trackerApi } from '@/lib/api';
import { cacheLogsInIndexedDB, getCachedLogsFromIndexedDB, clearIndexedDBLogs } from '@/lib/idb-logs';
import { AngleHistoryChart } from '@/components/logs/AngleHistoryChart';
import { CsvExportButton } from '@/components/logs/CsvExportButton';
import {
  Activity,
  HardDrive,
  ChevronDown,
  ChevronUp,
  Trash2
} from '@/components/ui/icons';

export default function HistoryPage() {
  const [logs, setLogs] = useState<TelemetryLogEntry[]>([]);
  const [showTable, setShowTable] = useState(false); // Hidden by default
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // Load initial from IndexedDB, then fetch latest from tracker
  const loadInitialLogs = useCallback(async () => {
    setLoading(true);
    try {
      const cached = await getCachedLogsFromIndexedDB();
      if (cached && cached.length > 0) {
        setLogs(cached);
      }

      const latest = await trackerApi.getLogs(100);
      if (latest && latest.length > 0) {
        cacheLogsInIndexedDB(latest);
        setLogs((prev) => {
          const map = new Map<string, TelemetryLogEntry>();
          for (const item of prev) map.set(item.id, item);
          for (const item of latest) map.set(item.id, item);
          return Array.from(map.values()).sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
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

  // Periodic polling for fresh logs
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const latest = await trackerApi.getLogs(30);
        if (latest && latest.length > 0) {
          cacheLogsInIndexedDB(latest);
          setLogs((prev) => {
            const map = new Map<string, TelemetryLogEntry>();
            for (const item of prev) map.set(item.id, item);
            for (const item of latest) map.set(item.id, item);
            return Array.from(map.values()).sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          });
        }
      } catch (err) {}
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleClearCache = async () => {
    if (confirm('Clear saved tracking history from your browser?')) {
      await clearIndexedDBLogs();
      setLogs([]);
      loadInitialLogs();
    }
  };

  const filteredLogs = stateFilter === 'ALL'
    ? logs
    : logs.filter((l) => l.state === stateFilter);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-cyan-400" />
            Tracking History
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Review how accurately the antenna followed satellites over time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CsvExportButton logs={filteredLogs} />
        </div>
      </div>

      {/* Main Simple Chart */}
      <AngleHistoryChart logs={filteredLogs} />

      {/* Collapsed Raw Data Table (Hidden by default) */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>Raw Data Table ({filteredLogs.length} samples)</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">Optional</span>
            </div>
            <div className="text-xs text-slate-400">
              Show exact numerical angle readings for every recorded second.
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span>{showTable ? 'Hide Table' : 'Show Table'}</span>
            {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showTable && (
          <div className="p-5 pt-0 border-t border-slate-800/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span>Filter by status:</span>
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
                >
                  <option value="ALL">All records</option>
                  <option value="TRACKING">Only Tracking</option>
                  <option value="SLEWING">Only Moving</option>
                  <option value="IDLE">Only Ready/Idle</option>
                  <option value="HOMING">Only Resetting</option>
                </select>
              </div>

              <button
                onClick={handleClearCache}
                className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer self-start sm:self-auto"
              >
                Clear saved history
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3 text-cyan-300">Target Left/Right</th>
                    <th className="py-2.5 px-3 text-cyan-400">Actual Left/Right</th>
                    <th className="py-2.5 px-3 text-emerald-300">Target Up/Down</th>
                    <th className="py-2.5 px-3 text-emerald-400">Actual Up/Down</th>
                    <th className="py-2.5 px-3">Difference</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 bg-slate-950/40">
                  {filteredLogs.slice(-50).reverse().map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 text-slate-400">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-3 text-cyan-300 font-bold">{entry.commandedAzimuth.toFixed(0)}°</td>
                      <td className="py-2 px-3 text-cyan-400 font-bold">{entry.actualAzimuth.toFixed(0)}°</td>
                      <td className="py-2 px-3 text-emerald-300 font-bold">{entry.commandedElevation.toFixed(0)}°</td>
                      <td className="py-2 px-3 text-emerald-400 font-bold">{entry.actualElevation.toFixed(0)}°</td>
                      <td className="py-2 px-3 text-slate-300">{entry.trackingErrorDeg.toFixed(1)}°</td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                          {entry.state}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
