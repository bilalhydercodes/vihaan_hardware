'use client';

import React, { useEffect, useState } from 'react';
import { TrackerConfig } from '@shared/types/tracker';
import { trackerApi } from '@/lib/api';
import { useTracker } from '@/context/TrackerContext';
import {
  Sliders,
  Compass,
  Radio,
  AlertTriangle,
  CheckCircle,
  X,
  RefreshCw,
  Cpu
} from '@/components/ui/icons';

const LOCATION_PRESETS = [
  { name: 'New Delhi (DTU / Test Bench)', lat: 28.6139, lon: 77.2090, alt: 216 },
  { name: 'Bengaluru (ISRO HQ)', lat: 12.9716, lon: 77.5946, alt: 920 },
  { name: 'Mumbai (Coastal)', lat: 19.0760, lon: 72.8777, alt: 14 },
  { name: 'Chennai (Regional Station)', lat: 13.0827, lon: 80.2707, alt: 6 },
];

export default function SettingsPage() {
  const { authToken, setTokenModalOpen, refreshStatus } = useTracker();

  const [config, setConfig] = useState<TrackerConfig | null>(null);
  const [initialConfig, setInitialConfig] = useState<TrackerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const data = await trackerApi.getConfig();
      setConfig(data);
      setInitialConfig(JSON.parse(JSON.stringify(data)));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch tracker configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const hasUnsavedChanges = JSON.stringify(config) !== JSON.stringify(initialConfig);

  const handleUseBrowserGps = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!config) return;
        setConfig({
          ...config,
          observer: {
            latitude: parseFloat(pos.coords.latitude.toFixed(4)),
            longitude: parseFloat(pos.coords.longitude.toFixed(4)),
            altitudeMeters: Math.round(pos.coords.altitude || config.observer.altitudeMeters)
          }
        });
        setSuccessMessage('Coordinates updated from browser GPS sensor.');
      },
      (err) => {
        setErrorMessage(`GPS detection error: ${err.message}`);
      }
    );
  };

  const handleApplyPresetLocation = (preset: typeof LOCATION_PRESETS[0]) => {
    if (!config) return;
    setConfig({
      ...config,
      observer: {
        latitude: preset.lat,
        longitude: preset.lon,
        altitudeMeters: preset.alt
      }
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    if (!authToken) {
      setTokenModalOpen(true);
      return;
    }

    // Client-side validations
    const { observer, motion } = config;
    if (observer.latitude < -90 || observer.latitude > 90) {
      setErrorMessage('Latitude must be between -90.0° and +90.0°');
      return;
    }
    if (observer.longitude < -180 || observer.longitude > 180) {
      setErrorMessage('Longitude must be between -180.0° and +180.0°');
      return;
    }
    if (motion.maxAzimuthSpeedDegS <= 0 || motion.maxAzimuthSpeedDegS > 5.0) {
      setErrorMessage('Max Azimuth Speed must be between 0.1 and 5.0 deg/s to prevent stepper stalls');
      return;
    }
    if (motion.maxElevationSpeedDegS <= 0 || motion.maxElevationSpeedDegS > 5.0) {
      setErrorMessage('Max Elevation Speed must be between 0.1 and 5.0 deg/s');
      return;
    }
    if (motion.azimuthStepsPerDegree <= 0 || motion.elevationStepsPerDegree <= 0) {
      setErrorMessage('Steps per degree must be positive non-zero numbers');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      const updated = await trackerApi.updateConfig(config);
      setConfig(updated);
      setInitialConfig(JSON.parse(JSON.stringify(updated)));
      await refreshStatus();
      setSuccessMessage('Configuration and motor calibration saved to tracker non-volatile memory!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update configuration on tracker');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (initialConfig) {
      setConfig(JSON.parse(JSON.stringify(initialConfig)));
      setErrorMessage(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-cyan-400" />
            Tracker Settings & Hardware Calibration
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure observer coordinates, stepper gear reduction ratios, and mechanical zero offsets
          </p>
        </div>

        {hasUnsavedChanges && (
          <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
            Unsaved Changes
          </span>
        )}
      </div>

      {loading || !config ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-slate-900/60 rounded-xl border border-slate-800" />
            <div className="h-80 bg-slate-900/60 rounded-xl border border-slate-800" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Calibration Warning Callout */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="font-semibold text-amber-100 block">Critical Pointing Calibration Notice</strong>
              <p className="leading-relaxed text-amber-200/90">
                Incorrect steps-per-degree calibration or observer coordinates will directly introduce pointing errors in topocentric SGP4 calculations.
                28BYJ-48 steppers will skip steps if commanded speeds exceed <code className="px-1 py-0.5 rounded bg-slate-900 text-cyan-300 font-mono">5.0°/s</code>.
                Always confirm mechanical alignment against physical fiducials before field operations.
              </p>
            </div>
          </div>

          {/* Alerts */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                <div>
                  <strong className="font-semibold text-rose-100 block">Configuration Error</strong>
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

          <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 1. Observer Geolocation Coordinates (6 cols) */}
          <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">Observer Geolocation</h3>
                  <p className="text-xs text-slate-400">Reference location for topocentric Look Angles</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleUseBrowserGps}
                className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
              >
                Use Browser GPS
              </button>
            </div>

            {/* Presets */}
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Preset Ground Stations</span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                {LOCATION_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPresetLocation(p)}
                    className="p-1.5 rounded bg-slate-950 border border-slate-800 hover:border-slate-700 text-left truncate text-slate-300"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                  Latitude (-90.0° to +90.0°, North positive)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="-90"
                  max="90"
                  value={config.observer.latitude}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      observer: { ...config.observer, latitude: parseFloat(e.target.value) || 0 }
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                  Longitude (-180.0° to +180.0°, East positive)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="-180"
                  max="180"
                  value={config.observer.longitude}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      observer: { ...config.observer, longitude: parseFloat(e.target.value) || 0 }
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                  Altitude Above Sea Level (Meters)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="10000"
                  value={config.observer.altitudeMeters}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      observer: { ...config.observer, altitudeMeters: parseFloat(e.target.value) || 0 }
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* 2. Motion Limits & Stepper Calibration (6 cols) */}
          <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-mono">Motor & Gear Calibration</h3>
                <p className="text-xs text-slate-400">28BYJ-48 steps-per-degree & speed limits</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                    Azimuth Steps/° (~40.25)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={config.motion.azimuthStepsPerDegree}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        motion: { ...config.motion, azimuthStepsPerDegree: parseFloat(e.target.value) || 1 }
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                    Elevation Steps/° (~40.42)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={config.motion.elevationStepsPerDegree}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        motion: { ...config.motion, elevationStepsPerDegree: parseFloat(e.target.value) || 1 }
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                    Max Az Speed (Max 5.0°/s)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5.0"
                    value={config.motion.maxAzimuthSpeedDegS}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        motion: { ...config.motion, maxAzimuthSpeedDegS: parseFloat(e.target.value) || 1 }
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                    Max El Speed (Max 5.0°/s)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5.0"
                    value={config.motion.maxElevationSpeedDegS}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        motion: { ...config.motion, maxElevationSpeedDegS: parseFloat(e.target.value) || 1 }
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                    Az Zero Offset (°)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.motion.azimuthOffsetDeg}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        motion: { ...config.motion, azimuthOffsetDeg: parseFloat(e.target.value) || 0 }
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                    El Zero Offset (°)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.motion.elevationOffsetDeg}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        motion: { ...config.motion, elevationOffsetDeg: parseFloat(e.target.value) || 0 }
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                  Backlash Compensation (° &bull; Unidirectional Approach)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={config.motion.backlashCompensationDeg}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      motion: { ...config.motion, backlashCompensationDeg: parseFloat(e.target.value) || 0 }
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs font-mono text-slate-400">
            {hasUnsavedChanges ? (
              <span className="text-amber-300">Unsaved parameter modifications pending write.</span>
            ) : (
              <span className="text-slate-500">Tracker configuration synchronized.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={!hasUnsavedChanges || saving}
              className="px-4 py-2 text-xs font-medium font-mono text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={!hasUnsavedChanges || saving}
              className="px-5 py-2 text-xs font-bold font-mono text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              {saving ? 'Writing to Flash...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </form>
      </div>
      )}
    </div>
  );
}
