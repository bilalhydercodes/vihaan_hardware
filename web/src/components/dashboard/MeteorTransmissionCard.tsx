'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Satellite,
  Activity,
  Sliders,
  Download,
  Play,
  Pause,
  RefreshCw,
  Info,
  CheckCircle,
  Clock,
  Target
} from '@/components/ui/icons';

export type ChannelKey = 'rgb' | 'thermal' | 'visible' | 'nearir';

interface ChannelInfo {
  key: ChannelKey;
  label: string;
  shortLabel: string;
  badge: string;
  imageSrc: string;
  wavelength: string;
  description: string;
  features: string;
}

const CHANNELS: Record<ChannelKey, ChannelInfo> = {
  rgb: {
    key: 'rgb',
    label: 'Natural Color RGB',
    shortLabel: 'RGB Composite',
    badge: 'Ch 1+2+3 Composite',
    imageSrc: '/meteor-m2-msu-mr-rgb.png',
    wavelength: '0.5 – 1.1 µm Multispectral',
    description: 'Calibrated natural color Earth surface, cyclone spiral, ocean and coastline bathymetry.',
    features: 'True albedo cloud tops, deep sea navy, terrain vegetation & coastal contours.'
  },
  thermal: {
    key: 'thermal',
    label: 'Thermal IR 11µm',
    shortLabel: 'Thermal IR (Ch 3)',
    badge: 'MSU-MR Ch 3 / 11µm',
    imageSrc: '/meteor-m2-msu-mr-thermal.png',
    wavelength: '10.5 – 12.5 µm Longwave IR',
    description: 'Atmospheric brightness temperature contours. High convective cloud tops (-55°C) highlighted in cyan/white.',
    features: 'Convection storm cores in magenta/white, warm sea surfaces (+26°C) in indigo, landmass thermal radiation in amber.'
  },
  visible: {
    key: 'visible',
    label: 'Visible 0.65µm',
    shortLabel: 'Visible (Ch 1)',
    badge: 'MSU-MR Ch 1 / 0.65µm',
    imageSrc: '/meteor-m2-msu-mr-visible.png',
    wavelength: '0.50 – 0.70 µm Visible Red',
    description: 'High-contrast solar albedo reflectance scan with fine cloud eddy relief.',
    features: 'Cumulonimbus cloud edges, frontal boundary vortices, atmospheric shadow contrast.'
  },
  nearir: {
    key: 'nearir',
    label: 'Near-IR 0.85µm',
    shortLabel: 'Near-IR (Ch 2)',
    badge: 'MSU-MR Ch 2 / 0.85µm',
    imageSrc: '/meteor-m2-msu-mr-nearir.png',
    wavelength: '0.70 – 1.10 µm Reflected NIR',
    description: 'Strong water absorption band distinguishing landmass from sea with maximum coastline delineation.',
    features: 'Pitch black water bodies (100% absorption), bright vegetative chlorophyll albedo, high-relief cloud tops.'
  }
};

interface MeteorTransmissionCardProps {
  className?: string;
  compact?: boolean;
}

export function MeteorTransmissionCard({ className = '', compact = false }: MeteorTransmissionCardProps) {
  // Active spectral channel
  const [selectedChannel, setSelectedChannel] = useState<ChannelKey>('rgb');
  const [showTooltip, setShowTooltip] = useState(false);
  const [showConstellation, setShowConstellation] = useState(false);

  // Mounted & Live UTC Reception Clock state (avoids SSR hydration mismatch)
  const [mounted, setMounted] = useState(false);
  const [rxTime, setRxTime] = useState('04:11:35');

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      setRxTime(new Date().toISOString().substring(11, 19));
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Live Demodulation Simulation State
  const [isSimulating, setIsSimulating] = useState(true);
  const [scanProgress, setScanProgress] = useState(78.5); // percentage (0 - 100)
  const [packetsReceived, setPacketsReceived] = useState(18420);
  const [badPackets, setBadPackets] = useState(0);
  const [scanLines, setScanLines] = useState(804); // current line out of 1024
  const [scanSpeed, setScanSpeed] = useState<number>(1); // 1x, 2x, 4x

  // Dynamic Telemetry Micro-Fluctuations (Simulating real RF frontend)
  const [rssi, setRssi] = useState(-84.2);
  const [snr, setSnr] = useState(15.2);
  const [dopplerHz, setDopplerHz] = useState(1587);
  const [bitrateKbps, setBitrateKbps] = useState(72.0);

  // Zoom / Viewport controls
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });

  const currentChannel = CHANNELS[selectedChannel];

  // RF Carrier Micro-fluctuations simulation effect
  useEffect(() => {
    const timer = setInterval(() => {
      // Natural RF propagation flutter
      const dRssi = (Math.random() - 0.5) * 0.4;
      setRssi(prev => {
        const val = prev + dRssi;
        return Math.max(-88, Math.min(-80, parseFloat(val.toFixed(1))));
      });

      const dSnr = (Math.random() - 0.5) * 0.2;
      setSnr(prev => {
        const val = prev + dSnr;
        return Math.max(14.4, Math.min(16.0, parseFloat(val.toFixed(1))));
      });

      // Doppler decreases as satellite moves past TCA (Time of Closest Approach)
      setDopplerHz(prev => {
        const step = -1.2;
        const val = prev + step;
        return val < -2800 ? 2800 : Math.round(val);
      });

      setBitrateKbps(parseFloat((72.0 + (Math.random() - 0.5) * 0.04).toFixed(2)));
    }, 1200);

    return () => clearInterval(timer);
  }, []);

  // Live Demodulation Scanline Loop
  useEffect(() => {
    if (!isSimulating) return;

    const intervalTime = 65 / scanSpeed;
    const interval = setInterval(() => {
      setScanProgress(prev => {
        const next = prev + 0.18 * scanSpeed;
        if (next >= 100) {
          // Wrapped pass scanline
          setScanLines(1024);
          return 0; // loop back for continuous interactive demonstration
        }
        const currentLine = Math.min(1024, Math.round((next / 100) * 1024));
        setScanLines(currentLine);
        return next;
      });

      setPacketsReceived(prev => prev + Math.floor(Math.random() * 2) + 1);

      // Rare bit error corrected by Reed-Solomon
      if (Math.random() < 0.002) {
        setBadPackets(p => p + 1);
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isSimulating, scanSpeed]);

  const handleResetScan = () => {
    setScanProgress(0);
    setScanLines(0);
    setPacketsReceived(14200);
    setBadPackets(0);
    setIsSimulating(true);
  };

  const handleToggleSimulate = () => {
    setIsSimulating(!isSimulating);
  };

  // Pan / drag handlers for satellite image viewport
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    setIsPanning(true);
    dragStart.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Convert RSSI dBm to percentage bar (from -110 dBm floor to -60 dBm max)
  const rssiPercent = Math.max(5, Math.min(100, Math.round(((rssi - -110) / (-60 - -110)) * 100)));
  // Convert SNR dB to percentage bar (from 0 dB to 20 dB max)
  const snrPercent = Math.max(5, Math.min(100, Math.round((snr / 20) * 100)));

  return (
    <div className={`bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-4 ${className}`}>
      {/* 1. Header Bar: Satellite Name, Reception Mode, QPSK Status Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-black text-slate-900 text-base sm:text-lg tracking-tight leading-none">
                METEOR-M2-4 Live LRPT Reception
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                QPSK CARRIER LOCKED
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              137.100 MHz VHF • MSU-MR Multispectral Earth Scan • DTU Ground Station
            </p>
          </div>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              aria-label="LRPT Telemetry Specifications"
            >
              <Info className="w-4 h-4" />
            </button>
            {showTooltip && (
              <div className="absolute left-6 top-0 w-72 p-3 bg-slate-900 text-white text-[11px] rounded-xl shadow-xl z-30 pointer-events-none leading-relaxed border border-slate-700">
                <div className="font-bold text-sky-400 mb-1">METEOR-M2-4 LRPT Telemetry</div>
                Real-time Low Rate Picture Transmission (LRPT) decoded at 72 kbps QPSK modulation from the MSU-MR scanning radiometer aboard Russian polar orbiter METEOR-M2 4 (NORAD #59051).
              </div>
            )}
          </div>
        </div>

        {/* Action Controls: Live Demodulation Toggle & Constellation Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setShowConstellation(!showConstellation)}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              showConstellation
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Toggle I/Q Demodulator Constellation"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">QPSK</span> Constellation
          </button>

          <button
            onClick={handleToggleSimulate}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
              isSimulating
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            {isSimulating ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Demodulating</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume Stream</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. RF Signal Carrier Telemetry Dashboard Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        {/* Metric 1: Frequency & Bandwidth */}
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>RF Frequency</span>
            <span className="text-[10px] font-bold text-sky-700 bg-sky-100/70 px-1.5 py-0.2 rounded">VHF RHCP</span>
          </div>
          <div className="my-1">
            <span className="text-lg font-black text-slate-900 tracking-tight">137.100</span>
            <span className="text-xs text-slate-500 font-semibold ml-1">MHz</span>
          </div>
          <div className="text-[10px] text-slate-500 flex items-center justify-between">
            <span>BW: 120 kHz</span>
            <span className="text-emerald-700 font-bold">Locked</span>
          </div>
        </div>

        {/* Metric 2: RSSI Signal Strength with Live Meter */}
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>Signal Strength</span>
            <span className="text-[10px] font-mono text-emerald-700 font-bold">{rssiPercent}%</span>
          </div>
          <div className="my-1">
            <span className="text-lg font-black text-slate-900 tracking-tight">{rssi}</span>
            <span className="text-xs text-slate-500 font-semibold ml-1">dBm</span>
          </div>
          {/* Signal Level Bar */}
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 rounded-full transition-all duration-300"
              style={{ width: `${rssiPercent}%` }}
            />
          </div>
        </div>

        {/* Metric 3: SNR Lock Meter */}
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>Carrier SNR</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded">
              +{snr >= 5.5 ? 'SYNC' : 'SEARCH'}
            </span>
          </div>
          <div className="my-1">
            <span className="text-lg font-black text-emerald-700 tracking-tight">+{snr}</span>
            <span className="text-xs text-slate-500 font-semibold ml-1">dB</span>
          </div>
          {/* SNR Lock Bar (Threshold mark at 5.5 dB) */}
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden relative">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${snrPercent}%` }}
            />
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-rose-500"
              style={{ left: `${(5.5 / 20) * 100}%` }}
              title="QPSK Minimum Lock Threshold: +5.5 dB"
            />
          </div>
        </div>

        {/* Metric 4: Doppler Offset & AFC */}
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>Doppler (AFC)</span>
            <span className="text-[10px] font-mono text-sky-700 font-semibold">Active</span>
          </div>
          <div className="my-1">
            <span className="text-lg font-black text-slate-900 tracking-tight">
              {dopplerHz > 0 ? `+${dopplerHz}` : dopplerHz}
            </span>
            <span className="text-xs text-slate-500 font-semibold ml-1">Hz</span>
          </div>
          <div className="text-[10px] text-slate-500 flex items-center justify-between">
            <span>Track: Approaching</span>
            <span className="text-sky-700 font-bold">Auto-AFC</span>
          </div>
        </div>

        {/* Metric 5: Demodulator Mode & FEC */}
        <div className="col-span-2 md:col-span-1 bg-slate-50/90 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
            <span>Demod & FEC</span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.2 rounded">R-S Synced</span>
          </div>
          <div className="my-1">
            <span className="text-lg font-black text-slate-900 tracking-tight">QPSK</span>
            <span className="text-xs text-slate-500 font-semibold ml-1">72 kbps</span>
          </div>
          <div className="text-[10px] text-slate-500 flex items-center justify-between">
            <span>Viterbi: r=1/2</span>
            <span className="text-emerald-700 font-bold">BER 0.0e-6</span>
          </div>
        </div>
      </div>

      {/* Optional Interactive I/Q Constellation Diagram Drawer */}
      {showConstellation && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-white flex flex-col sm:flex-row items-center gap-4 transition-all">
          <div className="relative w-28 h-28 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
            {/* Axis grid */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-px bg-slate-700" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-px bg-slate-700" />
            </div>
            {/* Unit circle */}
            <div className="w-20 h-20 rounded-full border border-dashed border-slate-700/80 absolute" />
            {/* 4 QPSK Constellation Clusters */}
            {/* Cluster 1: Top-Right (00) */}
            <div className="absolute top-4 right-4 w-3.5 h-3.5 bg-emerald-400/80 rounded-full blur-[1px] animate-pulse" />
            <div className="absolute top-5 right-5 w-1.5 h-1.5 bg-white rounded-full" />
            {/* Cluster 2: Top-Left (01) */}
            <div className="absolute top-4 left-4 w-3.5 h-3.5 bg-emerald-400/80 rounded-full blur-[1px] animate-pulse" />
            <div className="absolute top-5 left-5 w-1.5 h-1.5 bg-white rounded-full" />
            {/* Cluster 3: Bottom-Left (11) */}
            <div className="absolute bottom-4 left-4 w-3.5 h-3.5 bg-emerald-400/80 rounded-full blur-[1px] animate-pulse" />
            <div className="absolute bottom-5 left-5 w-1.5 h-1.5 bg-white rounded-full" />
            {/* Cluster 4: Bottom-Right (10) */}
            <div className="absolute bottom-4 right-4 w-3.5 h-3.5 bg-emerald-400/80 rounded-full blur-[1px] animate-pulse" />
            <div className="absolute bottom-5 right-5 w-1.5 h-1.5 bg-white rounded-full" />
            {/* Dynamic noise points */}
            <div className="absolute top-3 right-5 w-1 h-1 bg-emerald-300/60 rounded-full" />
            <div className="absolute bottom-6 left-3 w-1 h-1 bg-emerald-300/60 rounded-full" />
          </div>
          <div className="space-y-1 text-xs">
            <div className="font-bold text-sky-400 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>QPSK Demodulator Lock (Quadrature Phase-Shift Keying)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              4 distinct constellation points indicate excellent symbol synchronization, tight Phase-Locked Loop (PLL) tracking, and zero phase ambiguities.
            </p>
            <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1">
              <span>Symbol Rate: <strong className="text-slate-200">72 kbaud</strong></span>
              <span>•</span>
              <span>EVM: <strong className="text-emerald-400">4.2% RMS</strong></span>
              <span>•</span>
              <span>Carrier Lock: <strong className="text-emerald-400">Costas Loop ON</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Multispectral Channel Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {(Object.keys(CHANNELS) as ChannelKey[]).map(key => {
            const ch = CHANNELS[key];
            const isSelected = selectedChannel === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedChannel(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {key === 'rgb' && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                {key === 'thermal' && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                {key === 'visible' && <span className="w-2 h-2 rounded-full bg-sky-500" />}
                {key === 'nearir' && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                <span>{ch.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Viewport Zoom & Reset Controls */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 self-end sm:self-auto">
          <button
            onClick={() => {
              setZoomLevel(prev => (prev >= 2.0 ? 1.0 : prev + 0.5));
              setPanOffset({ x: 0, y: 0 });
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition-colors flex items-center gap-1"
            title="Toggle Magnification (1x / 1.5x / 2x)"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{zoomLevel}x Zoom</span>
          </button>

          <a
            href={currentChannel.imageSrc}
            download={`meteor-m2-${selectedChannel}-scan.png`}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition-colors flex items-center gap-1"
            title="Download full-resolution channel PNG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PNG</span>
          </a>
        </div>
      </div>

      {/* 4. Real Received Satellite Imagery Display with Live Demodulation Scanline */}
      <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group">
        {/* Main Satellite Imagery Swath Viewport */}
        <div
          className={`relative w-full h-[360px] sm:h-[440px] md:h-[490px] flex items-center justify-center overflow-hidden select-none ${
            zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Authentic METEOR-M2 Multispectral Scan Image */}
          <img
            src={currentChannel.imageSrc}
            alt={`METEOR-M2 MSU-MR ${currentChannel.label}`}
            loading="eager"
            className="w-full h-full object-contain pointer-events-none transition-transform duration-200"
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`
            }}
          />

          {/* Live Demodulation Laser Scanline Sweep (Sweeps down as packets arrive) */}
          {isSimulating && (
            <div
              className="absolute left-0 right-0 pointer-events-none z-10 transition-all duration-75"
              style={{ top: `${scanProgress}%` }}
            >
              {/* Glowing Scanline Bar */}
              <div className="w-full h-[2px] bg-cyan-400 shadow-[0_0_12px_#22d3ee,0_0_24px_#06b6d4]" />
              {/* Phosphor sweep tail gradient */}
              <div className="w-full h-8 bg-gradient-to-t from-cyan-500/20 to-transparent pointer-events-none" />
              {/* Scanline Tracker Tag on Right Edge */}
              <div className="absolute right-3 -top-2.5 px-2 py-0.5 rounded bg-cyan-500 text-slate-950 font-mono text-[9px] font-extrabold shadow-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                LINE {scanLines} / 1024
              </div>
            </div>
          )}

          {/* Static Scanline Overlay Pattern (Subtle CRT/Radiometer sensor lines) */}
          <div
            className="absolute inset-0 pointer-events-none opacity-15"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0, 0, 0, 0.7) 4px)'
            }}
          />

          {/* HUD Overlay: Corner Flight Telemetry Badges */}
          {/* Top-Left: Channel & Instrument Spec */}
          <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white text-[11px] font-mono pointer-events-none shadow-md">
            <div className="flex items-center gap-1.5 font-bold text-sky-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{currentChannel.badge}</span>
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">λ = {currentChannel.wavelength}</div>
          </div>

          {/* Top-Right: Satellite Orbit & Coordinate Stamp */}
          <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white text-[10px] font-mono pointer-events-none shadow-md text-right">
            <div className="font-bold text-slate-200">METEOR-M2 4 • NORAD 59051</div>
            <div className="text-slate-400">Alt 820 km • Inc 98.6° SSO</div>
          </div>

          {/* Center Nadir Reticle Crosshair */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
            <div className="w-12 h-12 border border-sky-400/60 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-sky-400 rounded-full" />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-7 text-[9px] font-mono text-sky-300 font-bold bg-slate-900/70 px-1 rounded">
              NADIR 1.0 km/px
            </div>
          </div>

          {/* Bottom-Left: Live Reception Status & Timestamp */}
          <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white text-[10px] font-mono pointer-events-none shadow-md">
            <div className="text-emerald-400 font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span suppressHydrationWarning>RX UTC {mounted ? rxTime : '04:11:35'}</span>
            </div>
            <div className="text-slate-400">DTU Ground Station (28.75°N, 77.12°E)</div>
          </div>

          {/* Bottom-Right: Swath Coverage */}
          <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-white text-[10px] font-mono pointer-events-none shadow-md text-right">
            <div className="text-slate-300">Swath Width: 2,800 km</div>
            <div className="text-slate-400">Scan: 400 lines/min</div>
          </div>
        </div>

        {/* Live Reception Status Strip (Under Image Viewport) */}
        <div className="bg-slate-900/90 border-t border-slate-800 p-2.5 px-3 flex flex-wrap items-center justify-between gap-3 text-white text-xs">
          {/* Packet Counters */}
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <div>
              <span className="text-slate-400">Packets RX: </span>
              <span className="text-emerald-400 font-bold">{packetsReceived.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-400">Dropped: </span>
              <span className="text-slate-300 font-bold">{badPackets}</span>
            </div>
            <div>
              <span className="text-slate-400">Scan Lines: </span>
              <span className="text-sky-400 font-bold">{scanLines} / 1024</span>
            </div>
            <div className="hidden sm:inline">
              <span className="text-slate-400">Rate: </span>
              <span className="text-slate-300 font-bold">{bitrateKbps} kbps</span>
            </div>
          </div>

          {/* Scan Controls (Speed & Reset) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5">
              {[1, 2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => setScanSpeed(s)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                    scanSpeed === s ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <button
              onClick={handleResetScan}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1"
              title="Restart Scanline Reception"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Channel Description & Meteorological Features Bar */}
      <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900">{currentChannel.label}</span>
            <span className="text-[10px] font-bold text-sky-700 bg-sky-100/90 px-1.5 py-0.2 rounded">
              {currentChannel.wavelength}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {currentChannel.description}
          </p>
        </div>
        <div className="text-[10px] text-sky-900/80 bg-white/80 border border-sky-200/80 rounded-lg px-2.5 py-1.5 shrink-0">
          <span className="font-semibold text-sky-950">Features: </span>
          {currentChannel.features}
        </div>
      </div>

      {/* 6. Metadata Bar: Radiometer Instrument Specs & Ground Station Details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-[11px]">
        <div>
          <span className="text-slate-400 block text-[10px]">Sensor Instrument</span>
          <span className="font-bold text-slate-800">MSU-MR Radiometer</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Nadir Spatial Resolution</span>
          <span className="font-bold text-slate-800">1.0 km / pixel</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Orbital Elevation</span>
          <span className="font-bold text-slate-800">820 km Sun-Sync Polar</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Ground Station Terminal</span>
          <span className="font-bold text-slate-800">DTU New Delhi (137 MHz)</span>
        </div>
      </div>
    </div>
  );
}
