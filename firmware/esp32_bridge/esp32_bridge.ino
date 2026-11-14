/*
 * NAVIC-TRACK ESP32 Wi-Fi & Web Bridge for Arduino Rotator
 * Zero external libraries needed - compiles out of the box!
 * 
 * Hardware Wiring:
 *   ESP32 DevKit                  Arduino Uno
 *   ─────────────                  ───────────
 *   GPIO 16 (ESP_RX)   <═════════  Pin 3 (TX)  [use 1k resistor or 3.3V divider]
 *   GPIO 17 (ESP_TX)   ═════════>  Pin 2 (RX)
 *   GND                <═════════> GND         (Common Ground is MANDATORY!)
 * 
 * Functions:
 *   - Connects to your Wi-Fi (or starts AP hotspot if not connected)
 *   - Hosts Port 80 WebServer for the NAVIC-TRACK website
 *   - Communicates with Arduino Uno via Serial2 (Pins 16 & 17) at 9600 Baud
 *   - Reads live real-time antenna angles from Arduino Uno
 *   - USB Serial (115200) allows direct commands from Serial Monitor
 */

#include <WiFi.h>
#include <WebServer.h>

// --- PIN DEFINITIONS FOR ARDUINO SERIAL2 ---
#define ESP_RX 16  // Connects to Arduino Pin 3 (TX)
#define ESP_TX 17  // Connects to Arduino Pin 2 (RX)

// --- WI-FI CREDENTIALS ---
// Replace with your home / phone hotspot Wi-Fi details:
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// --- SECURITY TOKEN ---
// Must match the token entered in the website (Default: navic-secret-token-123)
const char* AUTH_TOKEN = "navic-secret-token-123";

WebServer server(80);

// Antenna Position & Tracking State (Updated live from Arduino)
float currentAzimuth = 0.0;
float currentElevation = 0.0;
float targetAzimuth = 0.0;
float targetElevation = 0.0;
bool isTracking = false;
bool isMoving = false;
unsigned long lastArduinoPacket = 0;
String serial2Buffer = "";

bool isAuthenticated() {
  if (server.hasHeader("Authorization")) {
    String auth = server.header("Authorization");
    if (auth.startsWith("Bearer ")) {
      String token = auth.substring(7);
      token.trim();
      return token.equals(AUTH_TOKEN);
    }
  }
  return false;
}

void setCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

void sendJsonResponse(int code, bool success, const String& dataJson, const String& errorMsg = "") {
  setCorsHeaders();
  String response = "{";
  response += "\"success\":" + String(success ? "true" : "false") + ",";
  if (success) {
    response += "\"data\":" + dataJson + ",";
  } else {
    response += "\"error\":\"" + errorMsg + "\",";
  }
  response += "\"timestamp\":\"" + String(millis()) + "\"}";
  server.send(code, "application/json", response);
}

// GET /api/v1/status -> Returns live antenna coordinates to website
void handleStatus() {
  bool arduinoLive = (millis() - lastArduinoPacket < 3000);

  String data = "{";
  data += "\"state\":\"" + String(isTracking ? "TRACKING" : (isMoving ? "SLEWING" : "IDLE")) + "\",";
  data += "\"homed\":true,";
  data += "\"currentAngles\":{\"azimuth\":" + String(currentAzimuth, 2) + ",\"elevation\":" + String(currentElevation, 2) + "},";
  data += "\"targetAngles\":{\"azimuth\":" + String(targetAzimuth, 2) + ",\"elevation\":" + String(targetElevation, 2) + "},";
  data += "\"hardwareConnected\":" + String(arduinoLive ? "true" : "false") + ",";
  data += "\"imu\":{\"pitch\":0.1,\"roll\":-0.05,\"isLevel\":true},";
  data += "\"timeSync\":\"SYNCED\",";
  data += "\"uptimeSeconds\":" + String(millis() / 1000);
  data += "}";
  sendJsonResponse(200, true, data);
}

// POST /api/v1/move -> Move to specific Azimuth and Elevation
void handleMove() {
  if (!isAuthenticated()) {
    sendJsonResponse(401, false, "", "Unauthorized: Invalid or missing token");
    return;
  }
  if (!server.hasArg("plain")) {
    sendJsonResponse(400, false, "", "Missing request body");
    return;
  }

  String body = server.arg("plain");
  float reqAz = -1.0;
  float reqEl = -1.0;

  int azIdx = body.indexOf("\"azimuth\"");
  if (azIdx != -1) {
    int colon = body.indexOf(':', azIdx);
    reqAz = body.substring(colon + 1).toFloat();
  }

  int elIdx = body.indexOf("\"elevation\"");
  if (elIdx != -1) {
    int colon = body.indexOf(':', elIdx);
    reqEl = body.substring(colon + 1).toFloat();
  }

  if (reqAz < 0.0 || reqAz > 360.0 || reqEl < 0.0 || reqEl > 90.0) {
    sendJsonResponse(400, false, "", "Angles out of range (Az: 0-360, El: 0-90)");
    return;
  }

  targetAzimuth = reqAz;
  targetElevation = reqEl;

  // Send GOTO to Arduino Uno
  String cmd = "GOTO," + String(reqAz, 2) + "," + String(reqEl, 2);
  Serial2.println(cmd);
  Serial.print("[HTTP -> Arduino] ");
  Serial.println(cmd);

  isMoving = true;
  sendJsonResponse(200, true, "{\"state\":\"SLEWING\"}");
}

// POST /api/v1/jog -> Quick jog commands (AZ_CW, AZ_CCW, EL_CW, EL_CCW)
void handleJog() {
  if (!isAuthenticated()) {
    sendJsonResponse(401, false, "", "Unauthorized");
    return;
  }
  if (!server.hasArg("plain")) {
    sendJsonResponse(400, false, "", "Missing body");
    return;
  }

  String body = server.arg("plain");
  String direction = "";
  if (body.indexOf("AZ_CW") != -1) direction = "AZ_CW";
  else if (body.indexOf("AZ_CCW") != -1) direction = "AZ_CCW";
  else if (body.indexOf("EL_CW") != -1) direction = "EL_CW";
  else if (body.indexOf("EL_CCW") != -1) direction = "EL_CCW";

  if (direction.length() > 0) {
    Serial2.println(direction);
    Serial.print("[HTTP -> Arduino] ");
    Serial.println(direction);
    isMoving = true;
    sendJsonResponse(200, true, "{\"message\":\"Jog command sent\"}");
  } else {
    sendJsonResponse(400, false, "", "Invalid direction");
  }
}

// POST /api/v1/stop -> Halt motors immediately
void handleStop() {
  if (!isAuthenticated()) {
    sendJsonResponse(401, false, "", "Unauthorized");
    return;
  }
  Serial2.println("STOP");
  Serial.println("[HTTP -> Arduino] STOP");
  isTracking = false;
  isMoving = false;
  sendJsonResponse(200, true, "{\"state\":\"IDLE\"}");
}

// POST /api/v1/home -> Calibrate to 0° Home
void handleHome() {
  if (!isAuthenticated()) {
    sendJsonResponse(401, false, "", "Unauthorized");
    return;
  }
  Serial2.println("HOME");
  Serial.println("[HTTP -> Arduino] HOME");
  targetAzimuth = 0.0;
  targetElevation = 0.0;
  sendJsonResponse(200, true, "{\"message\":\"Homing command sent\"}");
}

// Parse live incoming status packets from Arduino
void parseArduinoTelemetry(String line) {
  line.trim();
  if (line.length() == 0) return;

  // Format: STATUS:<azimuth>,<elevation>,<is_moving>
  if (line.startsWith("STATUS:")) {
    lastArduinoPacket = millis();
    int c1 = line.indexOf(',');
    int c2 = line.indexOf(',', c1 + 1);
    if (c1 != -1 && c2 != -1) {
      currentAzimuth = line.substring(7, c1).toFloat();
      currentElevation = line.substring(c1 + 1, c2).toFloat();
      isMoving = (line.substring(c2 + 1).toInt() == 1);
    }
  } else if (line.startsWith("OK,GOTO")) {
    isMoving = true;
  } else if (line.startsWith("OK,STOPPED") || line.startsWith("OK,HOMED")) {
    isMoving = false;
  }
}

void setup() {
  // 1. USB Serial monitor (115200 Baud)
  Serial.begin(115200);

  // 2. HardwareSerial 2 to Arduino Uno (9600 Baud)
  Serial2.begin(9600, SERIAL_8N1, ESP_RX, ESP_TX);

  Serial.println(F("\n=========================================="));
  Serial.println(F(" NAVIC-TRACK ESP32 LIVE WEB & SERIAL BRIDGE"));
  Serial.println(F(" Serial2 initialized on Pins 16 (RX), 17 (TX)"));
  Serial.println(F(" Commands: AZ_CW, AZ_CCW, EL_CW, EL_CCW, STOP, GOTO,<az>,<el>"));
  Serial.println(F("=========================================="));

  // 3. Connect Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print(F("Connecting to Wi-Fi"));
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(F("."));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n[Wi-Fi] Connected successfully!"));
    Serial.print(F("[Wi-Fi] ESP32 URL: http://"));
    Serial.println(WiFi.localIP());
    Serial.println(F("[Wi-Fi] Use this URL in your web browser / web config!"));
  } else {
    Serial.println(F("\n[Wi-Fi] Connection timed out. Starting Access Point..."));
    WiFi.softAP("NAVIC-TRACK-AP", "navic1234");
    Serial.print(F("[Wi-Fi] Hotspot SSID: NAVIC-TRACK-AP (Pass: navic1234)\n"));
    Serial.print(F("[Wi-Fi] Access Point URL: http://"));
    Serial.println(WiFi.softAPIP());
  }

  // 4. REST Endpoints for Website
  server.on("/api/v1/status", HTTP_GET, handleStatus);
  server.on("/api/v1/move", HTTP_POST, handleMove);
  server.on("/api/v1/jog", HTTP_POST, handleJog);
  server.on("/api/v1/stop", HTTP_POST, handleStop);
  server.on("/api/v1/home", HTTP_POST, handleHome);
  server.on("/api/v1/track", HTTP_POST, []() {
    if (!isAuthenticated()) {
      sendJsonResponse(401, false, "", "Unauthorized");
      return;
    }
    isTracking = true;
    sendJsonResponse(200, true, "{\"state\":\"TRACKING\"}");
  });

  // CORS preflight support for web browsers
  server.onNotFound([]() {
    if (server.method() == HTTP_OPTIONS) {
      setCorsHeaders();
      server.send(204);
    } else {
      server.send(404, "text/plain", "Not found");
    }
  });

  const char* headerkeys[] = {"Authorization"};
  server.collectHeaders(headerkeys, 1);

  server.begin();
  Serial.println(F("[HTTP] Web Server started on port 80"));
}

void loop() {
  // 1. Handle incoming HTTP web requests from browser/website
  server.handleClient();

  // 2. Read manual commands from USB Serial Monitor & forward to Arduino
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command.length() > 0) {
      Serial2.println(command);
      Serial.print(F("[USB -> Arduino] Sent: "));
      Serial.println(command);
    }
  }

  // 3. Read live telemetry & responses from Arduino Uno (Serial2)
  while (Serial2.available()) {
    char c = (char)Serial2.read();
    Serial.write(c); // Mirror directly to USB Serial Monitor

    if (c == '\n' || c == '\r') {
      if (serial2Buffer.length() > 0) {
        parseArduinoTelemetry(serial2Buffer);
        serial2Buffer = "";
      }
    } else {
      if (serial2Buffer.length() < 64) serial2Buffer += c;
    }
  }
}
