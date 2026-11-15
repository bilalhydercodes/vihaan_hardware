'use client';

import React, { useState, useEffect } from 'react';
import { useTracker } from '@/context/TrackerContext';
import { getCustomTrackerUrl, setCustomTrackerUrl, clearCustomTrackerUrl } from '@/lib/api';
import { Key, Lock, CheckCircle, X, Wifi, Radio } from '@/components/ui/icons';

export function TokenModal() {
  const {
    authToken,
    setAuthToken,
    clearAuthToken,
    isTokenModalOpen,
    setTokenModalOpen,
    refreshStatus,
    connectUsb,
    disconnectUsb,
    isUsbConnected,
    connectionMethod
  } = useTracker();
  const [tokenInput, setTokenInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [connectingUsb, setConnectingUsb] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  useEffect(() => {
    if (authToken) {
      setTokenInput(authToken);
    } else {
      setTokenInput('navic-secret-token-123');
    }
    setUrlInput(getCustomTrackerUrl() || 'http://10.254.214.136:8080');
  }, [authToken, isTokenModalOpen]);

  if (!isTokenModalOpen) return null;

  const handleConnectUsb = async () => {
    setConnectingUsb(true);
    try {
      const ok = await connectUsb(baudRate);
      if (ok) {
        setShowSavedFeedback(true);
        setTimeout(() => {
          setShowSavedFeedback(false);
          setTokenModalOpen(false);
        }, 600);
      }
    } finally {
      setConnectingUsb(false);
    }
  };

  const handleDisconnectUsb = async () => {
    await disconnectUsb();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      setAuthToken(tokenInput.trim());
    }
    const cleanUrl = urlInput.trim() || 'http://10.254.214.136:8080';
    try {
      await fetch('/api/v1/hardware/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl })
      });
    } catch {}
    setShowSavedFeedback(true);
    await refreshStatus();
    setTimeout(() => {
      setShowSavedFeedback(false);
      setTokenModalOpen(false);
    }, 700);
  };

  const handleClear = () => {
    clearAuthToken();
    clearCustomTrackerUrl();
    setTokenInput('navic-secret-token-123');
    setUrlInput('http://10.254.214.136:8080');
    refreshStatus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl p-6 text-slate-800 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setTokenModalOpen(false)}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-600">
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Connect Antenna Motors</h2>
            <p className="text-xs text-slate-500">Choose how your board is plugged into this computer</p>
          </div>
        </div>

        {/* METHOD 1: Direct USB Cable Connection */}
        <div className="p-4 mb-4 rounded-xl bg-sky-50/80 border border-sky-200 text-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-sky-950">Option 1: USB Cable (Easiest & Fastest)</span>
            {isUsbConnected && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> USB Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Plug your board into your laptop using a USB cable. Then click the button below and select it.
          </p>

          <div className="flex items-center gap-2 pt-1">
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(Number(e.target.value))}
              disabled={isUsbConnected}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value={115200}>ESP32 Board</option>
              <option value={9600}>Arduino Uno Board</option>
            </select>

            {isUsbConnected ? (
              <button
                type="button"
                onClick={handleDisconnectUsb}
                className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-xl transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectUsb}
                disabled={connectingUsb}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                {connectingUsb ? 'Selecting device...' : '🔌 Connect USB Cable'}
              </button>
            )}
          </div>
        </div>

        {/* METHOD 2: Wi-Fi REST Connection */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900">Option 2: Wi-Fi Address</span>
              {connectionMethod === 'wifi' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Wi-Fi Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">
              If your tracker is running wirelessly on Wi-Fi, enter its IP address:
            </p>

            <div>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="e.g. http://10.254.214.136:8080"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors shadow-2xs font-mono"
              />
            </div>
          </div>

          {/* Collapsible Advanced Password Setting */}
          <details className="text-xs text-slate-600 group">
            <summary className="font-semibold text-slate-500 hover:text-slate-800 cursor-pointer select-none">
              Advanced: Password Token (Optional)
            </summary>
            <div className="pt-2">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="navic-secret-token-123"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default password: navic-secret-token-123</span>
            </div>
          </details>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-slate-500 hover:text-rose-600 transition-colors underline cursor-pointer"
            >
              Reset to Defaults
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setTokenModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {showSavedFeedback ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-white" />
                    <span>Connected!</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span>Save Wi-Fi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
