'use client';

import React, { useEffect, useState } from 'react';
import { useTracker } from '@/context/TrackerContext';
import { trackerApi } from '@/lib/api';
import { SatellitePass } from '@shared/types/tracker';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import { SkyMapCard } from '@/components/dashboard/SkyMapCard';
import { GroundTrackCard } from '@/components/dashboard/GroundTrackCard';
import { PassProfileCard } from '@/components/dashboard/PassProfileCard';
import { AntennaPointingCard } from '@/components/dashboard/AntennaPointingCard';
import { NextPassDetailsCard } from '@/components/dashboard/NextPassDetailsCard';
import { UpcomingPassesCard } from '@/components/dashboard/UpcomingPassesCard';
import { TelemetryGauges } from '@/components/dashboard/TelemetryGauges';

export default function DashboardPage() {
  const { telemetry, status, connectionStatus } = useTracker();
  const [pass, setPass] = useState<SatellitePass | null>(null);
  const [loadingPass, setLoadingPass] = useState(false);

  const isConnected = connectionStatus === 'connected';

  // Real values only: DO NOT substitute fake angles or coordinates when disconnected!
  const currentAngles = isConnected ? (telemetry?.currentAngles || status?.currentAngles || null) : null;
  const targetAngles = isConnected ? (telemetry?.targetAngles || status?.targetAngles || null) : null;
  const satName = status?.satelliteName || telemetry?.satelliteName || null;
  const isVisible = isConnected ? (telemetry?.isVisible ?? status?.isVisible ?? null) : null;
  const satPos = isConnected ? (telemetry?.satellitePosition ?? status?.satellitePosition ?? null) : null;

  useEffect(() => {
    let isMounted = true;
    if (!isConnected) {
      setPass(null);
      return;
    }
    async function loadPrediction() {
      try {
        setLoadingPass(true);
        const data = await trackerApi.getPrediction();
        if (isMounted) setPass(data);
      } catch (err) {
        if (isMounted) setPass(null);
      } finally {
        if (isMounted) setLoadingPass(false);
      }
    }
    loadPrediction();
    const interval = setInterval(loadPrediction, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isConnected, status?.satelliteName, status?.noradId]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* 1. Dashboard Top Bar */}
      <DashboardTopBar
        pass={pass}
        loadingPass={loadingPass}
        targetAngles={targetAngles}
      />

      {/* 2. Main Visualizations Row 1 (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
        {/* Col 1: Sky Map */}
        <SkyMapCard
          current={currentAngles}
          target={targetAngles}
          satelliteName={satName}
          isVisible={isVisible}
          isConnected={isConnected}
        />

        {/* Col 2: Ground Track World Map */}
        <GroundTrackCard
          satPos={satPos}
          satelliteName={satName}
          isConnected={isConnected}
        />

        {/* Col 3: Pass Profile (Next Pass) */}
        <PassProfileCard
          pass={pass}
          loading={loadingPass}
          isConnected={isConnected}
        />
      </div>

      {/* 3. Main Data Row 2 (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
        {/* Col 1: Antenna Pointing with 3D Dish Rotator Illustration */}
        <AntennaPointingCard
          current={currentAngles}
          target={targetAngles}
          isConnected={isConnected}
        />

        {/* Col 2: Next Pass Card */}
        <NextPassDetailsCard
          pass={pass}
          loading={loadingPass}
          isConnected={isConnected}
        />

        {/* Col 3: Upcoming Passes Table */}
        <UpcomingPassesCard
          pass={pass}
          loading={loadingPass}
          isConnected={isConnected}
        />
      </div>

      {/* 4. Collapsible Hardware Diagnostics (only shown if connected or upon user toggle) */}
      <TelemetryGauges telemetry={telemetry} status={status} />
    </div>
  );
}
