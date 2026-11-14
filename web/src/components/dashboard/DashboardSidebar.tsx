'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTracker } from '@/context/TrackerContext';
import { trackerApi } from '@/lib/api';
import { SatelliteInfo, SatellitePass, AngleCoordinates } from '@shared/types/tracker';
import {
  Satellite,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Play,
  Pause,
  ChevronDown,
  WifiOff,
  Radio,
  Target,
  Compass
} from '@/components/ui/icons';

interface DashboardSidebarProps {
  pass: SatellitePass | null;
  loadingPass: boolean;
  targetAngles: AngleCoordinates | null;
  currentAngles: AngleCoordinates | null;
}

export function DashboardSidebar({
  pass,
  loadingPass,
  targetAngles,
  currentAngles
}: DashboardSidebarProps) {
  const { status, telemetry, connectionStatus, authToken, setTokenModalOpen, refreshStatus } = useTracker();
  const [satellites, setSatellites] = useState<SatelliteInfo[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isConnected = connectionStatus === 'connected';
  const satName = status?.satelliteName || telemetry?.satelliteName || null;
  const state = telemetry?.state || status?.state || 'IDLE';
  const isTracking = state === 'TRACKING';
  const isVisible = telemetry?.isVisible ?? status?.isVisible ?? null;

  // Load available satellites for dropdown
  useEffect(() => {
    let mounted = true;
    trackerApi.getSatellites()
      .then(list => {
        if (mounted && list && list.length > 0) {
          setSatellites(list);
        }
      })
      .catch(() => {
        if (mounted) {
          setSatellites([
            { name: 'METEOR-M2 4', noradId: 59051, group: 'WEATHER', tle: { line1: '', line2: '' } },
            { name: 'NOAA 19', noradId: 33591, group: 'WEATHER', tle: { line1: '', line2: '' } },
            { name: 'NOAA 18', noradId: 28654, group: 'WEATHER', tle: { line1: '', line2: '' } },
            { name: 'NOAA 15', noradId: 25338, group: 'WEATHER', tle: { line1: '', line2: '' } },
            { name: 'NavIC-1B', noradId: 39635, group: 'NAVIC', tle: { line1: '', line2: '' } },
            { name: 'NavIC-1C', noradId: 40269, group: 'NAVIC', tle: { line1: '', line2: '' } },
            { name: 'NavIC-1I', noradId: 43286, group: 'NAVIC', tle: { line1: '', line2: '' } },
            { name: 'ISS (ZARYA)', noradId: 25544, group: 'LEO', tle: { line1: '', line2: '' } }
          ]);
        }
      });
    return () => { mounted = false; };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSat = async (sat: SatelliteInfo) => {
    setDropdownOpen(false);
    if (!isConnected) {
      alert('Tracker hardware is offline. Please switch on your tracker before commanding satellite selection.');
      return;
    }
    try {
      await trackerApi.selectSatellite({ name: sat.name, noradId: sat.noradId });
      await refreshStatus();
    } catch (e: any) {
      alert(`Could not select satellite: ${e.message}`);
    }
  };

  const handleToggleTracking = async () => {
    if (!isConnected) {
      alert('Tracker is offline. Please power on the tracker or start the local service first.');
      return;
    }
    if (!authToken) {
      setTokenModalOpen(true);
      return;
    }
    setActionLoading(true);
    try {
      await trackerApi.setTracking(isTracking ? 'STOP' : 'START');
      await refreshStatus();
    } catch (err: any) {
      alert(`Tracking action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const selectedSatObj = satellites.find(s => s.name === satName) || (satellites.length > 0 ? satellites[0] : null);

  return (
    <div className="space-y-4">
      {/* 1. Target Satellite Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 border border-sky-100 text-sky-600">
              <Satellite className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Target Satellite</h2>
              <p className="text-[11px] text-slate-500">Mission Tracking Target</p>
            </div>
          </div>

          {selectedSatObj && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
              {selectedSatObj.group || 'LEO'}
            </span>
          )}
        </div>

        {/* Satellite Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200 rounded-xl text-slate-900 font-bold text-sm transition-all cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-2 truncate">
              <Radio className="w-4 h-4 text-sky-600 shrink-0" />
              <span className="truncate">
                {satName || (selectedSatObj ? selectedSatObj.name : 'Select Satellite')}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 max-h-72 overflow-y-auto">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Select Constellation / Satellite
              </div>
              {satellites.map((s) => (
                <button
                  key={s.noradId || s.name}
                  type="button"
                  onClick={() => handleSelectSat(s)}
                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between hover:bg-sky-50 transition-colors cursor-pointer ${
                    s.name === satName ? 'text-sky-700 bg-sky-50/70' : 'text-slate-700'
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-2 shrink-0">
                    {s.group}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Satellite Specs */}
        {selectedSatObj && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-[11px] text-slate-500 font-medium">NORAD Catalog ID</span>
              <span className="font-mono font-bold text-slate-900">{selectedSatObj.noradId}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-[11px] text-slate-500 font-medium">Downlink Band</span>
              <span className="font-mono font-bold text-slate-900">
                {selectedSatObj.name.includes('METEOR') ? '137.100 MHz' :
                 selectedSatObj.name.includes('NOAA') ? '137.620 MHz' :
                 selectedSatObj.name.includes('NavIC') ? 'L5 / S-band' : 'VHF / UHF'}
              </span>
            </div>
          </div>
        )}

        {/* Live Horizon / Visibility Status */}
        <div className="p-3 rounded-xl border transition-colors">
          {!isConnected ? (
            <div className="flex items-center gap-2.5">
              <WifiOff className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-700 block">Tracker Disconnected</span>
                <span className="text-[11px] text-slate-400">Offline status</span>
              </div>
            </div>
          ) : !targetAngles ? (
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-700 block">No Look Angles</span>
                <span className="text-[11px] text-slate-500">Pick a satellite above</span>
              </div>
            </div>
          ) : isVisible ? (
            <div className="flex items-center gap-2.5 text-emerald-800">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-bold block">In Sky View (Above 10°)</span>
                <span className="text-[11px] text-emerald-700">
                  Target El: {targetAngles.elevation.toFixed(1)}° &bull; Az: {targetAngles.azimuth.toFixed(1)}°
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <span className="text-xs font-bold block">Below Horizon (&lt; 10°)</span>
                <span className="text-[11px] text-amber-700">
                  Target El: {targetAngles.elevation.toFixed(1)}° &bull; Az: {targetAngles.azimuth.toFixed(1)}°
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Next Pass Quick Preview */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
          <div className="text-xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Next Orbit Pass</span>
            <span className="font-bold text-slate-900 block">
              {!isConnected ? (
                'Offline'
              ) : loadingPass ? (
                'Computing...'
              ) : pass && pass.maxElevation > 0 ? (
                `${new Date(pass.aos).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC (Peak ${pass.maxElevation.toFixed(0)}°)`
              ) : (
                'No pass in next 48h'
              )}
            </span>
          </div>
        </div>

        {/* Tracker Hardware Status */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                !isConnected
                  ? 'bg-rose-500'
                  : isTracking
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-emerald-500'
              }`}
            />
            <span className="font-semibold text-slate-700">Tracker Hardware</span>
          </div>
          <span className="font-bold text-slate-900">
            {!isConnected
              ? 'Offline'
              : isTracking
              ? 'Tracking'
              : state === 'SLEWING'
              ? 'Moving'
              : 'Idle / Ready'}
          </span>
        </div>

        {/* Primary Start / Stop Tracking Action Button */}
        <button
          type="button"
          onClick={handleToggleTracking}
          disabled={!isConnected || actionLoading}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
            isTracking
              ? 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 shadow-amber-500/20'
              : 'bg-sky-500 hover:bg-sky-600 active:bg-sky-700 shadow-sky-500/20'
          }`}
        >
          {isTracking ? (
            <>
              <Pause className="w-4 h-4 fill-white" />
              <span>{actionLoading ? 'Stopping...' : 'Stop Autonomous Tracking'}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>{actionLoading ? 'Starting...' : 'Start Autonomous Tracking'}</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Mission Station Observer Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-2.5 text-xs text-slate-600">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <Compass className="w-4 h-4 text-sky-600" />
          <span>Ground Station Profile</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70">
            <span className="text-slate-400 block font-medium">Elevation Mask</span>
            <span className="font-bold text-slate-800">10.0° (Horizon)</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70">
            <span className="text-slate-400 block font-medium">Orbit Propagator</span>
            <span className="font-bold text-slate-800">SGP4 / SDP4</span>
          </div>
        </div>
      </div>
    </div>
  );
}