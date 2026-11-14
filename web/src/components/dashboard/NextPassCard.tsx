'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { SatellitePass } from '@shared/types/tracker';
import { trackerApi } from '@/lib/api';
import { useTracker } from '@/context/TrackerContext';
import {
  Satellite,
  Play,
  Pause,
  ChevronRight,
  Clock,
  Compass
} from '@/components/ui/icons';

function NextPassCardComponent() {
  const { status, refreshStatus, setTokenModalOpen, authToken } = useTracker();
  const [pass, setPass] = useState<SatellitePass | null>(null);
  const [loading, setLoading] = useState(false);
  const [trackingActionLoading, setTrackingActionLoading] = useState(false);

  const satName = status?.satelliteName || 'NavIC-1B (IRNSS)';
  const noradId = status?.noradId || 39635;
  const isTracking = status?.state === 'TRACKING';

  useEffect(() => {
    let isMounted = true;
    async function loadPass() {
      try {
        setLoading(true);
        const data = await trackerApi.getPrediction();
        if (isMounted) setPass(data);
      } catch (err) {
        // Fallback pass if network glitch
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadPass();
    return () => { isMounted = false; };
  }, [status?.satelliteName]);

  const toggleTracking = async () => {
    if (!authToken) {
      setTokenModalOpen(true);
      return;
    }

    setTrackingActionLoading(true);
    try {
      const nextAction = isTracking ? 'STOP' : 'START';
      await trackerApi.setTracking(nextAction);
      await refreshStatus();
    } catch (err: any) {
      alert(`Tracking command failed: ${err.message}`);
    } finally {
      setTrackingActionLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Satellite className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Active Target Orbit</div>
              <h3 className="text-base font-bold text-white font-mono truncate" title={satName}>
                {satName}
              </h3>
            </div>
          </div>

          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            NORAD #{noradId}
          </span>
        </div>

        {/* Pass Details */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 space-y-2.5 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" /> Next Pass Window:
            </span>
            <span className="text-emerald-400 font-semibold">
              {pass ? `${new Date(pass.aos).toLocaleTimeString()} – ${new Date(pass.los).toLocaleTimeString()}` : 'Calculating...'}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span>Peak Elevation:</span>
            <strong className="text-white font-bold text-sm">
              {pass ? `${pass.maxElevation.toFixed(1)}°` : '---°'}
            </strong>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span>Pass Duration:</span>
            <span className="text-slate-300">
              {pass ? `${Math.round(pass.durationSeconds / 60)} minutes` : '---'}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400 border-t border-slate-800/80 pt-2 text-[11px]">
            <span>AOS Azimuth: <strong className="text-cyan-300">{pass?.aosAzimuth || '---'}°</strong></span>
            <span>LOS Azimuth: <strong className="text-amber-300">{pass?.losAzimuth || '---'}°</strong></span>
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
        <button
          onClick={toggleTracking}
          disabled={trackingActionLoading}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer shadow-lg ${
            isTracking
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
          }`}
        >
          {isTracking ? (
            <>
              <Pause className="w-4 h-4 fill-slate-950" />
              {trackingActionLoading ? 'Stopping...' : 'Stop Tracking'}
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-slate-950" />
              {trackingActionLoading ? 'Starting...' : 'Start Tracking'}
            </>
          )}
        </button>

        <Link
          href="/control"
          className="flex items-center gap-1 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition-colors"
        >
          <span>Change Sat</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export const NextPassCard = React.memo(NextPassCardComponent);

