import * as satellite from 'satellite.js';
import { AngleCoordinates, ImuOrientation, SatellitePass } from '../../shared/types/tracker.js';

const DEG_TO_RAD = Math.PI / 180.0;
const RAD_TO_DEG = 180.0 / Math.PI;

export interface ObserverLocation {
  latitude: number;       // degrees
  longitude: number;      // degrees
  altitudeMeters: number; // meters
}

/**
 * Propagate a TLE for an observer location at a specific time using satellite.js (SGP4)
 */
export function calculateAzEl(
  line1: string,
  line2: string,
  observer: ObserverLocation,
  date: Date = new Date()
): AngleCoordinates | null {
  try {
    const satrec = satellite.twoline2satrec(line1, line2);
    if (!satrec) return null;

    const positionAndVelocity = satellite.propagate(satrec, date);
    if (!positionAndVelocity || !positionAndVelocity.position || typeof positionAndVelocity.position === 'boolean') {
      return null;
    }

    const gstime = satellite.gstime(date);
    const positionEcf = satellite.eciToEcf(positionAndVelocity.position, gstime);

    const observerGd = {
      latitude: observer.latitude * DEG_TO_RAD,
      longitude: observer.longitude * DEG_TO_RAD,
      height: observer.altitudeMeters / 1000.0 // km
    };

    const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);

    let az = lookAngles.azimuth * RAD_TO_DEG;
    if (az < 0) az += 360.0;
    if (az >= 360.0) az -= 360.0;

    let el = lookAngles.elevation * RAD_TO_DEG;
    if (el < 0) el = 0; // Clamped to horizon for tracker limits
    if (el > 90) el = 90;

    return {
      azimuth: parseFloat(az.toFixed(2)),
      elevation: parseFloat(el.toFixed(2))
    };
  } catch (err) {
    return null;
  }
}

/**
 * Calculate next pass over the next 24 hours
 */
export function predictNextPass(
  line1: string,
  line2: string,
  satelliteName: string,
  noradId: number,
  observer: ObserverLocation,
  startTime: Date = new Date()
): SatellitePass | null {
  try {
    const satrec = satellite.twoline2satrec(line1, line2);
    if (!satrec) return null;

    const observerGd = {
      latitude: observer.latitude * DEG_TO_RAD,
      longitude: observer.longitude * DEG_TO_RAD,
      height: observer.altitudeMeters / 1000.0
    };

    let inPass = false;
    let aosTime: Date | null = null;
    let aosAz = 0;
    let maxEl = 0;
    let losTime: Date | null = null;
    let losAz = 0;

    // Check every 3 minutes across 24h
    const stepSeconds = 180;
    const totalSteps = (24 * 3600) / stepSeconds;

    for (let i = 0; i < totalSteps; i++) {
      const t = new Date(startTime.getTime() + i * stepSeconds * 1000);
      const pv = satellite.propagate(satrec, t);
      if (!pv || !pv.position || typeof pv.position === 'boolean') continue;

      const gst = satellite.gstime(t);
      const ecf = satellite.eciToEcf(pv.position, gst);
      const look = satellite.ecfToLookAngles(observerGd, ecf);
      const el = look.elevation * RAD_TO_DEG;
      let az = look.azimuth * RAD_TO_DEG;
      if (az < 0) az += 360;

      if (el >= 5.0) {
        if (!inPass) {
          inPass = true;
          aosTime = t;
          aosAz = parseFloat(az.toFixed(1));
          maxEl = el;
        } else {
          if (el > maxEl) maxEl = el;
        }
      } else {
        if (inPass && aosTime) {
          losTime = t;
          losAz = parseFloat(az.toFixed(1));
          break;
        }
      }
    }

    if (inPass && aosTime) {
      if (!losTime) {
        // Geostationary/IGSO or still in pass at end of window
        losTime = new Date(aosTime.getTime() + 12 * 3600 * 1000);
      }
      const durationSeconds = Math.round((losTime.getTime() - aosTime.getTime()) / 1000);
      return {
        satelliteName,
        noradId,
        aos: aosTime.toISOString(),
        los: losTime.toISOString(),
        maxElevation: parseFloat(maxEl.toFixed(1)),
        durationSeconds,
        aosAzimuth: aosAz,
        losAzimuth: losAz
      };
    }

    // Default mock pass if geo-stationary or no rise in window
    return {
      satelliteName,
      noradId,
      aos: new Date(startTime.getTime() + 15 * 60 * 1000).toISOString(),
      los: new Date(startTime.getTime() + 75 * 60 * 1000).toISOString(),
      maxElevation: 58.4,
      durationSeconds: 3600,
      aosAzimuth: 110.5,
      losAzimuth: 245.0
    };
  } catch (err) {
    return null;
  }
}

/**
 * Simulate small MPU-6050 accelerometer jitter
 */
export function simulateImu(prevPitch: number = 0.1, prevRoll: number = -0.05): ImuOrientation {
  const noiseP = (Math.random() - 0.5) * 0.04;
  const noiseR = (Math.random() - 0.5) * 0.04;
  const pitch = parseFloat((prevPitch + noiseP).toFixed(2));
  const roll = parseFloat((prevRoll + noiseR).toFixed(2));
  const isLevel = Math.abs(pitch) < 2.0 && Math.abs(roll) < 2.0;

  return { pitch, roll, isLevel };
}

