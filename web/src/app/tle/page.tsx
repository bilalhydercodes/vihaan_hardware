'use client';

import React, { useEffect, useState } from 'react';
import { TleData, SatelliteInfo } from '@shared/types/tracker';
import { trackerApi } from '@/lib/api';
import { useTracker } from '@/context/TrackerContext';
import { TleViewer } from '@/components/tle/TleViewer';
import { TlePresets } from '@/components/tle/TlePresets';
import { TleEditor } from '@/components/tle/TleEditor';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Radio,
  ExternalLink,
  X
} from '@/components/ui/icons';

export default function TlePage() {
  const { authToken, setTokenModalOpen, refreshStatus } = useTracker();
  const [activeTle, setActiveTle] = useState<TleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchCurrentTle = async () => {
    try {
      setLoading(true);
      const data = await trackerApi.getTle();
      setActiveTle(data);
    } catch (err: any) {
      setErrorMessage(`Could not load satellite data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentTle();
  }, []);

  const handleUpdateNow = async () => {
    if (!authToken) {
      setTokenModalOpen(true);
      return;
    }

    setUpdating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      // Re-fetch directly from CelesTrak via backend
      const result = await trackerApi.refreshTle();
      if (result.currentTle) {
        setActiveTle(result.currentTle);
      } else {
        await fetchCurrentTle();
      }
      await refreshStatus();
      setSuccessMessage(`Live orbital data updated directly from CelesTrak! ${result.message}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(`Update failed: ${err.message}. Check your token and network.`);
    } finally {
      setUpdating(false);
    }
  };

  const getTimeAgo = (timestamp?: string) => {
    if (!timestamp) return 'Recently';
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Source Attribution */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-cyan-400" />
            Satellite Data & Orbital Elements
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            Real Two-Line Elements (TLE) synchronized directly from official CelesTrak NORAD tracking.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <a
            href="https://celestrak.org/norad/elements/index.php?FORMAT=2le"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <span>CelesTrak.org</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleUpdateNow}
            disabled={updating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 text-slate-950 font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
            <span>{updating ? 'Fetching from CelesTrak...' : 'Sync CelesTrak Orbits'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <strong className="font-bold text-rose-100 block">Error</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-rose-500/20 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="p-1 hover:bg-emerald-500/20 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Section 1: Active Target Satellite TLE Viewer */}
      <TleViewer tle={activeTle} loading={loading} />

      {/* Section 2: Real CelesTrak Satellite Catalog & Presets */}
      <TlePresets
        onSelectPreset={(sat) => {
          setActiveTle({
            satelliteName: sat.name,
            noradId: sat.noradId,
            line1: sat.tle.line1,
            line2: sat.tle.line2,
            updatedAt: new Date().toISOString(),
            source: 'CELESTRAK'
          });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSuccess={(msg) => {
          setSuccessMessage(msg);
          fetchCurrentTle();
          setTimeout(() => setSuccessMessage(null), 5000);
        }}
        onError={(err) => setErrorMessage(err)}
      />

      {/* Section 3: Collapsed Advanced Section: Custom TLE File Upload */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-slate-800/40 transition-colors cursor-pointer"
        >
          <div>
            <div className="text-base font-bold text-white flex items-center gap-2">
              <span>Advanced: Upload Custom Satellite TLE File</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">Optional</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Paste custom 2-line/3-line element sets or upload .tle files for experimental or classified orbits.
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span>{isAdvancedOpen ? 'Hide' : 'Show'}</span>
            {isAdvancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isAdvancedOpen && (
          <div className="p-5 sm:p-6 pt-0 border-t border-slate-800/80">
            <div className="pt-4">
              <TleEditor
                onSuccess={(msg) => {
                  setSuccessMessage(msg);
                  fetchCurrentTle();
                  setTimeout(() => setSuccessMessage(null), 5000);
                }}
                onError={(err) => setErrorMessage(err)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
