'use client';

import React, { useState } from 'react';
import { trackerApi } from '@/lib/api';
import { validateTle, calculateTleChecksum } from '@/lib/tle-validator';
import { useTracker } from '@/context/TrackerContext';
import { FileText, CheckCircle, AlertTriangle, Download, RefreshCw } from '@/components/ui/icons';

interface TleEditorProps {
  onSuccess: (msg: string) => void;
  onError: (err: string) => void;
}

export function TleEditor({ onSuccess, onError }: TleEditorProps) {
  const { authToken, setTokenModalOpen, refreshStatus } = useTracker();

  const [name, setName] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-line paste area state
  const [rawPaste, setRawPaste] = useState('');

  const handleParseRawPaste = (text: string) => {
    setRawPaste(text);
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length >= 2) {
      if (lines.length >= 3 && !lines[0].startsWith('1 ') && lines[1].startsWith('1 ') && lines[2].startsWith('2 ')) {
        setName(lines[0]);
        setLine1(lines[1]);
        setLine2(lines[2]);
      } else if (lines[0].startsWith('1 ') && lines[1].startsWith('2 ')) {
        setLine1(lines[0]);
        setLine2(lines[1]);
        const norad = lines[0].substring(2, 7).trim();
        setName(`SAT-${norad}`);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) handleParseRawPaste(content);
    };
    reader.readAsText(file);
  };

  const validation = validateTle(name, line1, line2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authToken) {
      setTokenModalOpen(true);
      return;
    }

    if (!validation.isValid) {
      onError(`Invalid TLE format: ${validation.errors.join(' ')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await trackerApi.setTle({
        satelliteName: name.trim(),
        line1: line1.trim(),
        line2: line2.trim()
      });
      await refreshStatus();
      onSuccess(`New TLE for ${res.satelliteName} uploaded and written to tracker flash memory successfully!`);
      setRawPaste('');
    } catch (err: any) {
      onError(err.message || 'Failed to upload TLE to tracker');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-mono">Upload / Paste New TLE</h3>
            <p className="text-xs text-slate-400">Inject custom orbital elements with strict checksum and length verification</p>
          </div>
        </div>

        {/* File upload button */}
        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-mono font-medium text-slate-200 transition-colors cursor-pointer">
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>Upload .tle file</span>
          <input
            type="file"
            accept=".tle,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Multi-line Paste Box */}
      <div>
        <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
          Quick Paste 2-Line or 3-Line TLE Block
        </label>
        <textarea
          rows={3}
          value={rawPaste}
          onChange={(e) => handleParseRawPaste(e.target.value)}
          placeholder={`Paste full TLE block here, e.g.:\nNavIC-1B\n1 39635U 14017A   26315.42100000 -.00000100  00000-0  00000-0 0  9993\n2 39635  29.5000 130.0000 0012000  75.0000 285.0000  1.00270000 45001`}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 pt-1">
        <div>
          <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
            Satellite Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. NavIC-1B (IRNSS-1B)"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span>Line 1 (Must be 69 chars)</span>
            <span className={line1.trim().length === 69 ? 'text-emerald-400' : 'text-slate-500'}>
              {line1.trim().length} / 69
            </span>
          </div>
          <input
            type="text"
            value={line1}
            onChange={(e) => setLine1(e.target.value)}
            placeholder="1 39635U 14017A   26315.42100000 -.00000100  00000-0  00000-0 0  9993"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span>Line 2 (Must be 69 chars)</span>
            <span className={line2.trim().length === 69 ? 'text-emerald-400' : 'text-slate-500'}>
              {line2.trim().length} / 69
            </span>
          </div>
          <input
            type="text"
            value={line2}
            onChange={(e) => setLine2(e.target.value)}
            placeholder="2 39635  29.5000 130.0000 0012000  75.0000 285.0000  1.00270000 45001"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Validation Status Indicator */}
        {(name || line1 || line2) && (
          <div
            className={`p-3 rounded-lg border text-xs font-mono ${
              validation.isValid
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {validation.isValid ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Format and Checksums Validated. Ready to upload to tracker.</span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>TLE Format Issues Detected:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-rose-300/90 pl-1">
                  {validation.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={!validation.isValid || isSubmitting}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:pointer-events-none text-slate-950 font-bold font-mono text-xs rounded-lg transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {isSubmitting ? 'Uploading to Flash...' : 'Upload & Save TLE to Tracker'}
          </button>
        </div>
      </form>
    </div>
  );
}

