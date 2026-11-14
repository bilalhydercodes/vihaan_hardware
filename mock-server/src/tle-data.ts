import { SatelliteInfo, TleData } from '../../shared/types/tracker.js';

// Robust offline fallback TLEs for NavIC/IRNSS and ISS
export const FALLBACK_SATELLITES: SatelliteInfo[] = [
  {
    name: 'NavIC-1B (IRNSS-1B)',
    noradId: 39635,
    group: 'NAVIC',
    tle: {
      line1: '1 39635U 14017A   24080.50000000 -.00000100  00000-0  00000-0 0  9993',
      line2: '2 39635  29.5000 130.0000 0012000  75.0000 285.0000  1.00270000 37001'
    }
  },
  {
    name: 'NavIC-1C (IRNSS-1C)',
    noradId: 40269,
    group: 'NAVIC',
    tle: {
      line1: '1 40269U 14061A   24080.50000000  .00000050  00000-0  00000-0 0  9990',
      line2: '2 40269   5.2000  83.0000 0015000 110.0000 250.0000  1.00270000 34002'
    }
  },
  {
    name: 'NavIC-1D (IRNSS-1D)',
    noradId: 40547,
    group: 'NAVIC',
    tle: {
      line1: '1 40547U 15018A   24080.50000000 -.00000080  00000-0  00000-0 0  9998',
      line2: '2 40547  30.8000 111.7500 0018000  60.0000 300.0000  1.00270000 33005'
    }
  },
  {
    name: 'NavIC-1E (IRNSS-1E)',
    noradId: 41241,
    group: 'NAVIC',
    tle: {
      line1: '1 41241U 16003A   24080.50000000 -.00000060  00000-0  00000-0 0  9995',
      line2: '2 41241  30.5000 111.7500 0017000  80.0000 280.0000  1.00270000 30004'
    }
  },
  {
    name: 'NavIC-1F (IRNSS-1F)',
    noradId: 41384,
    group: 'NAVIC',
    tle: {
      line1: '1 41384U 16015A   24080.50000000  .00000040  00000-0  00000-0 0  9997',
      line2: '2 41384   5.1000  32.5000 0011000 135.0000 225.0000  1.00270000 29503'
    }
  },
  {
    name: 'NavIC-1I (IRNSS-1I)',
    noradId: 43286,
    group: 'NAVIC',
    tle: {
      line1: '1 43286U 18035A   24080.50000000 -.00000070  00000-0  00000-0 0  9992',
      line2: '2 43286  29.4000  55.0000 0020000  70.0000 290.0000  1.00270000 22001'
    }
  },
  {
    name: 'ISS (ZARYA)',
    noradId: 25544,
    group: 'LEO',
    tle: {
      line1: '1 25544U 98067A   24080.50000000  .00015000  00000-0  28000-4 0  9999',
      line2: '2 25544  51.6400 120.5000 0005000  90.0000 270.0000 15.50000000450008'
    }
  }
];

let cachedCatalog: SatelliteInfo[] = [...FALLBACK_SATELLITES];

export function parse3LineTle(text: string, group: SatelliteInfo['group'] = 'NAVIC'): SatelliteInfo[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const result: SatelliteInfo[] = [];

  for (let i = 0; i < lines.length; i++) {
    // If line starts with 1, it might be 2-line format without name
    if (lines[i].startsWith('1 ') && lines[i + 1]?.startsWith('2 ')) {
      const line1 = lines[i];
      const line2 = lines[i + 1];
      const noradId = parseInt(line1.substring(2, 7).trim(), 10) || 0;
      const name = i > 0 && !lines[i - 1].startsWith('1 ') && !lines[i - 1].startsWith('2 ')
        ? lines[i - 1]
        : `SAT-${noradId}`;
      result.push({
        name,
        noradId,
        group,
        tle: { line1, line2 }
      });
      i += 1;
    }
  }
  return result;
}

export async function fetchCelestrakPresets(): Promise<SatelliteInfo[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    // Fetch IRNSS group from CelesTrak
    const res = await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=irnss&FORMAT=tle', {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const text = await res.text();
      const fetched = parse3LineTle(text, 'NAVIC');
      if (fetched.length > 0) {
        // Merge with ISS for LEO demonstration
        const iss = FALLBACK_SATELLITES.find(s => s.noradId === 25544);
        cachedCatalog = [...fetched, ...(iss ? [iss] : [])];
        return cachedCatalog;
      }
    }
  } catch (err) {
    // Network error or timeout, safely fall back
  }

  return cachedCatalog;
}

export function getCachedCatalog(): SatelliteInfo[] {
  return cachedCatalog;
}

export function findSatelliteByNameOrNorad(query: string | number): SatelliteInfo | undefined {
  if (typeof query === 'number') {
    return cachedCatalog.find(s => s.noradId === query);
  }
  const clean = query.toLowerCase().trim();
  return cachedCatalog.find(s =>
    s.name.toLowerCase().includes(clean) ||
    s.noradId.toString() === clean
  );
}

