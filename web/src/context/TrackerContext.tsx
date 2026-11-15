'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  TrackerStatus,
  TelemetryData,
  LeanTelemetryPacket,
  TimeSyncRequest,
  TimeSyncResponse
} from '@shared/types/tracker';
import { trackerApi, getStoredAuthToken, setStoredAuthToken, clearStoredAuthToken, getBaseUrl } from '@/lib/api';
import { decodeTelemetryPacket, setCachedSatelliteName } from '@/lib/decoder';
import { webSerial } from '@/lib/serial';

export type ConnectionState = 'connected' | 'connecting' | 'disconnected';
export type ConnectionMethod = 'usb' | 'wifi' | 'none';

interface TrackerContextType {
  connectionStatus: ConnectionState;
  connectionMethod: ConnectionMethod;
  reconnectCountdown: number | null;
  reconnectNow: () => void;
  telemetry: TelemetryData | null;
  status: TrackerStatus | null;
  authToken: string | null;
  setAuthToken: (token: string) => void;
  clearAuthToken: () => void;
  isTokenModalOpen: boolean;
  setTokenModalOpen: (open: boolean) => void;
  refreshStatus: () => Promise<void>;
  syncTime: (action: TimeSyncRequest['action'], customTimestamp?: string) => Promise<TimeSyncResponse>;
  lastPacketTime: number | null;
  connectUsb: (baudRate?: number) => Promise<boolean>;
  disconnectUsb: () => Promise<void>;
  isUsbConnected: boolean;
  sendHardwareCommand: (cmd: string) => Promise<boolean>;
}

const TrackerContext = createContext<TrackerContextType | undefined>(undefined);

function getValidWsUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const envWs = process.env.NEXT_PUBLIC_TRACKER_WS_URL;
  if (envWs && envWs.trim() !== '') {
    if (envWs.includes('localhost:8080') || envWs.includes('navic-tracker-live.trycloudflare.com')) return null;
    return envWs;
  }
  return null;
}

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionState>('disconnected');
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>('none');
  const [isUsbConnected, setIsUsbConnected] = useState(false);
  const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [status, setStatus] = useState<TrackerStatus | null>(null);
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [isTokenModalOpen, setTokenModalOpen] = useState(false);
  const [lastPacketTime, setLastPacketTime] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(1000); // Start at 1s backoff
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  const lastPacketTimeRef = useRef<number>(0);

  // Initialize stored token on mount
  useEffect(() => {
    const saved = getStoredAuthToken();
    if (saved) {
      setAuthTokenState(saved);
    }
  }, []);

  // Web Serial Listeners
  useEffect(() => {
    const unsubStatus = webSerial.onStatus((connected) => {
      setIsUsbConnected(connected);
      if (connected) {
        setConnectionStatus('connected');
        setConnectionMethod('usb');
      } else {
        setConnectionMethod(prev => prev === 'usb' ? 'none' : prev);
      }
    });

    const unsubTelemetry = webSerial.onTelemetry((data) => {
      setConnectionStatus('connected');
      setConnectionMethod('usb');
      setTelemetry(prev => {
        const target = prev?.targetAngles || status?.targetAngles || { azimuth: 0, elevation: 0 };
        return {
          timestamp: Date.now(),
          state: data.isMoving ? 'SLEWING' : 'IDLE',
          homed: true,
          currentAngles: { azimuth: data.azimuth, elevation: data.elevation },
          targetAngles: target,
          trackingErrorDeg: Math.abs(target.azimuth - data.azimuth),
          satelliteName: prev?.satelliteName || status?.satelliteName || 'IRNSS-1B',
          satellitePosition: prev?.satellitePosition,
          isVisible: prev?.isVisible ?? true,
          imu: { pitch: 0, roll: 0, isLevel: true }
        };
      });
      lastPacketTimeRef.current = Date.now();
      setLastPacketTime(Date.now());
    });

    // Try auto-reconnecting to previously paired USB COM port
    webSerial.autoConnect(115200).catch(() => {});

    return () => {
      unsubStatus();
      unsubTelemetry();
    };
  }, [status]);

  const connectUsb = useCallback(async (baudRate = 9600): Promise<boolean> => {
    try {
      const ok = await webSerial.connect(baudRate);
      if (ok) {
        setIsUsbConnected(true);
        setConnectionStatus('connected');
        setConnectionMethod('usb');
      }
      return ok;
    } catch (e: any) {
      alert(e.message || 'Failed to connect via USB');
      return false;
    }
  }, []);

  const disconnectUsb = useCallback(async (): Promise<void> => {
    await webSerial.disconnect();
    setIsUsbConnected(false);
    setConnectionMethod('none');
    refreshStatus();
  }, []);

  const sendHardwareCommand = useCallback(async (cmd: string): Promise<boolean> => {
    if (webSerial.isConnected()) {
      return webSerial.sendCommand(cmd);
    }
    // Route command via standard API route (or custom tracker URL if configured)
    try {
      const endpoint = cmd === 'STOP' ? '/api/v1/stop'
        : cmd === 'HOME' ? '/api/v1/home'
        : cmd.startsWith('GOTO,') ? '/api/v1/move'
        : '/api/v1/jog';

      let body: any = cmd;
      if (cmd.startsWith('GOTO,')) {
        const parts = cmd.split(',');
        body = JSON.stringify({ azimuth: parseFloat(parts[1]), elevation: parseFloat(parts[2]) });
      }

      const res = await fetch(`${getBaseUrl()}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: typeof body === 'string' && body.startsWith('{') ? body : JSON.stringify({ cmd }),
        signal: AbortSignal.timeout(2500)
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  const setAuthToken = useCallback((token: string) => {
    setStoredAuthToken(token);
    setAuthTokenState(token);
  }, []);

  const clearAuthToken = useCallback(() => {
    clearStoredAuthToken();
    setAuthTokenState(null);
  }, []);

  // Fetch full status
  const refreshStatus = useCallback(async () => {
    // If Web Serial USB is active, it handles telemetry directly
    if (webSerial.isConnected()) {
      setConnectionStatus('connected');
      setConnectionMethod('usb');
      return;
    }

    try {
      const data = await trackerApi.getStatus();
      setStatus(data);
      if (data.satelliteName) {
        setCachedSatelliteName(data.satelliteName);
      }
      // When WebSocket is not open, use real HTTP telemetry from hardware
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        let isLive = data.hardwareConnected === true;

        // If backend proxy didn't detect hardware, try direct browser-to-ESP32 fetch on local Wi-Fi
        if (!isLive && typeof window !== 'undefined') {
          try {
            const directRes = await fetch('http://10.254.214.136:8080/api/v1/status', {
              signal: AbortSignal.timeout(1200)
            });
            if (directRes.ok) {
              const directJson = await directRes.json();
              if (directJson.success && directJson.data) {
                const hw = directJson.data;
                isLive = true;
                data.hardwareConnected = true;
                data.currentAngles = hw.currentAngles || data.currentAngles;
                data.state = hw.state || data.state;
                data.homed = Boolean(hw.homed);
              }
            }
          } catch {}
        }

        setConnectionStatus(isLive ? 'connected' : 'disconnected');
        setConnectionMethod(isLive ? 'wifi' : 'none');
        if (isLive) {
          setTelemetry({
            timestamp: Date.now(),
            state: data.state || 'IDLE',
            homed: data.homed ?? true,
            currentAngles: data.currentAngles || { azimuth: 0, elevation: 0 },
            targetAngles: data.targetAngles || { azimuth: 0, elevation: 0 },
            trackingErrorDeg: data.trackingErrorDeg ?? Math.abs((data.targetAngles?.azimuth || 0) - (data.currentAngles?.azimuth || 0)),
            satelliteName: data.satelliteName || 'METEOR-M2 4',
            satellitePosition: data.satellitePosition,
            isVisible: data.isVisible ?? false,
            imu: data.imu || { pitch: 0, roll: 0, isLevel: true }
          });
          lastPacketTimeRef.current = Date.now();
          setLastPacketTime(Date.now());
        } else {
          setTelemetry(null);
        }
      }
    } catch {
      // Direct browser fallback when backend API is unreachable or times out
      if (typeof window !== 'undefined') {
        try {
          const directRes = await fetch('http://10.254.214.136:8080/api/v1/status', {
            signal: AbortSignal.timeout(1200)
          });
          if (directRes.ok) {
            const directJson = await directRes.json();
            if (directJson.success && directJson.data) {
              const hw = directJson.data;
              setConnectionStatus('connected');
              setConnectionMethod('wifi');
              setTelemetry({
                timestamp: Date.now(),
                state: hw.state || 'IDLE',
                homed: Boolean(hw.homed),
                currentAngles: hw.currentAngles || { azimuth: 0, elevation: 0 },
                targetAngles: hw.targetAngles || { azimuth: 0, elevation: 0 },
                trackingErrorDeg: 0,
                satelliteName: hw.satelliteName || 'METEOR-M2 4',
                isVisible: hw.isVisible ?? true,
                imu: { pitch: 0, roll: 0, isLevel: true }
              });
              lastPacketTimeRef.current = Date.now();
              setLastPacketTime(Date.now());
              return;
            }
          }
        } catch {}
      }

      const hasRecentTelemetry = Date.now() - lastPacketTimeRef.current < 4000;
      if (!hasRecentTelemetry && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
        setConnectionStatus('disconnected');
        setConnectionMethod('none');
      }
    }
  }, []);

  // Time sync action
  const syncTime = useCallback(async (action: TimeSyncRequest['action'], customTimestamp?: string): Promise<TimeSyncResponse> => {
    const res = await trackerApi.syncTime({
      action,
      timestamp: customTimestamp || (action === 'MANUAL' ? new Date().toISOString() : undefined)
    });
    await refreshStatus();
    return res;
  }, [refreshStatus]);

  const cleanupSocket = useCallback(() => {
    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try {
        ws.close();
      } catch (e) {}
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setReconnectCountdown(null);
  }, []);

  // Connect WebSocket
  const connectWs = useCallback(() => {
    if (isUnmountedRef.current) return;

    const wsUrl = getValidWsUrl();
    if (!wsUrl) {
      // In serverless / cloud mode without external WebSocket, rely directly on HTTP polling
      return;
    }

    // If socket is already OPEN or CONNECTING, do not reopen!
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    clearTimers();
    cleanupSocket();

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmountedRef.current) return;
        setConnectionStatus('connected');
        backoffRef.current = 1000; // Reset backoff
        clearTimers();
        refreshStatus();
      };

      ws.onmessage = (event) => {
        if (isUnmountedRef.current) return;
        try {
          const packet: LeanTelemetryPacket = JSON.parse(event.data);
          const decoded = decodeTelemetryPacket(packet);
          setTelemetry(decoded);
          lastPacketTimeRef.current = Date.now();
          setLastPacketTime(Date.now());
        } catch (e) {
          console.error('Failed to parse telemetry packet:', e);
        }
      };

      ws.onclose = () => {
        if (isUnmountedRef.current) return;
        const hasRecentTelemetry = Date.now() - lastPacketTimeRef.current < 4000;
        if (!hasRecentTelemetry) {
          setConnectionStatus('disconnected');
        }

        // Only schedule reconnect if not already scheduled
        if (!reconnectTimerRef.current) {
          const delay = Math.min(backoffRef.current, 10000);
          backoffRef.current = Math.min(delay * 1.5, 10000);

          let remainingSeconds = Math.ceil(delay / 1000);
          setReconnectCountdown(remainingSeconds);

          countdownTimerRef.current = setInterval(() => {
            remainingSeconds -= 1;
            if (remainingSeconds <= 0) {
              if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
              countdownTimerRef.current = null;
              setReconnectCountdown(null);
            } else {
              setReconnectCountdown(remainingSeconds);
            }
          }, 1000);

          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            connectWs();
          }, delay);
        }
      };

      ws.onerror = () => {
        if (isUnmountedRef.current) return;
        const hasRecentTelemetry = Date.now() - lastPacketTimeRef.current < 4000;
        if (!hasRecentTelemetry) {
          setConnectionStatus('disconnected');
        }
      };
    } catch (err) {
      if (isUnmountedRef.current) return;
      const hasRecentTelemetry = Date.now() - lastPacketTimeRef.current < 4000;
      if (!hasRecentTelemetry) {
        setConnectionStatus('disconnected');
      }
    }
  }, [clearTimers, cleanupSocket, refreshStatus]);

  const reconnectNow = useCallback(() => {
    backoffRef.current = 1000;
    clearTimers();
    cleanupSocket();
    connectWs();
    refreshStatus();
  }, [clearTimers, cleanupSocket, connectWs, refreshStatus]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connectWs();
    refreshStatus();

    // Poll status periodically (every 1.5 seconds) to keep telemetry live when WebSockets are unavailable (e.g. on Vercel)
    const statusInterval = setInterval(refreshStatus, 1500);

    return () => {
      isUnmountedRef.current = true;
      clearInterval(statusInterval);
      clearTimers();
      cleanupSocket();
    };
  }, [connectWs, refreshStatus, clearTimers, cleanupSocket]);

  const contextValue = useMemo<TrackerContextType>(() => ({
    connectionStatus,
    connectionMethod,
    reconnectCountdown,
    reconnectNow,
    telemetry,
    status,
    authToken,
    setAuthToken,
    clearAuthToken,
    isTokenModalOpen,
    setTokenModalOpen,
    refreshStatus,
    syncTime,
    lastPacketTime,
    connectUsb,
    disconnectUsb,
    isUsbConnected,
    sendHardwareCommand
  }), [
    connectionStatus,
    connectionMethod,
    reconnectCountdown,
    reconnectNow,
    telemetry,
    status,
    authToken,
    setAuthToken,
    clearAuthToken,
    isTokenModalOpen,
    refreshStatus,
    syncTime,
    lastPacketTime,
    connectUsb,
    disconnectUsb,
    isUsbConnected,
    sendHardwareCommand
  ]);

  return (
    <TrackerContext.Provider value={contextValue}>
      {children}
    </TrackerContext.Provider>
  );
}

export function useTracker() {
  const context = useContext(TrackerContext);
  if (!context) {
    throw new Error('useTracker must be used within a TrackerProvider');
  }
  return context;
}

