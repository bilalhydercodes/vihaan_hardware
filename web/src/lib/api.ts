import {
  ApiResponse,
  TrackerStatus,
  TrackerConfig,
  SelectSatelliteRequest,
  TleData,
  SetTleRequest,
  TrackControlRequest,
  ManualMoveRequest,
  HomeRequest,
  TimeSyncRequest,
  TimeSyncResponse,
  TelemetryLogEntry,
  SatelliteInfo,
  SatellitePass
} from '@shared/types/tracker';
import { setCachedSatelliteName } from './decoder';

const BASE_URL = process.env.NEXT_PUBLIC_TRACKER_URL || 'http://localhost:8080';

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('navic_auth_token');
}

export function setStoredAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('navic_auth_token', token.trim());
}

export function clearStoredAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('navic_auth_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const token = getStoredAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  const body: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    error: `HTTP Error ${res.status}: ${res.statusText}`,
    timestamp: new Date().toISOString()
  }));

  if (!res.ok || !body.success) {
    throw new Error(body.error || `HTTP ${res.status}: ${res.statusText}`);
  }

  return body.data as T;
}

export const trackerApi = {
  // Status
  async getStatus(): Promise<TrackerStatus> {
    const status = await request<TrackerStatus>('/api/v1/status');
    if (status.satelliteName) {
      setCachedSatelliteName(status.satelliteName);
    }
    return status;
  },

  // Config
  async getConfig(): Promise<TrackerConfig> {
    return request<TrackerConfig>('/api/v1/config');
  },

  async updateConfig(config: Partial<TrackerConfig>): Promise<TrackerConfig> {
    return request<TrackerConfig>('/api/v1/config', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  },

  // Satellite Selection
  async selectSatellite(payload: SelectSatelliteRequest): Promise<{ satelliteName: string; noradId: number }> {
    const res = await request<{ satelliteName: string; noradId: number }>('/api/v1/satellite', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setCachedSatelliteName(res.satelliteName);
    return res;
  },

  // TLE
  async getTle(): Promise<TleData> {
    return request<TleData>('/api/v1/tle');
  },

  async setTle(payload: SetTleRequest): Promise<TleData> {
    return request<TleData>('/api/v1/tle', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Tracking
  async setTracking(action: TrackControlRequest['action']): Promise<{ state: string }> {
    return request<{ state: string }>('/api/v1/track', {
      method: 'POST',
      body: JSON.stringify({ action })
    });
  },

  // Manual Move
  async move(payload: ManualMoveRequest): Promise<{ state: string }> {
    return request<{ state: string }>('/api/v1/move', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Homing
  async home(axis: HomeRequest['axis'] = 'ALL'): Promise<{ message: string; state: string }> {
    return request<{ message: string; state: string }>('/api/v1/home', {
      method: 'POST',
      body: JSON.stringify({ axis })
    });
  },

  // Time Sync
  async syncTime(payload: TimeSyncRequest): Promise<TimeSyncResponse> {
    return request<TimeSyncResponse>('/api/v1/time', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Logs
  async getLogs(limit = 50, since?: string): Promise<TelemetryLogEntry[]> {
    const query = new URLSearchParams({ limit: limit.toString() });
    if (since) query.append('since', since);
    return request<TelemetryLogEntry[]>(`/api/v1/logs?${query.toString()}`);
  },

  // Helpers
  async getSatellites(): Promise<SatelliteInfo[]> {
    return request<SatelliteInfo[]>('/api/v1/satellites');
  },

  async getPrediction(): Promise<SatellitePass | null> {
    return request<SatellitePass | null>('/api/v1/prediction');
  }
};

