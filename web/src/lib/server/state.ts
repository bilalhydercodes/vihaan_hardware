import {
  TrackerStatus,
  TrackerConfig,
  TleData,
  TelemetryLogEntry,
  AngleCoordinates
} from '@/types/tracker';
import {
  FALLBACK_SATELLITES,
  findSatelliteByNameOrNorad,
  fetchCelestrakPresets,
  fetchSatelliteLiveFromCelestrak
} from './tle-data';
import { propagateSatellite } from './simulator';
import { getDiscoveredDevice, initDiscoveryListener } from './discovery';

// Start automatic UDP discovery on server boot
initDiscoveryListener();

export const trackerConfig: TrackerConfig = {
  observer: {
    latitude: 28.6139,
    longitude: 77.2090,
    altitudeMeters: 216.0,
    minElevationMaskDeg: 10.0
  },
  motion: {
    maxAzimuthSpeedDegS: 4.0,
    maxElevationSpeedDegS: 3.5,
    azimuthStepsPerDegree: 40.25,
    elevationStepsPerDegree: 40.42,
    azimuthOffsetDeg: 0.0,
    elevationOffsetDeg: 0.0,
    backlashCompensationDeg: 0.5
  }
};

// Primary Satellite: METEOR-M2 4 (NORAD 59051)
const initialSat = FALLBACK_SATELLITES[0];
export let currentTle: TleData = {
  satelliteName: initialSat.name,
  noradId: initialSat.noradId,
  line1: initialSat.tle.line1,
  line2: initialSat.tle.line2,
  updatedAt: new Date().toISOString(),
  source: 'CELESTRAK'
};

// Immediately initiate background fetch for today's live METEOR-M2 4 CelesTrak TLE
fetchSatelliteLiveFromCelestrak(59051).then(sat => {
  if (sat) {
    currentTle.satelliteName = sat.name;
    currentTle.noradId = sat.noradId;
    currentTle.line1 = sat.tle.line1;
    currentTle.line2 = sat.tle.line2;
    currentTle.updatedAt = new Date().toISOString();
    currentTle.source = 'CELESTRAK';
  }
}).catch(() => {});

let trackingState: 'IDLE' | 'TRACKING' | 'SLEWING' | 'HOMING' = 'IDLE';
let manualAngles: AngleCoordinates = { azimuth: 0.0, elevation: 0.0 };
let activeHardwareUrl = process.env.TRACKER_HARDWARE_URL?.trim() || 'http://10.254.214.136:8080';
const startTime = Date.now();

export function setHardwareUrl(url: string): void {
  activeHardwareUrl = url ? url.replace(/\/+$/, '') : '';
}

export function getHardwareUrl(): string {
  const autoDev = getDiscoveredDevice();
  if (autoDev.url) {
    return autoDev.url;
  }
  return activeHardwareUrl || 'http://10.254.214.136:8080';
}

import {
  getLiveMeteorTrackingStatus,
  setAutoTrackingEnabled,
  startPassSimulation,
  stopPassSimulation,
  METEOR_NORAD_ID
} from './auto-tracker';

export {
  setAutoTrackingEnabled,
  startPassSimulation,
  stopPassSimulation
};

export async function getLiveTrackerStatus(): Promise<TrackerStatus> {
  // If METEOR-M2 4 is active, use comprehensive real-time autonomous tracker status
  if (currentTle.noradId === METEOR_NORAD_ID || currentTle.satelliteName.includes('METEOR')) {
    return await getLiveMeteorTrackingStatus();
  }

  const now = new Date();
  const prop = propagateSatellite(currentTle.line1, currentTle.line2, trackerConfig.observer, now);
  const targetAngles = prop ? prop.lookAngles : manualAngles;

  // 1. Check Automatic Zero-Config UDP Discovery
  const autoDev = getDiscoveredDevice();
  if (autoDev.online && autoDev.telemetry) {
    return {
      state: autoDev.telemetry.isMoving ? 'SLEWING' : ((autoDev.telemetry.state as any) || 'IDLE'),
      homed: true,
      currentAngles: {
        azimuth: autoDev.telemetry.azimuth,
        elevation: autoDev.telemetry.elevation
      },
      targetAngles,
      satelliteName: currentTle.satelliteName,
      noradId: currentTle.noradId,
      satellitePosition: prop ? prop.subSatellitePoint : undefined,
      isVisible: prop ? prop.isVisible : false,
      hardwareConnected: true,
      imu: { pitch: 0.0, roll: 0.0, isLevel: true },
      timeSync: 'SYNCED',
      lastTimeSync: now.toISOString(),
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      lastError: null,
      firmwareVersion: '1.2.0-esp32'
    };
  }

  // 2. If a manual hardware URL is configured, query fallback REST status
  const hwUrl = activeHardwareUrl || process.env.TRACKER_HARDWARE_URL || process.env.NEXT_PUBLIC_TRACKER_URL;
  if (hwUrl && !hwUrl.includes('localhost:8080') && !hwUrl.includes('trycloudflare.com')) {
    try {
      const cleanUrl = hwUrl.replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/api/v1/status`, {
        signal: AbortSignal.timeout(1500)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const hwData = json.data;
          return {
            state: hwData.state || 'IDLE',
            homed: Boolean(hwData.homed),
            currentAngles: hwData.currentAngles || { azimuth: 0.0, elevation: 0.0 },
            targetAngles: hwData.targetAngles || targetAngles,
            satelliteName: currentTle.satelliteName,
            noradId: currentTle.noradId,
            satellitePosition: prop ? prop.subSatellitePoint : undefined,
            isVisible: prop ? prop.isVisible : false,
            hardwareConnected: true,
            imu: hwData.imu || { pitch: 0.0, roll: 0.0, isLevel: true },
            timeSync: 'SYNCED',
            lastTimeSync: now.toISOString(),
            uptimeSeconds: hwData.uptimeSeconds || Math.floor((Date.now() - startTime) / 1000),
            lastError: null,
            firmwareVersion: '1.2.0-esp32'
          };
        }
      }
    } catch {
      // Hardware request timed out or unavailable
    }
  }

  // Pure hardware state when no tracker is reporting - ZERO MOCK DATA
  return {
    state: 'IDLE',
    homed: false,
    currentAngles: { azimuth: 0.0, elevation: 0.0 },
    targetAngles,
    satelliteName: currentTle.satelliteName,
    noradId: currentTle.noradId,
    satellitePosition: prop ? prop.subSatellitePoint : undefined,
    isVisible: prop ? prop.isVisible : false,
    hardwareConnected: false,
    imu: {
      pitch: 0.0,
      roll: 0.0,
      isLevel: true
    },
    timeSync: 'SYNCED',
    lastTimeSync: now.toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    lastError: 'Hardware not connected. Enter your ESP32 IP in the navbar to connect.',
    firmwareVersion: '1.2.0-offline'
  };
}

export async function selectSatellite(nameOrNorad: string | number): Promise<boolean> {
  const sat = await fetchSatelliteLiveFromCelestrak(nameOrNorad);
  if (!sat) return false;

  currentTle = {
    satelliteName: sat.name,
    noradId: sat.noradId,
    line1: sat.tle.line1,
    line2: sat.tle.line2,
    updatedAt: new Date().toISOString(),
    source: 'CELESTRAK'
  };
  return true;
}

export function setTrackingState(state: 'START' | 'STOP'): void {
  trackingState = state === 'START' ? 'TRACKING' : 'IDLE';
  setAutoTrackingEnabled(state === 'START');
}

export function setManualTarget(angles: AngleCoordinates): void {
  manualAngles = {
    azimuth: parseFloat(angles.azimuth.toFixed(2)),
    elevation: parseFloat(angles.elevation.toFixed(2))
  };
  trackingState = 'SLEWING';
}

export function resetHome(): void {
  manualAngles = { azimuth: 0.0, elevation: 0.0 };
  trackingState = 'HOMING';
  setTimeout(() => {
    trackingState = 'IDLE';
  }, 2000);
}

const liveTelemetryLogs: TelemetryLogEntry[] = [];

export function recordTelemetryLog(entry: TelemetryLogEntry): void {
  liveTelemetryLogs.unshift(entry);
  if (liveTelemetryLogs.length > 100) {
    liveTelemetryLogs.pop();
  }
}

export function getLiveLogs(limit = 40): TelemetryLogEntry[] {
  return liveTelemetryLogs.slice(0, limit);
}
