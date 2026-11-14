'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTracker } from '@/context/TrackerContext';
import {
  Satellite,
  Compass,
  Radio,
  Sliders,
  FileText,
  Activity,
  Key,
  Lock,
  Wifi,
  WifiOff,
  Clock,
  Menu,
  X
} from '@/components/ui/icons';

const navItems = [
  { name: 'Overview', href: '/', icon: Satellite },
  { name: 'Dashboard', href: '/dashboard', icon: Compass },
  { name: 'Control', href: '/control', icon: Radio },
  { name: 'TLE Data', href: '/tle', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Sliders },
  { name: 'Logs', href: '/logs', icon: Activity },
];

export function Navbar() {
  const pathname = usePathname();
  const { connectionStatus, authToken, setTokenModalOpen, status, telemetry } = useTracker();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:border-cyan-500/40 group-hover:bg-cyan-500/20 transition-all">
                <Satellite className="w-5 h-5 transition-transform group-hover:rotate-12" />
              </div>
              <div>
                <span className="font-mono font-bold tracking-wider text-base text-white group-hover:text-cyan-300 transition-colors">
                  NAVIC<span className="text-cyan-400">-TRACK</span>
                </span>
                <span className="hidden sm:block text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                  2-Axis Satellite Mount
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Status Indicators & Auth */}
          <div className="flex items-center gap-2.5">
            {/* Time Sync Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>TIME:</span>
              <span
                className={`font-semibold ${
                  status?.timeSync === 'SYNCED'
                    ? 'text-emerald-400'
                    : status?.timeSync === 'MANUAL'
                    ? 'text-cyan-400'
                    : 'text-amber-400'
                }`}
              >
                {status?.timeSync || 'SYNCING'}
              </span>
            </div>

            {/* Live Connection Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}
            >
              {connectionStatus === 'connected' ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span>LIVE</span>
                  {telemetry?.rssi && (
                    <span className="text-[10px] text-slate-400">({telemetry.rssi}dBm)</span>
                  )}
                </>
              ) : connectionStatus === 'connecting' ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>CONNECTING</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-rose-400" />
                  <span>OFFLINE</span>
                </>
              )}
            </div>

            {/* Auth Token Button */}
            <button
              onClick={() => setTokenModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium border transition-all cursor-pointer ${
                authToken
                  ? 'bg-slate-900 border-emerald-500/40 text-emerald-300 hover:border-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
              }`}
              title={authToken ? 'Token configured' : 'Configure token for motor control'}
            >
              {authToken ? (
                <>
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">AUTH OK</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">SET TOKEN</span>
                </>
              )}
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 text-cyan-400" />
                {item.name}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}

