'use client';

import React from 'react';
import { TelemetryLogEntry } from '@shared/types/tracker';
import { Download } from '@/components/ui/icons';

interface CsvExportButtonProps {
  logs: TelemetryLogEntry[];
}

export function CsvExportButton({ logs }: CsvExportButtonProps) {
  const handleExportCsv = () => {
    if (logs.length === 0) return;

    const headers = [
      'Timestamp (ISO)',
      'Timestamp (Local)',
      'Commanded Azimuth (deg)',
      'Actual Azimuth (deg)',
      'Commanded Elevation (deg)',
      'Actual Elevation (deg)',
      'Tracking Error (deg)',
      'Tracker State'
    ];

    const rows = logs.map((log) => [
      log.timestamp,
      new Date(log.timestamp).toLocaleString(),
      log.commandedAzimuth.toFixed(2),
      log.actualAzimuth.toFixed(2),
      log.commandedElevation.toFixed(2),
      log.actualElevation.toFixed(2),
      log.trackingErrorDeg.toFixed(2),
      log.state
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `navic-track-telemetry-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExportCsv}
      disabled={logs.length === 0}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:pointer-events-none text-slate-950 font-bold font-mono text-xs rounded-lg transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
    >
      <Download className="w-4 h-4" />
      <span>Export CSV ({logs.length} Rows)</span>
    </button>
  );
}

