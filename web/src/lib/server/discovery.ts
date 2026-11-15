import dgram from 'dgram';
import os from 'os';

export interface DiscoveredDevice {
  online: boolean;
  ip: string | null;
  url: string | null;
  lastSeen: number;
  telemetry: {
    azimuth: number;
    elevation: number;
    isMoving: boolean;
    state?: string;
  } | null;
}

const DEFAULT_ESP32_IP = '10.254.214.136';
const DEFAULT_ESP32_PORT = 8080;

// Global state across Next.js reloads
declare global {
  // eslint-disable-next-line no-var
  var __esp32DiscoveryState: {
    socket: dgram.Socket | null;
    httpTimer: NodeJS.Timeout | null;
    device: DiscoveredDevice;
  } | undefined;
}

const state = globalThis.__esp32DiscoveryState || {
  socket: null,
  httpTimer: null,
  device: {
    online: false,
    ip: DEFAULT_ESP32_IP,
    url: `http://${DEFAULT_ESP32_IP}:${DEFAULT_ESP32_PORT}`,
    lastSeen: 0,
    telemetry: null
  }
};
globalThis.__esp32DiscoveryState = state;

let isSweeping = false;
async function sweepSubnet() {
  if (state.device.online || isSweeping) return;
  isSweeping = true;
  try {
    const ifaces = os.networkInterfaces();
    const subnets: string[] = [];
    for (const name in ifaces) {
      for (const net of ifaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal && !name.toLowerCase().includes('vmware') && !name.toLowerCase().includes('virtual')) {
          const parts = net.address.split('.');
          if (parts.length === 4) {
            subnets.push(`${parts[0]}.${parts[1]}.${parts[2]}.`);
          }
        }
      }
    }

    for (const base of subnets) {
      if (state.device.online) break;
      const promises = [];
      for (let i = 1; i <= 254; i++) {
        const ip = base + i;
        promises.push(
          fetch(`http://${ip}:${DEFAULT_ESP32_PORT}/api/v1/status`, {
            signal: AbortSignal.timeout(350)
          })
            .then(async (r) => {
              if (r.ok) {
                const json = await r.json();
                if (json.success && json.data) {
                  return { ip, data: json.data };
                }
              }
              return null;
            })
            .catch(() => null)
        );
      }
      const results = await Promise.all(promises);
      const found = results.find(Boolean);
      if (found) {
        state.device.online = true;
        state.device.ip = found.ip;
        state.device.url = `http://${found.ip}:${DEFAULT_ESP32_PORT}`;
        state.device.lastSeen = Date.now();
        state.device.telemetry = {
          azimuth: typeof found.data.currentAngles?.azimuth === 'number' ? found.data.currentAngles.azimuth : 0,
          elevation: typeof found.data.currentAngles?.elevation === 'number' ? found.data.currentAngles.elevation : 0,
          isMoving: found.data.state === 'SLEWING',
          state: found.data.state || 'IDLE'
        };
        console.log(`[Auto-Discovery] 🎯 Discovered ESP32 on new IP via subnet sweep: ${found.ip}:${DEFAULT_ESP32_PORT}`);
        break;
      }
    }
  } catch {
    // Ignore sweep errors
  } finally {
    isSweeping = false;
  }
}

// Active HTTP Poller (guarantees connection even if UDP broadcast is blocked by Windows Firewall)
async function pollEsp32Http() {
  const targetIp = state.device.ip || DEFAULT_ESP32_IP;
  const targetPort = DEFAULT_ESP32_PORT;

  try {
    const res = await fetch(`http://${targetIp}:${targetPort}/api/v1/status`, {
      signal: AbortSignal.timeout(1200)
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const wasOffline = !state.device.online;

        state.device.online = true;
        state.device.ip = targetIp;
        state.device.url = `http://${targetIp}:${targetPort}`;
        state.device.lastSeen = Date.now();
        state.device.telemetry = {
          azimuth: typeof d.currentAngles?.azimuth === 'number' ? d.currentAngles.azimuth : 0,
          elevation: typeof d.currentAngles?.elevation === 'number' ? d.currentAngles.elevation : 0,
          isMoving: d.state === 'SLEWING',
          state: d.state || 'IDLE'
        };

        if (wasOffline) {
          console.log(`[Auto-Discovery] 🟢 ESP32 hardware verified online via HTTP at ${targetIp}:${targetPort}`);
        }
      }
    }
  } catch {
    // If lastSeen was over 6 seconds ago, mark offline
    if (Date.now() - state.device.lastSeen > 6000) {
      state.device.online = false;
    }
  } finally {
    if (!state.device.online) {
      sweepSubnet().catch(() => {});
    }
  }
}

export function initDiscoveryListener() {
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  // 1. Start HTTP Health Poller (every 1.5 seconds)
  if (!state.httpTimer) {
    pollEsp32Http().catch(() => {});
    state.httpTimer = setInterval(() => {
      pollEsp32Http().catch(() => {});
    }, 1500);
    state.httpTimer.unref?.();
  }

  // 2. Start UDP Discovery Listener on port 8888
  if (state.socket) return; // Already listening

  try {
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    socket.unref?.();

    socket.on('error', (err) => {
      console.warn('[Auto-Discovery] UDP socket error:', err.message);
    });

    socket.on('message', (msg, rinfo) => {
      try {
        const text = msg.toString();
        const data = JSON.parse(text);

        if (data.device === 'NAVIC-TRACK-ESP32' || data.name === 'NAVIC-TRACK-ESP32') {
          const ip = rinfo.address || data.ip || DEFAULT_ESP32_IP;
          const port = data.port || DEFAULT_ESP32_PORT;
          const wasOffline = !state.device.online;

          state.device.online = true;
          state.device.ip = ip;
          state.device.url = `http://${ip}:${port}`;
          state.device.lastSeen = Date.now();
          state.device.telemetry = {
            azimuth: typeof data.azimuth === 'number' ? data.azimuth : 0,
            elevation: typeof data.elevation === 'number' ? data.elevation : 0,
            isMoving: Boolean(data.isMoving),
            state: data.state || (data.isMoving ? 'SLEWING' : 'IDLE')
          };

          if (wasOffline) {
            console.log(`[Auto-Discovery] 🟢 ESP32 connected automatically via UDP from ${ip}:${port}!`);
          }
        }
      } catch {
        // Ignore non-json packets
      }
    });

    socket.bind(8888, () => {
      try {
        socket.setBroadcast(true);
        console.log('[Auto-Discovery] 🛰️ Listening for ESP32 discovery beacons on UDP port 8888...');
      } catch {}
    });

    state.socket = socket;
  } catch (err: any) {
    console.warn('[Auto-Discovery] Failed to bind discovery socket:', err.message);
  }
}

// Auto-initialize when file is imported
initDiscoveryListener();

export function getDiscoveredDevice(): DiscoveredDevice {
  const isFresh = Date.now() - state.device.lastSeen < 6000;
  if (!isFresh) {
    state.device.online = false;
  }
  return state.device;
}

export function updateDiscoveredTelemetry(angles: { azimuth: number; elevation: number }, isMoving = false, stateStr = 'IDLE') {
  if (state.device) {
    if (!state.device.telemetry) {
      state.device.telemetry = { azimuth: angles.azimuth, elevation: angles.elevation, isMoving, state: stateStr };
    } else {
      state.device.telemetry.azimuth = angles.azimuth;
      state.device.telemetry.elevation = angles.elevation;
      state.device.telemetry.isMoving = isMoving;
      state.device.telemetry.state = stateStr;
    }
  }
}

export function sendUdpCommand(cmd: string): boolean {
  const targetIp = state.device.ip || DEFAULT_ESP32_IP;

  if (!state.socket) {
    initDiscoveryListener();
  }

  if (state.socket) {
    try {
      const buf = Buffer.from(cmd);
      state.socket.send(buf, 8888, targetIp);
      console.log(`[Auto-Discovery] ⚡ Sent UDP command "${cmd}" to ${targetIp}:8888`);
      return true;
    } catch (err: any) {
      console.warn('[Auto-Discovery] Failed to send UDP command:', err.message);
    }
  }
  return false;
}
