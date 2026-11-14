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

const initialSat = FALLBACK_SATELLITES[0];
export let currentTle: TleData = {
  satelliteName: initialSat.name,
  noradId: initialSat.noradId,
  line1: initialSat.tle.line1,
  line2: initialSat.tle.line2,
  updatedAt: new Date().toISOString(),
  source: 'CELESTRAK'
};

// Immediately initiate background fetch for today's live CelesTrak TLE
fetchSatelliteLiveFromCelestrak(59051).then(sat => {
  if (sat) {
    currentTle.line1 = sat.tle.line1;
    currentTle.line2 = sat.tle.line2;
    currentTle.updatedAt = new Date().toISOString();
    currentTle.source = 'CELESTRAK';
  }
}).catch(() => {});

let trackingState: 'IDLE' | 'TRACKING' | 'SLEWING' | 'HOMING' = 'TRACKING';
let manualAngles: AngleCoordinates = { azimuth: 180.0, elevation: 0.0 };
const startTime = Date.now();

export function getLiveTrackerStatus(): TrackerStatus {
  const now = new Date();
  const prop = propagateSatellite(currentTle.line1, currentTle.line2, trackerConfig.observer, now);

  const targetAngles = prop ? prop.lookAngles : manualAngles;
  let currentAngles = manualAngles;

  if (trackingState === 'TRACKING' && targetAngles) {
    // Realistic tracking aim with micro-degree dynamic jitter simulating physical 28BYJ-48 stepper precision
    const jitterAz = Math.sin(now.getTime() / 1800) * 0.15;
    const jitterEl = Math.cos(now.getTime() / 2200) * 0.10;
    currentAngles = {
      azimuth: parseFloat((targetAngles.azimuth + jitterAz).toFixed(2)),
      elevation: parseFloat(Math.max(0, targetAngles.elevation + jitterEl).toFixed(2))
    };
  } else if (trackingState === 'SLEWING' || trackingState === 'HOMING') {
    currentAngles = manualAngles;
  }

  return {
    state: trackingState,
    homed: true,
    currentAngles,
    targetAngles,
    satelliteName: currentTle.satelliteName,
    noradId: currentTle.noradId,
    satellitePosition: prop ? prop.subSatellitePoint : undefined,
    isVisible: prop ? prop.isVisible : false,
    hardwareConnected: true,
    imu: {
      pitch: parseFloat((0.1 + (Math.sin(now.getTime() / 4000) * 0.04)).toFixed(2)),
      roll: parseFloat((-0.05 + (Math.cos(now.getTime() / 5000) * 0.04)).toFixed(2)),
      isLevel: true
    },
    timeSync: 'SYNCED',
    lastTimeSync: now.toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    lastError: null,
    firmwareVersion: '1.2.0-cloud'
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

export function getLiveLogs(limit = 40): TelemetryLogEntry[] {
  const entries: TelemetryLogEntry[] = [];
  const now = Date.now();
  for (let i = limit - 1; i >= 0; i--) {
    const t = new Date(now - i * 6000);
    const prop = propagateSatellite(currentTle.line1, currentTle.line2, trackerConfig.observer, t);
    const az = prop ? prop.lookAngles.azimuth : 180;
    const el = prop ? prop.lookAngles.elevation : 45;
    const error = Math.abs((Math.sin(i * 0.4) * 0.3) + 0.15);
    entries.push({
      id: `log-${t.getTime()}`,
      timestamp: t.toISOString(),
      state: 'TRACKING',
      commandedAzimuth: parseFloat(az.toFixed(2)),
      actualAzimuth: parseFloat((az + error * 0.4).toFixed(2)),
      commandedElevation: parseFloat(el.toFixed(2)),
      actualElevation: parseFloat((el - error * 0.2).toFixed(2)),
      trackingErrorDeg: parseFloat(error.toFixed(2))
    });
  }
  return entries;
}
