'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  ChevronDown,
  Menu,
  X
} from '@/components/ui/icons';

const mainNavItems = [
  { name: 'Home', href: '/', icon: Satellite },
  { name: 'Dashboard', href: '/dashboard', icon: Compass },
  { name: 'Control', href: '/control', icon: Radio },
  { name: 'Settings', href: '/settings', icon: Sliders },
];

const moreNavItems = [
  { name: 'Satellite Data', href: '/tle', icon: FileText, desc: 'Update satellite orbital data' },
  { name: 'History', href: '/logs', icon: Activity, desc: 'View past tracking history & download' },
  { name: 'About', href: '/about', icon: Satellite, desc: 'Hardware details & parts' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { connectionStatus, authToken, setTokenModalOpen } = useTracker();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isMoreActive = moreNavItems.some((item) => pathname === item.href);

  // Close dropdown cleanly when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMoreDropdownOpen(false);
      }
    }
    if (moreDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreDropdownOpen]);

  const handleMoreNavigation = (href: string) => {
    setMoreDropdownOpen(false);
    router.push(href);
  };

  return (
    <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/20 transition-all">
                <Satellite className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold tracking-tight text-base sm:text-lg text-white group-hover:text-cyan-300 transition-colors">
                  NAVIC<span className="text-cyan-400">-TRACK</span>
                </span>
                <span className="hidden sm:block text-[11px] text-slate-400">
                  Antenna Tracker
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1.5">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-cyan-400" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {/* "More" Dropdown Menu */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    isMoreActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <span>More</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${moreDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {moreDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-1.5 z-50">
                    {moreNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={(e) => {
                            e.preventDefault();
                            handleMoreNavigation(item.href);
                          }}
                          className={`flex items-start gap-2.5 px-3.5 py-2.5 text-sm transition-colors cursor-pointer select-none ${
                            isActive
                              ? 'bg-cyan-500/15 text-cyan-300'
                              : 'text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          <Icon className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="font-medium text-white">{item.name}</div>
                            <div className="text-xs text-slate-400">{item.desc}</div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Right Status Indicators & Auth */}
          <div className="flex items-center gap-2.5">
            {/* Live Connection Badge with clear text */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-950/50 border-amber-500/40 text-amber-300'
                  : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
              }`}
            >
              {connectionStatus === 'connected' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Connected</span>
                </>
              ) : connectionStatus === 'connecting' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Not Connected</span>
                </>
              )}
            </div>

            {/* Auth Token Button */}
            <button
              onClick={() => setTokenModalOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                authToken
                  ? 'bg-slate-900 border-emerald-500/40 text-emerald-300 hover:border-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
              }`}
            >
              {authToken ? (
                <>
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Token Set</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Enter Token</span>
                </>
              )}
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center gap-1.5 p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium border border-slate-800"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? (
                <>
                  <X className="w-4 h-4" />
                  <span>Close</span>
                </>
              ) : (
                <>
                  <Menu className="w-4 h-4" />
                  <span>Menu</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 pt-3 pb-5 space-y-2">
          <div className="text-xs font-semibold text-slate-400 px-3 uppercase tracking-wider">Main Pages</div>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-5 h-5 text-cyan-400" />
                <span>{item.name}</span>
              </Link>
            );
          })}

          <div className="pt-2 text-xs font-semibold text-slate-400 px-3 uppercase tracking-wider">More Tools</div>
          {moreNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="w-5 h-5 text-cyan-400" />
                <div>
                  <div>{item.name}</div>
                  <div className="text-xs text-slate-400">{item.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
