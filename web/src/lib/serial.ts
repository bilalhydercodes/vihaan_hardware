/**
 * Web Serial API Driver for Direct USB Connection to Arduino Uno & ESP32
 * Allows the browser on localhost to control the antenna rotator with 0 network latency.
 */

export interface SerialTelemetry {
  azimuth: number;
  elevation: number;
  isMoving: boolean;
  raw: string;
}

type TelemetryCallback = (data: SerialTelemetry) => void;
type StatusCallback = (connected: boolean, portInfo?: string) => void;

class WebSerialManager {
  private port: any = null;
  private reader: any = null;
  private writer: any = null;
  private readableStreamClosed: any = null;
  private writableStreamClosed: any = null;
  private keepReading = false;
  private onTelemetryCallbacks: Set<TelemetryCallback> = new Set();
  private onStatusCallbacks: Set<StatusCallback> = new Set();

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public isConnected(): boolean {
    return this.port !== null && this.port.readable !== null;
  }

  public onTelemetry(cb: TelemetryCallback): () => void {
    this.onTelemetryCallbacks.add(cb);
    return () => this.onTelemetryCallbacks.delete(cb);
  }

  public onStatus(cb: StatusCallback): () => void {
    this.onStatusCallbacks.add(cb);
    return () => this.onStatusCallbacks.delete(cb);
  }

  private notifyStatus(connected: boolean, info?: string) {
    this.onStatusCallbacks.forEach(cb => cb(connected, info));
  }

  private notifyTelemetry(telemetry: SerialTelemetry) {
    this.onTelemetryCallbacks.forEach(cb => cb(telemetry));
  }

  public async connect(baudRate = 9600): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
    }

    try {
      // Prompt user to pick their USB Serial port (Arduino Uno or ESP32)
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate });

      this.keepReading = true;

      // Setup write stream
      const textEncoder = new TextEncoderStream();
      this.writableStreamClosed = textEncoder.readable.pipeTo(this.port.writable);
      this.writer = textEncoder.writable.getWriter();

      // Notify connection
      const info = this.port.getInfo?.();
      const portDesc = info?.usbVendorId ? `USB Device (VID: 0x${info.usbVendorId.toString(16)})` : 'USB Serial';
      this.notifyStatus(true, portDesc);

      // Start read loop
      this.startReadLoop();
      return true;
    } catch (err: any) {
      this.disconnect();
      if (err.name === 'NotFoundError') {
        // User cancelled port picker dialog
        return false;
      }
      throw err;
    }
  }

  private async startReadLoop() {
    let lineBuffer = '';
    while (this.port && this.port.readable && this.keepReading) {
      const textDecoder = new TextDecoderStream();
      this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
      this.reader = textDecoder.readable.getReader();

      try {
        while (this.keepReading) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) {
            lineBuffer += value;
            const lines = lineBuffer.split(/\r?\n/);
            lineBuffer = lines.pop() || '';

            for (const line of lines) {
              this.parseLine(line.trim());
            }
          }
        }
      } catch (e) {
        // Port read error or disconnected
      } finally {
        try {
          this.reader.releaseLock();
        } catch {}
      }
    }
    this.disconnect();
  }

  public async autoConnect(baudRate = 115200): Promise<boolean> {
    if (!this.isSupported() || this.isConnected()) return false;
    try {
      const ports = await (navigator as any).serial.getPorts();
      if (ports.length > 0) {
        this.port = ports[0];
        await this.port.open({ baudRate });
        this.keepReading = true;
        const textEncoder = new TextEncoderStream();
        this.writableStreamClosed = textEncoder.readable.pipeTo(this.port.writable);
        this.writer = textEncoder.writable.getWriter();
        this.notifyStatus(true, 'USB Serial Auto-Connected');
        this.startReadLoop();
        return true;
      }
    } catch {}
    return false;
  }

  private parseLine(line: string) {
    if (!line) return;

    // Expected format: STATUS:<azimuth>,<elevation>,<isMoving>
    if (line.startsWith('STATUS:')) {
      const parts = line.substring(7).split(',');
      if (parts.length >= 2) {
        const az = parseFloat(parts[0]);
        const el = parseFloat(parts[1]);
        const moving = parts.length >= 3 ? parts[2] === '1' : false;
        if (!isNaN(az) && !isNaN(el)) {
          this.notifyTelemetry({
            azimuth: az,
            elevation: el,
            isMoving: moving,
            raw: line
          });
        }
      }
    } else if (line.includes('NAVIC-TRACK') || line.includes('READY')) {
      this.notifyTelemetry({ azimuth: 0, elevation: 0, isMoving: false, raw: line });
    } else if (line.includes('GOTO')) {
      this.notifyTelemetry({ azimuth: 0, elevation: 0, isMoving: true, raw: line });
    }
  }

  public async sendCommand(cmd: string): Promise<boolean> {
    if (!this.writer) return false;
    try {
      await this.writer.write(cmd.trim() + '\n');
      return true;
    } catch {
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    this.keepReading = false;
    try {
      if (this.reader) {
        await this.reader.cancel();
        await this.readableStreamClosed.catch(() => {});
        this.reader = null;
      }
      if (this.writer) {
        await this.writer.close();
        await this.writableStreamClosed.catch(() => {});
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch {}
    this.notifyStatus(false);
  }
}

export const webSerial = new WebSerialManager();

