/*
 * =========================================================================
 * NAVIC-TRACK ESP32 Complete Dual-Axis Wi-Fi & Discovery Controller
 * Non-Blocking High-Performance Bridge for Left/Right & Up/Down Motors
 *
 * Wi-Fi Network: Bilha
 * Password:     crysta2333
 *
 * Wiring to Arduino Uno:
 *   ESP32 GPIO 16 (RX2) <--- Arduino Uno Pin 3 (SoftwareSerial TX)
 *   ESP32 GPIO 17 (TX2) ---> Arduino Uno Pin 2 (SoftwareSerial RX)
 *   ESP32 GND           <---> Arduino Uno GND
 * =========================================================================
 */

#include <WiFi.h>
#include <WebServer.h>
#include <WiFiUdp.h>

const char* ssid = "Bilha";
const char* password = "crysta2333";

WebServer server(8080);
WiFiUDP udp;
const int UDP_PORT = 8888;

#define ESP_RX2 16
#define ESP_TX2 17

float currentAz = 0.0;
float currentEl = 0.0;
bool isMoving = false;
unsigned long lastBeaconTime = 0;
String serial2Buffer = "";

void handleCors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With,*");
  server.sendHeader("Access-Control-Max-Age", "86400");
}

void handleOptions() {
  handleCors();
  server.send(204);
}

// 1. Status telemetry endpoint
void handleStatus() {
  handleCors();
  String json = "{\"success\":true,\"data\":{\"state\":\"" + String(isMoving ? "SLEWING" : "IDLE") + "\",\"homed\":true,\"currentAngles\":{\"azimuth\":" + String(currentAz, 1) + ",\"elevation\":" + String(currentEl, 1) + "},\"targetAngles\":{\"azimuth\":" + String(currentAz, 1) + ",\"elevation\":" + String(currentEl, 1) + "},\"satelliteName\":\"NAVIC-1B\",\"noradId\":39635,\"isVisible\":true}}";
  server.send(200, "application/json", json);
}

// 2. Aim / GOTO endpoint (Both Azimuth & Elevation)
void handleMove() {
  handleCors();
  String cmd = "";

  if (server.hasArg("plain")) {
    String body = server.arg("plain");
    body.trim();

    if (body.startsWith("GOTO,")) {
      cmd = body;
    } else if (body.startsWith("{")) {
      float az = currentAz;
      float el = currentEl;
      int azIdx = body.indexOf("\"azimuth\":");
      int elIdx = body.indexOf("\"elevation\":");
      if (azIdx != -1) az = body.substring(azIdx + 10).toFloat();
      if (elIdx != -1) el = body.substring(elIdx + 12).toFloat();
      cmd = "GOTO," + String(az, 1) + "," + String(el, 1);
    } else {
      cmd = body;
    }
  }

  cmd.trim();
  if (cmd.length() > 0) {
    Serial2.println(cmd);
    Serial.print("[MOVE -> Arduino] ");
    Serial.println(cmd);
  }

  server.send(200, "application/json", "{\"success\":true,\"data\":{\"message\":\"Command sent: " + cmd + "\"}}");
}

// 3. Quick Motor Jog: Left / Right & Up / Down
void handleJog() {
  handleCors();
  String cmd = "";

  if (server.hasArg("cmd")) {
    cmd = server.arg("cmd");
  } else if (server.hasArg("plain")) {
    String body = server.arg("plain");
    body.trim();

    if (body.startsWith("{")) {
      if (body.indexOf("TEST_EL") != -1) {
        cmd = "TEST_EL";
      } else if (body.indexOf("ELEVATION") != -1 || body.indexOf("\"EL\"") != -1 || body.indexOf("EL_") != -1) {
        if (body.indexOf("CCW") != -1 || body.indexOf("DOWN") != -1) cmd = "EL_CCW";
        else cmd = "EL_CW";
      } else if (body.indexOf("AZIMUTH") != -1 || body.indexOf("\"AZ\"") != -1 || body.indexOf("AZ_") != -1) {
        if (body.indexOf("CCW") != -1 || body.indexOf("RIGHT") != -1) cmd = "AZ_CCW";
        else cmd = "AZ_CW";
      } else if (body.indexOf("EL_CW") != -1) cmd = "EL_CW";
      else if (body.indexOf("EL_CCW") != -1) cmd = "EL_CCW";
      else if (body.indexOf("AZ_CW") != -1) cmd = "AZ_CW";
      else if (body.indexOf("AZ_CCW") != -1) cmd = "AZ_CCW";
    } else {
      cmd = body;
    }
  }

  cmd.trim();
  cmd.toUpperCase();

  if (cmd.length() > 0) {
    Serial2.println(cmd);
    Serial.print("[JOG -> Arduino] ");
    Serial.println(cmd);
  }

  server.send(200, "application/json", "{\"success\":true,\"data\":{\"message\":\"Jog forwarded: " + cmd + "\"}}");
}

// 4. Emergency Stop
void handleStop() {
  handleCors();
  Serial2.println("STOP");
  Serial.println("[STOP -> Arduino]");
  server.send(200, "application/json", "{\"success\":true,\"data\":{\"state\":\"IDLE\"}}");
}

// 5. Zero / Homing
void handleHome() {
  handleCors();
  Serial2.println("HOME");
  Serial.println("[HOME -> Arduino]");
  currentAz = 0.0;
  currentEl = 0.0;
  server.send(200, "application/json", "{\"success\":true,\"data\":{\"message\":\"Homed\"}}");
}

// 6. Discovery beacon
void sendDiscoveryBeacon() {
  if (WiFi.status() != WL_CONNECTED) return;
  udp.beginPacket(IPAddress(255, 255, 255, 255), UDP_PORT);
  String beacon = "{\"device\":\"NAVIC-TRACK-ESP32\",\"ip\":\"" + WiFi.localIP().toString() + "\",\"port\":8080,\"azimuth\":" + String(currentAz, 1) + ",\"elevation\":" + String(currentEl, 1) + ",\"isMoving\":" + (isMoving ? "true" : "false") + "}";
  udp.print(beacon);
  udp.endPacket();
}

// Non-blocking serial reader from Arduino
void readArduinoSerial() {
  while (Serial2.available() > 0) {
    char c = (char)Serial2.read();
    if (c == '\n' || c == '\r') {
      serial2Buffer.trim();
      if (serial2Buffer.startsWith("STATUS:")) {
        int c1 = serial2Buffer.indexOf(',');
        int c2 = serial2Buffer.indexOf(',', c1 + 1);
        if (c1 != -1 && c2 != -1) {
          currentAz = serial2Buffer.substring(7, c1).toFloat();
          currentEl = serial2Buffer.substring(c1 + 1, c2).toFloat();
          isMoving = serial2Buffer.substring(c2 + 1).toInt() == 1;
        }
      }
      serial2Buffer = "";
    } else {
      if (serial2Buffer.length() < 64) {
        serial2Buffer += c;
      }
    }
  }
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, ESP_RX2, ESP_TX2);
  Serial2.setTimeout(50);

  Serial.println("\n[NAVIC-TRACK] Starting ESP32 Dual-Axis Bridge...");
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected successfully!");
    Serial.print("[Wi-Fi] IP Address: ");
    Serial.println(WiFi.localIP());

    udp.begin(UDP_PORT);
    sendDiscoveryBeacon();
  } else {
    Serial.println("\n[Wi-Fi] Connection timed out. Ensure hotspot 'Bilha' is on.");
  }

  // HTTP Routes
  server.on("/api/v1/status", HTTP_GET, handleStatus);
  server.on("/api/v1/status", HTTP_OPTIONS, handleOptions);
  server.on("/api/v1/move", HTTP_POST, handleMove);
  server.on("/api/v1/move", HTTP_OPTIONS, handleOptions);
  server.on("/api/v1/jog", HTTP_POST, handleJog);
  server.on("/api/v1/jog", HTTP_OPTIONS, handleOptions);
  server.on("/api/v1/stop", HTTP_POST, handleStop);
  server.on("/api/v1/stop", HTTP_OPTIONS, handleOptions);
  server.on("/api/v1/home", HTTP_POST, handleHome);
  server.on("/api/v1/home", HTTP_OPTIONS, handleOptions);

  server.onNotFound([]() {
    if (server.method() == HTTP_OPTIONS) handleOptions();
    else server.send(404, "text/plain", "Not Found");
  });

  server.begin();
  Serial.println("[HTTP] Server ready on port 8080");
}

void loop() {
  // Handle HTTP client requests instantly
  server.handleClient();

  // 1. Non-blocking read from Arduino Uno (RX2 Pin 16)
  readArduinoSerial();

  // 2. Read instant UDP commands from website (non-blocking)
  int packetSize = udp.parsePacket();
  if (packetSize > 0) {
    char buf[128];
    int len = udp.read(buf, sizeof(buf) - 1);
    if (len > 0) {
      buf[len] = '\0';
      String cmd = String(buf);
      cmd.trim();
      if (cmd.length() > 0) {
        Serial2.println(cmd);
        Serial.print("[UDP -> Arduino] ");
        Serial.println(cmd);
      }
    }
  }

  // 3. Discovery beacon every 1 second
  if (millis() - lastBeaconTime >= 1000) {
    lastBeaconTime = millis();
    sendDiscoveryBeacon();
  }
}
