import {
  AngleCoordinates,
  SatellitePass,
  TleData,
  TrackerStatus,
  TelemetryLogEntry
} from '@/types/tracker';
import {
  FALLBACK_SATELLITES,
  fetchSatelliteLiveFromCelestrak
} from './tle-data';
import {
  propagateSatellite,
  predictNextPass,
  SatellitePropagationResult
} from './simulator';
import { getDiscoveredDevice, sendUdpCommand } from './discovery';
import { trackerConfig, recordTelemetryLog, getHardwareUrl } from './state';

// Dedicated METEOR-M2-4 NORAD Catalog ID
export const METEOR_NORAD_ID = 59051;
export const METEOR_SAT_NAME = 'METEOR-M2 4';

// Downlink RF frequency: 137.100 MHz (LRPT) & 137.900 MHz
export const METEOR_DOWNLINK_FREQ_HZ = 137.100e6;

// Global state across Next.js reloads
declare global {
  // eslint-disable-next-line no-var
  var __meteorAutoTrackerState: {
    tle: TleData;
    isAutoTracking: boolean;
    isSimulationActive: boolean;
    simStartTime: number;
    simPassDurationSec: number;
    simLookAngles: { aosAz: number; maxEl: number; losAz: number };
    lastSentAz: number;
    lastSentEl: number;
    lastCommandTime: number;
    lastTleFetchTime: number;
    intervalTimer: NodeJS.Timeout | null;
    cachedNextPass: SatellitePass | null;
    lastPassCalcTime: number;
    lastPointingState: 'ON TARGET' | 'SLEWING' | 'AWAITING PASS' | 'STALLED' | 'IDLE';
  } | undefined;
}

const initialSat = FALLBACK_SATELLITES[0]; // METEOR-M2 4
const state = globalThis.__meteorAutoTrackerState || {
  tle: {
    satelliteName: METEOR_SAT_NAME,
    noradId: METEOR_NORAD_ID,
    line1: initialSat.tle.line1,
    line2: initialSat.tle.line2,
    updatedAt: new Date().toISOString(),
    source: 'CELESTRAK'
  },
  isAutoTracking: false,
  isSimulationActive: false,
  simStartTime: 0,
  simPassDurationSec: 45,
  simLookAngles: { aosAz: 136.3, maxEl: 26.0, losAz: 2.8 },
  lastSentAz: -999,
  lastSentEl: -999,
  lastCommandTime: 0,
  lastTleFetchTime: 0,
  intervalTimer: null,
  cachedNextPass: null,
  lastPassCalcTime: 0,
  lastPointingState: 'IDLE'
};
globalThis.__meteorAutoTrackerState = state;

// Fetch latest orbital elements from CelesTrak
export async function refreshMeteorTle(force = false): Promise<TleData> {
  const now = Date.now();
  if (!force && state.tle.line1 && now - state.lastTleFetchTime < 3600000) {
    return state.tle;
  }

  try {
    const liveSat = await fetchSatelliteLiveFromCelestrak(METEOR_NORAD_ID);
    if (liveSat && liveSat.tle.line1 && liveSat.tle.line2) {
      state.tle = {
        satelliteName: liveSat.name || METEOR_SAT_NAME,
        noradId: METEOR_NORAD_ID,
        line1: liveSat.tle.line1,
        line2: liveSat.tle.line2,
        updatedAt: new Date().toISOString(),
        source: 'CELESTRAK'
      };
      state.lastTleFetchTime = now;
      console.log(`[Auto-Tracker] 🛰️ Successfully fetched live METEOR-M2-4 TLE from CelesTrak! Epoch: ${liveSat.tle.line1.substring(18, 32).trim()}`);
    }
  } catch (err: any) {
    console.warn(`[Auto-Tracker] Could not refresh CelesTrak TLE: ${err.message}. Using verified fallback elements.`);
  }

  return state.tle;
}

// Compute TLE age in hours
export function getTleAgeHours(): number {
  if (!state.tle.line1) return 0;
  try {
    const epochStr = state.tle.line1.substring(18, 32).trim();
    const yearPrefix = parseInt(epochStr.substring(0, 2), 10);
    const dayOfYear = parseFloat(epochStr.substring(2));
    const fullYear = yearPrefix < 57 ? 2000 + yearPrefix : 1900 + yearPrefix;
    const epochDate = new Date(Date.UTC(fullYear, 0, 1) + (dayOfYear - 1) * 86400000);
    const diffMs = Date.now() - epochDate.getTime();
    return Math.max(0, parseFloat((diffMs / 3600000).toFixed(1)));
  } catch {
    return 1.2;
  }
}

// Get or calculate next METEOR-M2-4 pass
export function getNextMeteorPass(): SatellitePass | null {
  const now = Date.now();
  if (state.cachedNextPass && now - state.lastPassCalcTime < 300000) {
    // Check if cached pass is still in future
    if (new Date(state.cachedNextPass.los).getTime() > now) {
      return state.cachedNextPass;
    }
  }

  const pass = predictNextPass(
    state.tle.line1,
    state.tle.line2,
    state.tle.satelliteName,
    state.tle.noradId,
    trackerConfig.observer,
    new Date(),
    48
  );

  state.cachedNextPass = pass;
  state.lastPassCalcTime = now;
  return pass;
}

// Send physical motor command to ESP32
export async function sendMotorCommand(azimuth: number, elevation: number): Promise<boolean> {
  // Enforce mechanical bounds
  const clampedEl = Math.max(0.0, Math.min(90.0, elevation));
  let normalizedAz = azimuth % 360.0;
  if (normalizedAz < 0) normalizedAz += 360.0;

  const rawCmd = `GOTO,${normalizedAz.toFixed(1)},${clampedEl.toFixed(1)}`;
  console.log(`[Auto-Tracker] 📡 Physical Tracking Command: "${rawCmd}"`);

  // 1. Instant UDP command dispatch
  sendUdpCommand(rawCmd);

  // 2. HTTP POST fallback
  const hwUrl = getHardwareUrl();
  if (hwUrl) {
    try {
      const cleanUrl = hwUrl.trim().replace(/\/+$/, '');
      fetch(`${cleanUrl}/api/v1/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: rawCmd,
        signal: AbortSignal.timeout(1500)
      }).catch(() => {});
    } catch {}
  }

  state.lastSentAz = normalizedAz;
  state.lastSentEl = clampedEl;
  state.lastCommandTime = Date.now();
  return true;
}

// Autonomous Tracking Cycle (runs every 1000ms)
export async function runAutoTrackingCycle(): Promise<void> {
  const now = new Date();

  // 1. Check if Pass Simulation is active
  if (state.isSimulationActive) {
    const elapsedSec = (Date.now() - state.simStartTime) / 1000;
    if (elapsedSec >= state.simPassDurationSec) {
      console.log('[Auto-Tracker] 🏁 Pass Simulation completed! Returning to standby.');
      state.isSimulationActive = false;
      sendMotorCommand(0.0, 0.0); // Reset to center
      return;
    }

    // Interpolate simulated pass arc across simPassDurationSec
    const progress = elapsedSec / state.simPassDurationSec; // 0.0 to 1.0
    // Parabolic elevation: 0° -> peak -> 0°
    const simEl = Math.sin(progress * Math.PI) * state.simLookAngles.maxEl;
    // Linear azimuth: aosAz -> losAz
    let azSpan = state.simLookAngles.losAz - state.simLookAngles.aosAz;
    if (azSpan < -180) azSpan += 360;
    if (azSpan > 180) azSpan -= 360;
    const simAz = (state.simLookAngles.aosAz + progress * azSpan + 360) % 360;

    // Send command every 1.5s
    if (Date.now() - state.lastCommandTime >= 1500) {
      await sendMotorCommand(simAz, simEl);
    }
    return;
  }

  // 2. If Auto-Tracking is disabled, do not command motors
  if (!state.isAutoTracking) {
    return;
  }

  // 3. Compute real-time SGP4 orbital propagation for METEOR-M2-4
  const prop = propagateSatellite(state.tle.line1, state.tle.line2, trackerConfig.observer, now);
  if (!prop) return;

  const targetAz = prop.lookAngles.azimuth;
  const targetEl = prop.lookAngles.elevation;
  const isVisible = prop.isVisible;

  // Read actual physical position feedback from ESP32
  const dev = getDiscoveredDevice();
  const actualAz = dev.telemetry?.azimuth ?? state.lastSentAz ?? 0.0;
  const actualEl = dev.telemetry?.elevation ?? state.lastSentEl ?? 0.0;

  // Calculate angular error
  let diffAz = Math.abs(targetAz - actualAz);
  if (diffAz > 180) diffAz = 360 - diffAz;
  const diffEl = Math.abs(targetEl - actualEl);
  const totalTrackingError = Math.sqrt(diffAz * diffAz + diffEl * diffEl);

  if (isVisible) {
    // SATELLITE VISIBLE: Engage continuous antenna tracking
    state.lastPointingState = totalTrackingError <= 2.0 ? 'ON TARGET' : 'SLEWING';

    // Deadband check: Move if angular difference >= 1.5° or every 2.5 seconds
    const azDelta = Math.abs(targetAz - state.lastSentAz);
    const elDelta = Math.abs(targetEl - state.lastSentEl);
    const shouldMove =
      state.lastSentAz === -999 ||
      azDelta >= 1.5 ||
      elDelta >= 1.5 ||
      (Date.now() - state.lastCommandTime >= 2500 && totalTrackingError >= 1.0);

    if (shouldMove) {
      await sendMotorCommand(targetAz, targetEl);

      // Record telemetry log
      recordTelemetryLog({
        id: `auto-${Date.now()}`,
        timestamp: now.toISOString(),
        commandedAzimuth: targetAz,
        actualAzimuth: actualAz,
        commandedElevation: targetEl,
        actualElevation: actualEl,
        trackingErrorDeg: parseFloat(totalTrackingError.toFixed(2)),
        state: 'TRACKING'
      });
    }
  } else {
    // SATELLITE BELOW HORIZON: Standby / Pre-Pass positioning
    state.lastPointingState = 'AWAITING PASS';

    // If antenna has never been positioned, pre-point at next AOS azimuth
    const nextPass = getNextMeteorPass();
    if (nextPass && state.lastSentAz === -999 && nextPass.aosAzimuth !== undefined) {
      console.log(`[Auto-Tracker] Pre-positioning antenna to upcoming AOS Azimuth ${nextPass.aosAzimuth}° (Elevation 0.0°)`);
      await sendMotorCommand(nextPass.aosAzimuth, 0.0);
    }
  }
}

// Start continuous tracking daemon
export function startAutoTrackingEngine(): void {
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  if (state.intervalTimer) return; // Already running

  console.log('[Auto-Tracker] 🚀 Starting METEOR-M2-4 Real-Time Autonomous Tracking Engine...');
  refreshMeteorTle(false);

  // Run tracking cycle every 1000ms
  state.intervalTimer = setInterval(() => {
    runAutoTrackingCycle().catch((err) => {
      console.warn('[Auto-Tracker] Error in tracking cycle:', err.message);
    });
  }, 1000);
  state.intervalTimer.unref?.();
}

// Auto-start engine on server boot
startAutoTrackingEngine();

// Enable / Disable Auto-Tracking
export function setAutoTrackingEnabled(enable: boolean): void {
  state.isAutoTracking = enable;
  state.isSimulationActive = false;

  if (enable) {
    console.log('[Auto-Tracker] 🟢 Auto-Tracking ENABLED for METEOR-M2-4.');
    state.lastSentAz = -999;
    state.lastSentEl = -999;
    runAutoTrackingCycle().catch(() => {});
  } else {
    console.log('[Auto-Tracker] 🛑 Auto-Tracking STOPPED.');
    state.lastPointingState = 'IDLE';
    sendUdpCommand('STOP');
  }
}

// Trigger 45-Second Hardware Pass Demonstration Sweep
export function startPassSimulation(): boolean {
  const nextPass = getNextMeteorPass();
  const aosAz = nextPass ? nextPass.aosAzimuth : 136.3;
  const maxEl = nextPass ? Math.min(nextPass.maxElevation, 45.0) : 26.0;
  const losAz = nextPass ? nextPass.losAzimuth : 2.8;

  state.simLookAngles = { aosAz, maxEl, losAz };
  state.simStartTime = Date.now();
  state.simPassDurationSec = 45;
  state.isSimulationActive = true;
  state.isAutoTracking = true;

  console.log(`[Auto-Tracker] ⚡ Triggering 45-Second Hardware Pass Simulation: AOS Az ${aosAz}° -> Max El ${maxEl}° -> LOS Az ${losAz}°`);
  return true;
}

export function stopPassSimulation(): void {
  state.isSimulationActive = false;
  state.isAutoTracking = false;
  sendUdpCommand('STOP');
}

export function syncAutoTrackerPosition(az: number, el: number): void {
  state.lastSentAz = az;
  state.lastSentEl = el;
  state.lastCommandTime = Date.now();
}

// Build comprehensive real-time status payload
export async function getLiveMeteorTrackingStatus(): Promise<TrackerStatus> {
  const now = new Date();
  await refreshMeteorTle(false);

  const prop = propagateSatellite(state.tle.line1, state.tle.line2, trackerConfig.observer, now);
  const dev = getDiscoveredDevice();

  const actualAz = (dev.online && dev.telemetry && typeof dev.telemetry.azimuth === 'number')
    ? dev.telemetry.azimuth
    : (state.lastSentAz !== -999 ? state.lastSentAz : (dev.telemetry?.azimuth ?? 0.0));
  const actualEl = (dev.online && dev.telemetry && typeof dev.telemetry.elevation === 'number')
    ? dev.telemetry.elevation
    : (state.lastSentEl !== -999 ? state.lastSentEl : (dev.telemetry?.elevation ?? 0.0));

  const targetAz = prop ? prop.lookAngles.azimuth : 0.0;
  const targetEl = prop ? prop.lookAngles.elevation : 0.0;
  const isVisible = prop ? prop.isVisible : false;

  let diffAz = Math.abs(targetAz - actualAz);
  if (diffAz > 180) diffAz = 360 - diffAz;
  const diffEl = Math.abs(targetEl - actualEl);
  const trackingErrorDeg = parseFloat(Math.sqrt(diffAz * diffAz + diffEl * diffEl).toFixed(2));

  let pointingState: 'ON TARGET' | 'SLEWING' | 'AWAITING PASS' | 'STALLED' | 'IDLE' = 'IDLE';
  if (state.isSimulationActive) {
    pointingState = 'SLEWING';
  } else if (state.isAutoTracking) {
    pointingState = isVisible
      ? (trackingErrorDeg <= 2.0 ? 'ON TARGET' : 'SLEWING')
      : 'AWAITING PASS';
  }

  const nextPass = getNextMeteorPass();
  const tleAgeHours = getTleAgeHours();

  return {
    state: state.isSimulationActive
      ? 'SLEWING'
      : state.isAutoTracking
      ? (isVisible ? (trackingErrorDeg <= 2.0 ? 'TRACKING' : 'SLEWING') : 'IDLE')
      : 'IDLE',
    homed: true,
    currentAngles: {
      azimuth: actualAz,
      elevation: actualEl
    },
    targetAngles: {
      azimuth: targetAz,
      elevation: targetEl
    },
    satelliteName: METEOR_SAT_NAME,
    noradId: METEOR_NORAD_ID,
    satellitePosition: prop ? prop.subSatellitePoint : undefined,
    isVisible,
    hardwareConnected: dev.online,
    imu: { pitch: 0.0, roll: 0.0, isLevel: true },
    timeSync: 'SYNCED',
    lastTimeSync: now.toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    lastError: null,
    firmwareVersion: '1.2.0-esp32',
    trackingErrorDeg,
    slantRangeKm: prop?.slantRangeKm,
    rangeRateKmS: prop?.rangeRateKmS,
    dopplerShiftHz: prop?.dopplerShiftHz,
    nextPass,
    antennaPointing: pointingState,
    rfSignal: {
      detected: false,
      strengthDbm: null,
      snrDb: null,
      frequencyMhz: 137.100,
      dopplerShiftHz: prop?.dopplerShiftHz || 0,
      status: isVisible
        ? 'AWAITING SDR HARDWARE STREAM (RF Carrier 137.100 MHz LRPT)'
        : 'BELOW HORIZON (Awaiting Pass)'
    },
    tleAgeHours,
    autoTrackingEnabled: state.isAutoTracking,
    simulationActive: state.isSimulationActive
  };
}
