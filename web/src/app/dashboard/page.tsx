'use client';

import React, { useEffect, useState } from 'react';
import { useTracker } from '@/context/TrackerContext';
import { trackerApi } from '@/lib/api';
import { SatellitePass } from '@shared/types/tracker';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { SkyMapCard } from '@/components/dashboard/SkyMapCard';
import { AntennaPointingCard } from '@/components/dashboard/AntennaPointingCard';
import { PassProfileCard } from '@/components/dashboard/PassProfileCard';
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
      } catch {
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
    <div className="w-full max-w-[1600px] mx-auto space-y-5">
      {/* 2-Column Dashboard Grid: Left Mission Sidebar + Main Hero Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Mission Control Sidebar */}
        <aside className="lg:col-span-4 xl:col-span-3">
          <DashboardSidebar
            pass={pass}
            loadingPass={loadingPass}
            targetAngles={targetAngles}
            currentAngles={currentAngles}
          />
        </aside>

        {/* Main Dashboard Visualization Area */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-5">
          {/* Row 1: Real-time Aim & Pointing (Sky Map + Antenna Pointing) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
            {/* Topocentric Sky Map */}
            <div className="xl:col-span-7">
              <SkyMapCard
                current={currentAngles}
                target={targetAngles}
                satelliteName={satName}
                isVisible={isVisible}
                isConnected={isConnected}
              />
            </div>

            {/* Antenna Pointing Card (Switched with Pass Profile) */}
            <div className="xl:col-span-5">
              <AntennaPointingCard
                current={currentAngles}
                target={targetAngles}
                isConnected={isConnected}
              />
            </div>
          </div>

          {/* Row 2: Orbit Trajectory & Pass Schedule (Pass Profile + Upcoming Passes) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
            {/* Pass Profile (Switched with Antenna Pointing) */}
            <div className="xl:col-span-6">
              <PassProfileCard
                pass={pass}
                loading={loadingPass}
                isConnected={isConnected}
              />
            </div>

            {/* Upcoming Passes & Orbit Schedule */}
            <div className="xl:col-span-6">
              <UpcomingPassesCard
                pass={pass}
                loading={loadingPass}
                isConnected={isConnected}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Hardware Diagnostics & Telemetry Gauges Drawer */}
      <TelemetryGauges telemetry={telemetry} status={status} />
    </div>
  );
}