'use client';

import React, { useEffect, useState } from 'react';
import { TleData, SatelliteInfo } from '@shared/types/tracker';
import { trackerApi } from '@/lib/api';
import { TleViewer } from '@/components/tle/TleViewer';
import { TleEditor } from '@/components/tle/TleEditor';
import { TlePresets } from '@/components/tle/TlePresets';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  RefreshCw
} from '@/components/ui/icons';

export default function TlePage() {
  const [activeTle, setActiveTle] = useState<TleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchCurrentTle = async () => {
    try {
      setLoading(true);
      const data = await trackerApi.getTle();
      setActiveTle(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch current TLE from tracker');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentTle();
  }, []);

  const handleSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    fetchCurrentTle();
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-cyan-400" />
            Two-Line Element (TLE) Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Orbital ephemeris data stored in tracker flash for topocentric SGP4 trajectory propagation
          </p>
        </div>

        <button
          onClick={fetchCurrentTle}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-mono font-medium text-slate-300 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Reload Active TLE</span>
        </button>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <strong className="font-semibold text-rose-100 block">TLE Error</strong>
              <span className="font-mono">{errorMessage}</span>
            </div>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="font-mono">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Active TLE View */}
      <TleViewer tle={activeTle} loading={loading} />

      {/* 2. Grid: Presets and Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <TleEditor
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>

        <div className="lg:col-span-6">
          <TlePresets
            onSelectPreset={(sat) => {
              // Scroll to editor
              window.scrollTo({ top: 400, behavior: 'smooth' });
            }}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>
      </div>
    </div>
  );
}

