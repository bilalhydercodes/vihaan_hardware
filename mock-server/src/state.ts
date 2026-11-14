import {
  TrackerStatus,
  TrackerConfig,
  TleData,
  TelemetryLogEntry,
  TrackingState,
  AngleCoordinates
} from '../../shared/types/tracker.js';
import { FALLBACK_SATELLITES, findSatelliteByNameOrNorad } from './tle-data.js';
import { calculateAzEl, simulateImu } from './simulator.js';

// Default configuration
export const trackerConfig: TrackerConfig = {
  observer: {
    latitude: 28.6139,    // New Delhi (example for NavIC testing)
    longitude: 77.2090,
    altitudeMeters: 216.0
  },
  motion: {
    maxAzimuthSpeedDegS: 4.0,       // Conservative for 28BYJ-48 unipolar stepper
    maxElevationSpeedDegS: 3.5,
    azimuthStepsPerDegree: 40.25,   // Gearbox ratio ~3.57:1
    elevationStepsPerDegree: 40.42,
    azimuthOffsetDeg: 0.0,
    elevationOffsetDeg: 0.0,
    backlashCompensationDeg: 0.5
  }
};

// Default active TLE (NavIC-1B)
const initialSat = FALLBACK_SATELLITES[0];
export let currentTle: TleData = {
  satelliteName: initialSat.name,
  noradId: initialSat.noradId,
  line1: initialSat.tle.line1,
  line2: initialSat.tle.line2,
  updatedAt: new Date().toISOString(),
  source: 'CELESTRAK'
};

// Current tracker status
const startTime = Date.now();
export const trackerStatus: TrackerStatus = {
  state: 'IDLE',
  homed: true,
  currentAngles: { azimuth: 120.0, elevation: 45.0 },
  targetAngles: { azimuth: 120.0, elevation: 45.0 },
  satelliteName: initialSat.name,
  noradId: initialSat.noradId,
  imu: { pitch: 0.1, roll: -0.05, isLevel: true },
  timeSync: 'SYNCED',
  lastTimeSync: new Date().toISOString(),
  uptimeSeconds: 0,
  lastError: null,
  firmwareVersion: '1.0.0-esp32-mock'
};

// Ring buffer for logs (stores last 200 items in memory)
const MAX_LOGS = 200;
export const logsRingBuffer: TelemetryLogEntry[] = [];
let logCounter = 0;

export function addLogEntry(entry: Omit<TelemetryLogEntry, 'id'>): void {
  logCounter += 1;
  const fullEntry: TelemetryLogEntry = {
    id: `log-${logCounter}`,
    ...entry
  };
  logsRingBuffer.push(fullEntry);
  if (logsRingBuffer.length > MAX_LOGS) {
    logsRingBuffer.shift();
  }
}

// Stepper slew target for manual move
let manualTargetSpeed = 3.5;

export function setManualTarget(target: AngleCoordinates, speed?: number): void {
  trackerStatus.targetAngles = {
    azimuth: parseFloat(target.azimuth.toFixed(2)),
    elevation: parseFloat(target.elevation.toFixed(2))
  };
  manualTargetSpeed = Math.min(
    speed || trackerConfig.motion.maxAzimuthSpeedDegS,
    trackerConfig.motion.maxAzimuthSpeedDegS
  );
  trackerStatus.state = 'SLEWING';
}

export function startHoming(): void {
  trackerStatus.state = 'HOMING';
  trackerStatus.homed = false;
  trackerStatus.targetAngles = { azimuth: 0.0, elevation: 0.0 };
}

export function selectSatellite(nameOrNorad: string | number, autoTrack = false): boolean {
  const sat = findSatelliteByNameOrNorad(nameOrNorad);
  if (!sat) return false;

  currentTle = {
    satelliteName: sat.name,
    noradId: sat.noradId,
    line1: sat.tle.line1,
    line2: sat.tle.line2,
    updatedAt: new Date().toISOString(),
    source: 'CELESTRAK'
  };

  trackerStatus.satelliteName = sat.name;
  trackerStatus.noradId = sat.noradId;

  // Compute immediate target
  const azEl = calculateAzEl(currentTle.line1, currentTle.line2, trackerConfig.observer, new Date());
  if (azEl) {
    trackerStatus.targetAngles = azEl;
  }

  if (autoTrack) {
    trackerStatus.state = 'TRACKING';
  }
  return true;
}

export function updateTle(name: string, line1: string, line2: string): void {
  const noradId = parseInt(line1.substring(2, 7).trim(), 10) || 0;
  currentTle = {
    satelliteName: name,
    noradId,
    line1,
    line2,
    updatedAt: new Date().toISOString(),
    source: 'MANUAL'
  };
  trackerStatus.satelliteName = name;
  trackerStatus.noradId = noradId;

  const azEl = calculateAzEl(line1, line2, trackerConfig.observer, new Date());
  if (azEl) {
    trackerStatus.targetAngles = azEl;
  }
}

// Simulation Physics Tick (runs every 100ms)
const TICK_INTERVAL_MS = 100;
const DT_SECONDS = TICK_INTERVAL_MS / 1000.0;
let lastLogTime = 0;

setInterval(() => {
  trackerStatus.uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  trackerStatus.imu = simulateImu(trackerStatus.imu.pitch, trackerStatus.imu.roll);

  // If tracking, update target coordinates from SGP4
  if (trackerStatus.state === 'TRACKING') {
    const azEl = calculateAzEl(currentTle.line1, currentTle.line2, trackerConfig.observer, new Date());
    if (azEl) {
      trackerStatus.targetAngles = azEl;
    }
  }

  // Motion physics simulation
  if (trackerStatus.state === 'TRACKING' || trackerStatus.state === 'SLEWING' || trackerStatus.state === 'HOMING') {
    const maxAzStep = (trackerStatus.state === 'HOMING' ? 2.5 : manualTargetSpeed) * DT_SECONDS;
    const maxElStep = (trackerStatus.state === 'HOMING' ? 2.0 : manualTargetSpeed) * DT_SECONDS;

    // Azimuth delta
    const azDiff = trackerStatus.targetAngles.azimuth - trackerStatus.currentAngles.azimuth;
    if (Math.abs(azDiff) <= maxAzStep) {
      trackerStatus.currentAngles.azimuth = trackerStatus.targetAngles.azimuth;
    } else {
      trackerStatus.currentAngles.azimuth += Math.sign(azDiff) * maxAzStep;
    }
    trackerStatus.currentAngles.azimuth = parseFloat(trackerStatus.currentAngles.azimuth.toFixed(2));

    // Elevation delta
    const elDiff = trackerStatus.targetAngles.elevation - trackerStatus.currentAngles.elevation;
    if (Math.abs(elDiff) <= maxElStep) {
      trackerStatus.currentAngles.elevation = trackerStatus.targetAngles.elevation;
    } else {
      trackerStatus.currentAngles.elevation += Math.sign(elDiff) * maxElStep;
    }
    trackerStatus.currentAngles.elevation = parseFloat(trackerStatus.currentAngles.elevation.toFixed(2));

    // Check completion
    const closeEnough =
      Math.abs(trackerStatus.currentAngles.azimuth - trackerStatus.targetAngles.azimuth) < 0.05 &&
      Math.abs(trackerStatus.currentAngles.elevation - trackerStatus.targetAngles.elevation) < 0.05;

    if (trackerStatus.state === 'HOMING' && closeEnough) {
      trackerStatus.homed = true;
      trackerStatus.state = 'IDLE';
    } else if (trackerStatus.state === 'SLEWING' && closeEnough) {
      trackerStatus.state = 'IDLE';
    }
  }

  // Periodic logging into ring buffer every 1.5 seconds
  const now = Date.now();
  if (now - lastLogTime >= 1500) {
    lastLogTime = now;
    const dAz = trackerStatus.targetAngles.azimuth - trackerStatus.currentAngles.azimuth;
    const dEl = trackerStatus.targetAngles.elevation - trackerStatus.currentAngles.elevation;
    const err = parseFloat(Math.sqrt(dAz * dAz + dEl * dEl).toFixed(2));

    addLogEntry({
      timestamp: new Date().toISOString(),
      commandedAzimuth: trackerStatus.targetAngles.azimuth,
      actualAzimuth: trackerStatus.currentAngles.azimuth,
      commandedElevation: trackerStatus.targetAngles.elevation,
      actualElevation: trackerStatus.currentAngles.elevation,
      trackingErrorDeg: err,
      state: trackerStatus.state
    });
  }
}, TICK_INTERVAL_MS);

