'use client';

import React from 'react';
import Link from 'next/link';
import { useTracker } from '@/context/TrackerContext';
import {
  Satellite,
  Compass,
  Radio,
  Sliders,
  Cpu,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Activity,
  Download
} from '@/components/ui/icons';

const BOM_ITEMS = [
  { item: 'ESP32-WROOM-32 DevKit', qty: '1', cost: 400, notes: 'Dual-core 240MHz, 2.4GHz Wi-Fi/BT' },
  { item: '28BYJ-48 Steppers (5V unipolar)', qty: '2', cost: 200, notes: '~4076 half-steps/rev via internal ~1:64 gearbox' },
  { item: 'ULN2003 Driver Modules', qty: '2', cost: 90, notes: 'Darlington array (external 5V rail)' },
  { item: '608ZZ Bearings (8x22x7 mm)', qty: '4', cost: 135, notes: 'Dual bearings per axis for radial load' },
  { item: 'MPU-6050 (GY-521) IMU', qty: '1', cost: 141, notes: 'I2C static leveling on startup' },
  { item: 'USB Cable & 5V 2A Power Supply', qty: '1', cost: 100, notes: 'Supplies steppers & dev board' },
  { item: 'Mechanical Limit Switches', qty: '4', cost: 40, notes: 'Endstops for azimuth & elevation homing' },
  { item: 'Jumper Wires & Connectors', qty: '1 set', cost: 50, notes: 'Hookup wiring' },
  { item: 'PLA 3D Printing Filament', qty: '~350g', cost: 100, notes: 'Stratos-based frame & 3.57:1 gearsets' },
  { item: 'M3/M4 Screws & Hardware', qty: 'Assorted', cost: 50, notes: 'Fasteners & standoffs' },
];

const TOTAL_BOM_COST = BOM_ITEMS.reduce((acc, curr) => acc + curr.cost, 0);

const ROADMAP_STEPS = [
  { milestone: 'M3 (March 2026)', title: 'Design & Fabrication', desc: 'Finalize CAD, 3D print gearsets & chassis with 50%+ infill, dry-fit 608ZZ bearings.', status: 'COMPLETED' },
  { milestone: 'M4-M5', title: 'Electronics & Sensors', desc: 'PCB breadboarding, resolve GPIO conflict, bench-test ULN2003 drivers and MPU-6050 I2C.', status: 'IN_PROGRESS' },
  { milestone: 'M6-M7', title: 'Firmware Core', desc: 'Port SGP4 propagator, NTP time sync, limit switch homing sequences, and AccelStepper profiles.', status: 'UPCOMING' },
  { milestone: 'M8-M9', title: 'Bench Validation', desc: 'Simulate NavIC passes, tune steps/deg calibration factors and unidirectional backlash compensation.', status: 'UPCOMING' },
  { milestone: 'M10-M11', title: 'Field Trials', desc: 'Field track real NavIC satellites with patch antenna, compare pointing error against GPS clinometer.', status: 'UPCOMING' },
  { milestone: 'M12', title: 'Open Release', desc: 'Full open-source mechanical release, wiring schematics, and production firmware release.', status: 'UPCOMING' },
];

export default function LandingPage() {
  const { status, telemetry, connectionStatus } = useTracker();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-950/20 via-slate-900 to-slate-950 border border-slate-800 p-8 sm:p-12 shadow-2xl">

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            ISRO NavIC / IRNSS &bull; ESP32 Dual-Axis Satellite Mount
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Autonomous Satellite <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
              Antenna Tracking System
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-8">
            An ultra-low-cost, dual-axis (<code className="text-cyan-300 font-mono">Azimuth 0–360°</code>,{' '}
            <code className="text-cyan-300 font-mono">Elevation 0–90°</code>) satellite tracking mount built with
            28BYJ-48 stepper motors and an ESP32. Autonomously propagates Two-Line Element (TLE) sets in real time
            via SGP4 to steer directional patch antennas toward NavIC constellations.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02]"
            >
              <Compass className="w-4 h-4" />
              Launch Live Dashboard
              <ChevronRight className="w-4 h-4" />
            </Link>

            <Link
              href="/control"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-all"
            >
              <Radio className="w-4 h-4 text-cyan-400" />
              Manual Motor Control
            </Link>

            <a
              href="file:///c:/Users/pc/Downloads/DTU/docs/API.md"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-lg text-slate-400 hover:text-slate-200 text-sm font-mono transition-colors"
            >
              Firmware API Docs &rarr;
            </a>
          </div>
        </div>

        {/* Live Status Summary Card */}
        <div className="mt-10 pt-8 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Tracker Status</div>
            <div className="text-lg font-bold text-white font-mono flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              {status?.state || (connectionStatus === 'connected' ? 'ONLINE' : 'CONNECTING')}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Homed: <span className={status?.homed ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>{status?.homed ? 'YES' : 'NO'}</span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Target Satellite</div>
            <div className="text-base font-bold text-cyan-300 font-mono truncate" title={status?.satelliteName || 'NavIC-1B'}>
              {status?.satelliteName || 'NavIC-1B (IRNSS)'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              NORAD #{status?.noradId || 39635}
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Current Mount Angles</div>
            <div className="text-lg font-bold text-white font-mono">
              {telemetry ? `${telemetry.currentAngles.azimuth.toFixed(1)}° / ${telemetry.currentAngles.elevation.toFixed(1)}°` : '---° / ---°'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Azimuth / Elevation
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">Pointing Error</div>
            <div className="text-lg font-bold font-mono text-emerald-400">
              {telemetry ? `${telemetry.trackingErrorDeg.toFixed(2)}°` : '0.00°'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              IMU Tilt: {telemetry ? `${telemetry.imu.pitch.toFixed(1)}°` : '0.0°'}
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Key System Features</h2>
          <p className="text-sm text-slate-400">Engineered for autonomous field deployment and robust telemetry streaming</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
              <Satellite className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Autonomous SGP4 Orbit Propagation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Propagates satellite orbital state vectors directly into topocentric Az/El look angles for the observer's exact latitude, longitude, and elevation using standard Two-Line Element (TLE) sets.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-all">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Dual-Axis Stepper Control</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Precision gear reduction (3.57:1 Stratos gearsets) coupled with 28BYJ-48 unipolar steppers (~4076 half-steps/rev). Features unidirectional backlash compensation and conservative speed clamping (&lt; 5°/s).
            </p>
          </div>

          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-all">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">Lightweight Telemetry Stream</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ultra-compact WebSocket wire format strictly bounded to &lt; 300 bytes per frame at 1-2 Hz. Delivers live current vs target angles, homing status, MPU-6050 leveling telemetry, and RF RSSI.
            </p>
          </div>
        </div>
      </section>

      {/* Hardware & Bill of Materials (INR 1,200) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Hardware & Bill of Materials (BOM)</h2>
            <p className="text-sm text-slate-400">Total estimated build cost is under ₹1,300 (~$15 USD), using standard commodity maker parts</p>
          </div>
          <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono font-bold text-sm">
            Total Cost: ~₹{TOTAL_BOM_COST.toLocaleString()} INR
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Component</th>
                <th className="px-4 py-3 font-semibold">Quantity</th>
                <th className="px-4 py-3 font-semibold">Cost (INR)</th>
                <th className="px-4 py-3 font-semibold">Engineering Role & Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {BOM_ITEMS.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    {row.item}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{row.qty}</td>
                  <td className="px-4 py-3 text-emerald-400 font-bold">₹{row.cost}</td>
                  <td className="px-4 py-3 text-slate-400 font-sans text-xs">{row.notes}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-900/90 font-bold text-slate-200 border-t border-slate-800">
              <tr>
                <td className="px-4 py-3 text-cyan-300">Total Bill of Materials</td>
                <td className="px-4 py-3 text-slate-400">-</td>
                <td className="px-4 py-3 text-emerald-300 text-sm">₹{TOTAL_BOM_COST} INR</td>
                <td className="px-4 py-3 text-slate-400 font-sans text-xs">Excludes 3D printer machine time; components available from Indian distributors</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* 2026 Roadmap */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Project Roadmap (2026)</h2>
          <p className="text-sm text-slate-400">Milestone schedule from mechanical prototype to autonomous field validation</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROADMAP_STEPS.map((step, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-xl border transition-all ${
                step.status === 'COMPLETED'
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : step.status === 'IN_PROGRESS'
                  ? 'bg-cyan-950/30 border-cyan-500/40 shadow-lg shadow-cyan-950/20'
                  : 'bg-slate-900/40 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-cyan-400">{step.milestone}</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                    step.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : step.status === 'IN_PROGRESS'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {step.status}
                </span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1.5">{step.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
