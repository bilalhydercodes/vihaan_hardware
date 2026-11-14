/*
 * NAVIC-TRACK Dual-Axis Satellite Antenna Rotator
 * Arduino Uno Firmware with Live Telemetry & ESP32 Bridge
 * 
 * Hardware Connections:
 *   - Arduino Uno R3
 *   - ESP32 Wi-Fi Bridge connected via SoftwareSerial (Pins 2, 3):
 *       Arduino Pin 2 (RX) <--- ESP32 TX2 (GPIO 17)
 *       Arduino Pin 3 (TX) ---> ESP32 RX2 (GPIO 16) [use 1k resistor or 3.3V divider]
 *       Arduino GND        <---> ESP32 GND (Common ground required!)
 *   - 2x 28BYJ-48 5V Stepper Motors (1:64 reduction gearbox)
 *   - 2x ULN2003 Driver Boards:
 *       AZIMUTH Motor:   IN1 -> Pin 8,  IN2 -> Pin 9,  IN3 -> Pin 10, IN4 -> Pin 11
 *       ELEVATION Motor: IN1 -> Pin 4,  IN2 -> Pin 5,  IN3 -> Pin 6,  IN4 -> Pin 7
 *   - External 5V 2A power supply connected to ULN2003 VCC/GND.
 * 
 * Supported Commands (from ESP32 Wi-Fi or USB Serial):
 *   1. GOTO,<az>,<el>  -> Drive antenna to exact angles in degrees (e.g. "GOTO,145.50,38.20")
 *   2. AZ_CW           -> Jog Azimuth clockwise (+128 half-steps ~= 3.2°)
 *   3. AZ_CCW          -> Jog Azimuth counter-clockwise (-128 half-steps)
 *   4. EL_CW           -> Jog Elevation clockwise (+128 half-steps ~= 3.2°)
 *   5. EL_CCW          -> Jog Elevation counter-clockwise (-128 half-steps)
 *   6. STOP            -> Immediately halt all movement and release motor coils
 *   7. HOME            -> Calibrate/zero current position to 0.0° Azimuth and 0.0° Elevation
 *   8. STATUS          -> Query current position
 * 
 * Live Telemetry Output (streamed every 250ms to both Serial and espSerial):
 *   STATUS:<current_azimuth>,<current_elevation>,<is_moving>
 *   Example: "STATUS:145.50,38.20,0"
 */

#include <SoftwareSerial.h>

// ESP32 Communication Port (9600 Baud)
SoftwareSerial espSerial(2, 3); // RX = Pin 2, TX = Pin 3

// AZIMUTH motor pins (ULN2003)
const int AZ_PINS[4] = {8, 9, 10, 11};

// ELEVATION motor pins (ULN2003)
const int EL_PINS[4] = {4, 5, 6, 7};

// 28BYJ-48 8-step half-step excitation sequence (maximum holding torque)
const int sequence[8][4] = {
  {1, 0, 0, 0},
  {1, 1, 0, 0},
  {0, 1, 0, 0},
  {0, 1, 1, 0},
  {0, 0, 1, 0},
  {0, 0, 1, 1},
  {0, 0, 0, 1},
  {1, 0, 0, 1}
};

// Gearbox & reduction calibration
// 28BYJ-48 internal ~63.684:1 + 3.57:1 external gear reduction
// ~40.25 half-steps per degree Azimuth, ~40.43 half-steps per degree Elevation
const float STEPS_PER_DEG_AZ = 40.25;
const float STEPS_PER_DEG_EL = 40.43;

// Mechanical Safety Limits
const float MIN_AZ_DEG = 0.0;
const float MAX_AZ_DEG = 360.0;
const float MIN_EL_DEG = 0.0;
const float MAX_EL_DEG = 90.0;

// Step interval in microseconds (~2200us = ~450 half-steps/sec = ~3.5 deg/sec safe slewing)
const unsigned long STEP_INTERVAL_MICROS = 2200;

// Current and Target positions in half-steps
long currentStepAz = 0;
long currentStepEl = 0;
long targetStepAz = 0;
long targetStepEl = 0;

int indexAz = 0;
int indexEl = 0;

unsigned long lastStepTimeAz = 0;
unsigned long lastStepTimeEl = 0;
unsigned long lastTelemetryTime = 0;

bool isMovingAz = false;
bool isMovingEl = false;

// Command input buffers
String serialBuffer = "";
String espBuffer = "";

// Turn off motor coils to prevent ULN2003 and motor heating when stationary
void releaseMotor(const int pins[]) {
  for (int i = 0; i < 4; i++) {
    digitalWrite(pins[i], LOW);
  }
}

// Apply half-step state to motor pins
void applyStep(const int pins[], int seqIndex) {
  for (int i = 0; i < 4; i++) {
    digitalWrite(pins[i], sequence[seqIndex][i]);
  }
}

// Convert step counts to angles
float getCurrentAzimuth() {
  return (float)currentStepAz / STEPS_PER_DEG_AZ;
}

float getCurrentElevation() {
  return (float)currentStepEl / STEPS_PER_DEG_EL;
}

// Send telemetry to both USB Serial and ESP32 SoftwareSerial
void sendTelemetry() {
  float az = getCurrentAzimuth();
  float el = getCurrentElevation();
  bool moving = (isMovingAz || isMovingEl);

  String telemetry = "STATUS:";
  telemetry += String(az, 2);
  telemetry += ",";
  telemetry += String(el, 2);
  telemetry += ",";
  telemetry += String(moving ? 1 : 0);

  Serial.println(telemetry);
  espSerial.println(telemetry);
}

// Process commands received from either Serial port
void processCommand(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;

  Serial.print("Received Command: ");
  Serial.println(cmd);

  // 1. GOTO Absolute Coordinates: GOTO,<azimuth>,<elevation>
  if (cmd.startsWith("GOTO,") || cmd.startsWith("GOTO ")) {
    char sep = cmd.indexOf(',') != -1 ? ',' : ' ';
    int first = cmd.indexOf(sep);
    int second = cmd.indexOf(sep, first + 1);

    if (first != -1 && second != -1) {
      float reqAz = cmd.substring(first + 1, second).toFloat();
      float reqEl = cmd.substring(second + 1).toFloat();

      // Clamp to physical antenna limits
      reqAz = constrain(reqAz, MIN_AZ_DEG, MAX_AZ_DEG);
      reqEl = constrain(reqEl, MIN_EL_DEG, MAX_EL_DEG);

      targetStepAz = (long)(reqAz * STEPS_PER_DEG_AZ);
      targetStepEl = (long)(reqEl * STEPS_PER_DEG_EL);

      isMovingAz = (targetStepAz != currentStepAz);
      isMovingEl = (targetStepEl != currentStepEl);

      Serial.print("GOTO Target Set: Az=");
      Serial.print(reqAz);
      Serial.print("°, El=");
      Serial.println(reqEl);
      espSerial.println("OK,GOTO_ACCEPTED");
      sendTelemetry();
    } else {
      Serial.println("ERR: Invalid GOTO format. Use GOTO,<az>,<el>");
      espSerial.println("ERR: INVALID_GOTO_SYNTAX");
    }
  }
  // 2. Manual Jog: Azimuth Clockwise
  else if (cmd == "AZ_CW") {
    targetStepAz += 128; // ~3.2 degrees
    if (targetStepAz > (long)(MAX_AZ_DEG * STEPS_PER_DEG_AZ)) {
      targetStepAz = (long)(MAX_AZ_DEG * STEPS_PER_DEG_AZ);
    }
    isMovingAz = true;
    Serial.println("Azimuth Jog CW (+128 steps)");
    espSerial.println("OK,AZ_CW");
  }
  // 3. Manual Jog: Azimuth Counter-Clockwise
  else if (cmd == "AZ_CCW") {
    targetStepAz -= 128;
    if (targetStepAz < (long)(MIN_AZ_DEG * STEPS_PER_DEG_AZ)) {
      targetStepAz = (long)(MIN_AZ_DEG * STEPS_PER_DEG_AZ);
    }
    isMovingAz = true;
    Serial.println("Azimuth Jog CCW (-128 steps)");
    espSerial.println("OK,AZ_CCW");
  }
  // 4. Manual Jog: Elevation Clockwise (Up)
  else if (cmd == "EL_CW") {
    targetStepEl += 128; // ~3.2 degrees
    if (targetStepEl > (long)(MAX_EL_DEG * STEPS_PER_DEG_EL)) {
      targetStepEl = (long)(MAX_EL_DEG * STEPS_PER_DEG_EL);
    }
    isMovingEl = true;
    Serial.println("Elevation Jog CW (+128 steps)");
    espSerial.println("OK,EL_CW");
  }
  // 5. Manual Jog: Elevation Counter-Clockwise (Down)
  else if (cmd == "EL_CCW") {
    targetStepEl -= 128;
    if (targetStepEl < (long)(MIN_EL_DEG * STEPS_PER_DEG_EL)) {
      targetStepEl = (long)(MIN_EL_DEG * STEPS_PER_DEG_EL);
    }
    isMovingEl = true;
    Serial.println("Elevation Jog CCW (-128 steps)");
    espSerial.println("OK,EL_CCW");
  }
  // 6. Stop all motor motion immediately
  else if (cmd == "STOP") {
    targetStepAz = currentStepAz;
    targetStepEl = currentStepEl;
    isMovingAz = false;
    isMovingEl = false;
    releaseMotor(AZ_PINS);
    releaseMotor(EL_PINS);
    Serial.println("Both motors stopped and released");
    espSerial.println("OK,STOPPED");
    sendTelemetry();
  }
  // 7. Calibrate current position to Home (0°, 0°)
  else if (cmd == "HOME") {
    currentStepAz = 0;
    currentStepEl = 0;
    targetStepAz = 0;
    targetStepEl = 0;
    isMovingAz = false;
    isMovingEl = false;
    releaseMotor(AZ_PINS);
    releaseMotor(EL_PINS);
    Serial.println("Position re-centered to 0° Home");
    espSerial.println("OK,HOMED");
    sendTelemetry();
  }
  // 8. Query immediate status
  else if (cmd == "STATUS") {
    sendTelemetry();
  }
  else {
    Serial.println("Unknown command: " + cmd);
    espSerial.println("ERR: UNKNOWN_CMD");
  }
}

void setup() {
  // Initialize USB serial for debugging
  Serial.begin(9600);

  // Initialize SoftwareSerial connection to ESP32
  espSerial.begin(9600);

  // Configure ULN2003 control pins as outputs
  for (int i = 0; i < 4; i++) {
    pinMode(AZ_PINS[i], OUTPUT);
    pinMode(EL_PINS[i], OUTPUT);
  }

  // De-energize coils at startup
  releaseMotor(AZ_PINS);
  releaseMotor(EL_PINS);

  Serial.println(F("========================================"));
  Serial.println(F(" NAVIC-TRACK DUAL-AXIS ROTATOR READY   "));
  Serial.println(F(" SoftwareSerial ESP32 Bridge: 9600 Baud "));
  Serial.println(F(" Waiting for commands...                "));
  Serial.println(F("========================================"));
  espSerial.println(F("OK,ARDUINO_READY"));
}

void loop() {
  // 1. Read commands from USB Serial
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (serialBuffer.length() > 0) {
        processCommand(serialBuffer);
        serialBuffer = "";
      }
    } else {
      if (serialBuffer.length() < 64) serialBuffer += c;
    }
  }

  // 2. Read commands from ESP32 SoftwareSerial
  while (espSerial.available() > 0) {
    char c = (char)espSerial.read();
    if (c == '\n' || c == '\r') {
      if (espBuffer.length() > 0) {
        processCommand(espBuffer);
        espBuffer = "";
      }
    } else {
      if (espBuffer.length() < 64) espBuffer += c;
    }
  }

  unsigned long nowMicros = micros();

  // 3. Non-blocking Azimuth Stepping
  if (isMovingAz && (nowMicros - lastStepTimeAz >= STEP_INTERVAL_MICROS)) {
    lastStepTimeAz = nowMicros;
    if (currentStepAz < targetStepAz) {
      indexAz = (indexAz + 1) % 8;
      currentStepAz++;
      applyStep(AZ_PINS, indexAz);
    } else if (currentStepAz > targetStepAz) {
      indexAz = (indexAz + 7) % 8;
      currentStepAz--;
      applyStep(AZ_PINS, indexAz);
    } else {
      isMovingAz = false;
      releaseMotor(AZ_PINS); // Cool down coil
      sendTelemetry();
    }
  }

  // 4. Non-blocking Elevation Stepping
  if (isMovingEl && (nowMicros - lastStepTimeEl >= STEP_INTERVAL_MICROS)) {
    lastStepTimeEl = nowMicros;
    if (currentStepEl < targetStepEl) {
      indexEl = (indexEl + 1) % 8;
      currentStepEl++;
      applyStep(EL_PINS, indexEl);
    } else if (currentStepEl > targetStepEl) {
      indexEl = (indexEl + 7) % 8;
      currentStepEl--;
      applyStep(EL_PINS, indexEl);
    } else {
      isMovingEl = false;
      releaseMotor(EL_PINS); // Cool down coil
      sendTelemetry();
    }
  }

  // 5. Periodic live telemetry stream (every 250ms)
  unsigned long nowMillis = millis();
  if (nowMillis - lastTelemetryTime >= 250) {
    lastTelemetryTime = nowMillis;
    sendTelemetry();
  }
}
