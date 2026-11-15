import * as satellite from 'satellite.js';
import { AngleCoordinates, SatellitePass } from '@/types/tracker';

const DEG_TO_RAD = Math.PI / 180.0;
const RAD_TO_DEG = 180.0 / Math.PI;

export interface ObserverLocation {
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  minElevationMaskDeg?: number;
}

export interface SatellitePropagationResult {
  lookAngles: AngleCoordinates;
  subSatellitePoint: {
    latitude: number;
    longitude: number;
    altitudeKm: number;
  };
  isVisible: boolean;
  rawElevationDeg: number;
  slantRangeKm: number;
  rangeRateKmS: number;
  dopplerShiftHz: number;
}

export function propagateSatellite(
  line1: string,
  line2: string,
  observer: ObserverLocation,
  date: Date = new Date()
): SatellitePropagationResult | null {
  try {
    const satrec = satellite.twoline2satrec(line1, line2);
    if (!satrec) return null;

    const pv = satellite.propagate(satrec, date);
    if (!pv || !pv.position || typeof pv.position === 'boolean') {
      return null;
    }

    const gstime = satellite.gstime(date);
    const positionGd = satellite.eciToGeodetic(pv.position, gstime);
    const satLat = parseFloat((satellite.degreesLat(positionGd.latitude)).toFixed(4));
    const satLon = parseFloat((satellite.degreesLong(positionGd.longitude)).toFixed(4));
    const satAltKm = parseFloat(positionGd.height.toFixed(1));

    const observerGd = {
      latitude: observer.latitude * DEG_TO_RAD,
      longitude: observer.longitude * DEG_TO_RAD,
      height: observer.altitudeMeters / 1000.0
    };

    const positionEcf = satellite.eciToEcf(pv.position, gstime);
    const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);

    let az = lookAngles.azimuth * RAD_TO_DEG;
    if (az < 0) az += 360.0;
    if (az >= 360.0) az -= 360.0;

    let el = lookAngles.elevation * RAD_TO_DEG;
    const clampedEl = Math.max(0, Math.min(90, el));

    const minMask = observer.minElevationMaskDeg ?? 10.0;
    const isVisible = el >= minMask;
    const slantRangeKm = parseFloat(((lookAngles as any).rangeSat || 0).toFixed(1));

    // Calculate Range Rate (km/s) using finite difference +/- 500ms
    let rangeRateKmS = 0;
    try {
      const t1 = new Date(date.getTime() - 500);
      const t2 = new Date(date.getTime() + 500);
      const pv1 = satellite.propagate(satrec, t1);
      const pv2 = satellite.propagate(satrec, t2);
      if (pv1?.position && pv2?.position && typeof pv1.position !== 'boolean' && typeof pv2.position !== 'boolean') {
        const gst1 = satellite.gstime(t1);
        const gst2 = satellite.gstime(t2);
        const ecf1 = satellite.eciToEcf(pv1.position, gst1);
        const ecf2 = satellite.eciToEcf(pv2.position, gst2);
        const look1 = satellite.ecfToLookAngles(observerGd, ecf1);
        const look2 = satellite.ecfToLookAngles(observerGd, ecf2);
        rangeRateKmS = parseFloat(((look2.rangeSat - look1.rangeSat) / 1.0).toFixed(3));
      }
    } catch {}

    // Doppler shift at 137.100 MHz (METEOR-M2 4 LRPT downlink)
    const SPEED_OF_LIGHT_KM_S = 299792.458;
    const FREQ_HZ = 137.100e6;
    const dopplerShiftHz = Math.round(-(rangeRateKmS / SPEED_OF_LIGHT_KM_S) * FREQ_HZ);

    return {
      lookAngles: {
        azimuth: parseFloat(az.toFixed(2)),
        elevation: parseFloat(clampedEl.toFixed(2))
      },
      subSatellitePoint: {
        latitude: satLat,
        longitude: satLon,
        altitudeKm: satAltKm
      },
      isVisible,
      rawElevationDeg: parseFloat(el.toFixed(2)),
      slantRangeKm,
      rangeRateKmS,
      dopplerShiftHz
    };
  } catch {
    return null;
  }
}

function getLookAt(
  satrec: satellite.SatRec,
  observerGd: { latitude: number; longitude: number; height: number },
  t: Date
): { az: number; el: number } | null {
  const pv = satellite.propagate(satrec, t);
  if (!pv || !pv.position || typeof pv.position === 'boolean') return null;

  const gst = satellite.gstime(t);
  const ecf = satellite.eciToEcf(pv.position, gst);
  const look = satellite.ecfToLookAngles(observerGd, ecf);

  let az = look.azimuth * RAD_TO_DEG;
  if (az < 0) az += 360;
  const el = look.elevation * RAD_TO_DEG;

  return { az, el };
}

export function predictNextPass(
  line1: string,
  line2: string,
  satelliteName: string,
  noradId: number,
  observer: ObserverLocation,
  startTime: Date = new Date(),
  maxHoursAhead: number = 48
): SatellitePass | null {
  try {
    const satrec = satellite.twoline2satrec(line1, line2);
    if (!satrec) return null;

    const minMask = observer.minElevationMaskDeg ?? 10.0;
    const observerGd = {
      latitude: observer.latitude * DEG_TO_RAD,
      longitude: observer.longitude * DEG_TO_RAD,
      height: observer.altitudeMeters / 1000.0
    };

    const stepSeconds = 60;
    const totalSteps = Math.floor((maxHoursAhead * 3600) / stepSeconds);

    let inPass = false;
    let aosTime: Date | null = null;
    let aosAz = 0;
    let maxEl = 0;
    let losTime: Date | null = null;
    let losAz = 0;

    const startMs = startTime.getTime();
    const initialLook = getLookAt(satrec, observerGd, startTime);
    const isInitiallyVisible = initialLook && initialLook.el >= minMask;

    if (isInitiallyVisible && initialLook) {
      inPass = true;
      aosTime = startTime;
      aosAz = parseFloat(initialLook.az.toFixed(1));
      maxEl = initialLook.el;
    }

    for (let i = 0; i < totalSteps; i++) {
      const t = new Date(startMs + i * stepSeconds * 1000);
      const look = getLookAt(satrec, observerGd, t);
      if (!look) continue;

      if (look.el >= minMask) {
        if (!inPass) {
          aosTime = t;
          aosAz = parseFloat(look.az.toFixed(1));
          maxEl = look.el;
          inPass = true;
        } else {
          if (look.el > maxEl) maxEl = look.el;
        }
      } else {
        if (inPass && aosTime) {
          losTime = t;
          losAz = parseFloat(look.az.toFixed(1));
          break;
        }
      }
    }

    if (aosTime && losTime) {
      const durationSeconds = Math.max(1, Math.round((losTime.getTime() - aosTime.getTime()) / 1000));
      return {
        satelliteName,
        noradId,
        aos: aosTime.toISOString(),
        los: losTime.toISOString(),
        maxElevation: parseFloat(maxEl.toFixed(1)),
        durationSeconds,
        aosAzimuth: aosAz,
        losAzimuth: losAz,
        elevationMaskDeg: minMask,
        isVisibleNow: Boolean(isInitiallyVisible)
      };
    }

    if (inPass && aosTime && !losTime) {
      return {
        satelliteName,
        noradId,
        aos: aosTime.toISOString(),
        los: new Date(aosTime.getTime() + 86400000).toISOString(),
        maxElevation: parseFloat(maxEl.toFixed(1)),
        durationSeconds: 86400,
        aosAzimuth: aosAz,
        losAzimuth: aosAz,
        elevationMaskDeg: minMask,
        isVisibleNow: true
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function getCardinalDirection(az: number): string {
  const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const val = Math.floor((((az % 360) + 360) % 360) / 22.5 + 0.5);
  return arr[val % 16];
}

import { KeplerianElements, HistoricalPosition, DetailedSatelliteIntelligence, SatelliteInfo, TelemetryLogEntry } from '@/types/tracker';

export function computeKeplerianElements(line1: string, line2: string): KeplerianElements {
  const inc = parseFloat(line2.substring(8, 16).trim()) || 0;
  const raan = parseFloat(line2.substring(17, 25).trim()) || 0;
  const eccStr = line2.substring(26, 33).trim();
  const ecc = parseFloat('0.' + eccStr) || 0;
  const argP = parseFloat(line2.substring(34, 42).trim()) || 0;
  const ma = parseFloat(line2.substring(43, 51).trim()) || 0;
  const n = parseFloat(line2.substring(52, 63).trim()) || 1.0;

  const bstarStr = line1.substring(53, 61).trim();
  let bstar = 0;
  if (bstarStr) {
    try {
      const sign = bstarStr.startsWith('-') ? -1 : 1;
      const cleanB = bstarStr.replace(/^[+-]/, '').trim();
      const expSign = cleanB.includes('-') ? '-' : '+';
      const parts = cleanB.split(/[+-]/);
      if (parts.length === 2) {
        bstar = sign * parseFloat('0.' + parts[0]) * Math.pow(10, parseFloat(expSign + parts[1]));
      }
    } catch {}
  }

  const nRadS = (n * 2 * Math.PI) / 86400;
  const sma = Math.pow(398600.4418 / (nRadS * nRadS), 1 / 3);
  const apogee = sma * (1 + ecc) - 6378.137;
  const perigee = sma * (1 - ecc) - 6378.137;
  const period = 1440.0 / n;

  const epochStr = line1.substring(18, 32).trim();
  let epochIso = new Date().toISOString();
  let tleAgeHours = 1.0;
  if (epochStr.length >= 5) {
    const epochYr = parseInt(epochStr.substring(0, 2), 10);
    const fullYr = epochYr < 57 ? 2000 + epochYr : 1900 + epochYr;
    const dayOfYear = parseFloat(epochStr.substring(2));
    const epochDate = new Date(Date.UTC(fullYr, 0, 1) + (dayOfYear - 1) * 86400000);
    epochIso = epochDate.toISOString();
    tleAgeHours = Math.max(0, parseFloat(((Date.now() - epochDate.getTime()) / 3600000).toFixed(1)));
  }

  return {
    inclinationDeg: parseFloat(inc.toFixed(4)),
    eccentricity: ecc,
    semiMajorAxisKm: parseFloat(sma.toFixed(1)),
    apogeeKm: parseFloat(Math.max(0, apogee).toFixed(1)),
    perigeeKm: parseFloat(Math.max(0, perigee).toFixed(1)),
    periodMinutes: parseFloat(period.toFixed(2)),
    raanDeg: parseFloat(raan.toFixed(4)),
    argOfPerigeeDeg: parseFloat(argP.toFixed(4)),
    meanAnomalyDeg: parseFloat(ma.toFixed(4)),
    meanMotionRevPerDay: parseFloat(n.toFixed(8)),
    bstar,
    epoch: epochIso,
    tleAgeHours
  };
}

export function computeHistoricalGroundTrack(
  line1: string,
  line2: string,
  observer: ObserverLocation,
  pastMinutes = 120,
  stepMinutes = 15
): HistoricalPosition[] {
  const result: HistoricalPosition[] = [];
  try {
    const satrec = satellite.twoline2satrec(line1, line2);
    if (!satrec) return result;

    const nowMs = Date.now();
    for (let m = stepMinutes; m <= pastMinutes; m += stepMinutes) {
      const t = new Date(nowMs - m * 60 * 1000);
      const pv = satellite.propagate(satrec, t);
      if (!pv?.position || typeof pv.position === 'boolean') continue;

      const gmst = satellite.gstime(t);
      const posGd = satellite.eciToGeodetic(pv.position, gmst);
      const lat = parseFloat(satellite.degreesLat(posGd.latitude).toFixed(4));
      const lon = parseFloat(satellite.degreesLong(posGd.longitude).toFixed(4));
      const altKm = parseFloat(posGd.height.toFixed(1));

      let velKmS = 7.5;
      if (pv.velocity && typeof pv.velocity !== 'boolean') {
        velKmS = parseFloat(Math.sqrt(pv.velocity.x ** 2 + pv.velocity.y ** 2 + pv.velocity.z ** 2).toFixed(2));
      }

      const observerGd = {
        latitude: observer.latitude * DEG_TO_RAD,
        longitude: observer.longitude * DEG_TO_RAD,
        height: observer.altitudeMeters / 1000.0
      };
      const ecf = satellite.eciToEcf(pv.position, gmst);
      const look = satellite.ecfToLookAngles(observerGd, ecf);
      let az = look.azimuth * RAD_TO_DEG;
      if (az < 0) az += 360;
      const el = look.elevation * RAD_TO_DEG;

      result.push({
        timestamp: t.toISOString(),
        timeAgoMinutes: m,
        latitude: lat,
        longitude: lon,
        altitudeKm: altKm,
        velocityKmS: velKmS,
        azimuthDeg: parseFloat(az.toFixed(1)),
        elevationDeg: parseFloat(el.toFixed(1)),
        isAboveHorizon: el >= (observer.minElevationMaskDeg ?? 10.0),
        type: 'RECONSTRUCTED_SGP4',
        source: 'SGP4 Analytical Ephemeris'
      });
    }
  } catch {}
  return result;
}

export function computeMultiPassPredictions(
  line1: string,
  line2: string,
  satelliteName: string,
  noradId: number,
  observer: ObserverLocation,
  maxPasses = 5,
  maxHoursAhead = 72
): SatellitePass[] {
  const passes: SatellitePass[] = [];
  try {
    const satrec = satellite.twoline2satrec(line1, line2);
    if (!satrec) return passes;

    const minMask = observer.minElevationMaskDeg ?? 10.0;
    const observerGd = {
      latitude: observer.latitude * DEG_TO_RAD,
      longitude: observer.longitude * DEG_TO_RAD,
      height: observer.altitudeMeters / 1000.0
    };

    const stepSeconds = 45;
    const totalSteps = Math.floor((maxHoursAhead * 3600) / stepSeconds);
    const startMs = Date.now();

    let inPass = false;
    let currentAos: Date | null = null;
    let currentAosAz = 0;
    let currentMaxEl = 0;

    for (let i = 0; i < totalSteps && passes.length < maxPasses; i++) {
      const t = new Date(startMs + i * stepSeconds * 1000);
      const look = getLookAt(satrec, observerGd, t);
      if (!look) continue;

      if (look.el >= minMask) {
        if (!inPass) {
          inPass = true;
          currentAos = t;
          currentAosAz = parseFloat(look.az.toFixed(1));
          currentMaxEl = look.el;
        } else {
          if (look.el > currentMaxEl) currentMaxEl = look.el;
        }
      } else {
        if (inPass && currentAos) {
          const losTime = t;
          const losAz = parseFloat(look.az.toFixed(1));
          const durSec = Math.max(1, Math.round((losTime.getTime() - currentAos.getTime()) / 1000));
          passes.push({
            satelliteName,
            noradId,
            aos: currentAos.toISOString(),
            los: losTime.toISOString(),
            maxElevation: parseFloat(currentMaxEl.toFixed(1)),
            durationSeconds: durSec,
            aosAzimuth: currentAosAz,
            losAzimuth: losAz,
            elevationMaskDeg: minMask,
            isVisibleNow: currentAos.getTime() <= startMs && losTime.getTime() >= startMs
          });
          inPass = false;
          currentAos = null;
        }
      }
    }
  } catch {}
  return passes;
}

export function computeDetailedIntelligence(
  satelliteInfo: SatelliteInfo,
  observer: ObserverLocation,
  archivedLogs?: TelemetryLogEntry[]
): DetailedSatelliteIntelligence | null {
  try {
    const { line1, line2 } = satelliteInfo.tle;
    const satrec = satellite.twoline2satrec(line1, line2);
    if (!satrec) return null;

    const now = new Date();
    const pv = satellite.propagate(satrec, now);
    if (!pv?.position || typeof pv.position === 'boolean') return null;

    const gmst = satellite.gstime(now);
    const posGd = satellite.eciToGeodetic(pv.position, gmst);
    const lat = parseFloat(satellite.degreesLat(posGd.latitude).toFixed(4));
    const lon = parseFloat(satellite.degreesLong(posGd.longitude).toFixed(4));
    const altKm = parseFloat(posGd.height.toFixed(1));

    let velKmS = 7.5;
    if (pv.velocity && typeof pv.velocity !== 'boolean') {
      velKmS = parseFloat(Math.sqrt(pv.velocity.x ** 2 + pv.velocity.y ** 2 + pv.velocity.z ** 2).toFixed(3));
    }

    const observerGd = {
      latitude: observer.latitude * DEG_TO_RAD,
      longitude: observer.longitude * DEG_TO_RAD,
      height: observer.altitudeMeters / 1000.0
    };
    const ecf = satellite.eciToEcf(pv.position, gmst);
    const look = satellite.ecfToLookAngles(observerGd, ecf);
    let az = look.azimuth * RAD_TO_DEG;
    if (az < 0) az += 360;
    const rawEl = look.elevation * RAD_TO_DEG;
    const clampedEl = Math.max(0, Math.min(90, rawEl));

    // Range Rate & Doppler
    let rangeRateKmS = 0;
    try {
      const t1 = new Date(now.getTime() - 500);
      const t2 = new Date(now.getTime() + 500);
      const pv1 = satellite.propagate(satrec, t1);
      const pv2 = satellite.propagate(satrec, t2);
      if (pv1?.position && pv2?.position && typeof pv1.position !== 'boolean' && typeof pv2.position !== 'boolean') {
        const gst1 = satellite.gstime(t1);
        const gst2 = satellite.gstime(t2);
        const ecf1 = satellite.eciToEcf(pv1.position, gst1);
        const ecf2 = satellite.eciToEcf(pv2.position, gst2);
        const look1 = satellite.ecfToLookAngles(observerGd, ecf1);
        const look2 = satellite.ecfToLookAngles(observerGd, ecf2);
        rangeRateKmS = parseFloat(((look2.rangeSat - look1.rangeSat) / 1.0).toFixed(3));
      }
    } catch {}

    const downFreq = satelliteInfo.downlinkFreqMhz || (satelliteInfo.name.includes('METEOR') ? 137.1 : 137.9);
    const SPEED_OF_LIGHT_KM_S = 299792.458;
    const dopplerShiftHz = Math.round(-(rangeRateKmS / SPEED_OF_LIGHT_KM_S) * (downFreq * 1e6));

    const minMask = observer.minElevationMaskDeg ?? 10.0;
    const isVisible = rawEl >= minMask;

    // Physical tracking envelope: Dual-axis rotator is capable of Az 0°-360°, El 0°-90°
    const isTrackable = isVisible && rawEl >= 0.0 && rawEl <= 90.0;
    let trackingReason = 'In line-of-sight and fully trackable by dual-axis rotator';
    if (!isVisible) {
      trackingReason = rawEl < 0
        ? `Below horizon (Elevation ${rawEl.toFixed(1)}°). Rotator will pre-aim at AOS.`
        : `Below elevation cutoff mask of ${minMask.toFixed(1)}° (current El ${rawEl.toFixed(1)}°).`;
    }

    const keplerian = computeKeplerianElements(line1, line2);
    const history = computeHistoricalGroundTrack(line1, line2, observer, 120, 15);

    // Merge any actual station logs if available
    if (archivedLogs && archivedLogs.length > 0) {
      for (const log of archivedLogs.slice(0, 10)) {
        history.unshift({
          timestamp: log.timestamp,
          timeAgoMinutes: Math.round((Date.now() - new Date(log.timestamp).getTime()) / 60000),
          latitude: lat,
          longitude: lon,
          altitudeKm: altKm,
          velocityKmS: velKmS,
          azimuthDeg: log.actualAzimuth,
          elevationDeg: log.actualElevation,
          isAboveHorizon: log.actualElevation >= minMask,
          type: 'ARCHIVED_STATION_OBSERVATION',
          source: 'Dual-Axis Physical Rotator Observation'
        });
      }
    }

    const upcomingPasses = computeMultiPassPredictions(line1, line2, satelliteInfo.name, satelliteInfo.noradId, observer, 5, 72);

    return {
      name: satelliteInfo.name,
      noradId: satelliteInfo.noradId,
      country: satelliteInfo.country || 'International',
      category: satelliteInfo.group || 'LEO',
      orbitType: satelliteInfo.orbitType || (keplerian.periodMinutes > 1400 ? 'GEO' : keplerian.periodMinutes > 200 ? 'MEO' : 'LEO'),
      cosparId: satelliteInfo.cosparId || null,
      launchDate: satelliteInfo.launchYear ? `${satelliteInfo.launchYear}` : null,
      downlinkBand: satelliteInfo.downlinkBand || '137.100 MHz (VHF)',
      downlinkFreqMhz: downFreq,
      currentPosition: {
        latitude: lat,
        longitude: lon,
        altitudeKm: altKm,
        velocityKmS: velKmS,
        velocityKmH: Math.round(velKmS * 3600)
      },
      groundStationLook: {
        azimuthDeg: parseFloat(az.toFixed(2)),
        elevationDeg: parseFloat(clampedEl.toFixed(2)),
        cardinal: getCardinalDirection(az),
        slantRangeKm: parseFloat(((look as any).rangeSat || 0).toFixed(1)),
        rangeRateKmS,
        dopplerShiftHz,
        isVisible,
        isTrackable,
        trackingReason
      },
      keplerian,
      tle: {
        satelliteName: satelliteInfo.name,
        noradId: satelliteInfo.noradId,
        line1,
        line2,
        updatedAt: keplerian.epoch,
        source: 'CELESTRAK'
      },
      history,
      upcomingPasses,
      freshness: {
        fetchedAt: new Date().toISOString(),
        source: 'CelesTrak GP API',
        tleAgeHours: keplerian.tleAgeHours
      }
    };
  } catch {
    return null;
  }
}
