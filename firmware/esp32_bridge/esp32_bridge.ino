/*
 * NAVIC-TRACK ESP32 Wi-Fi to Arduino Serial Bridge
 * 
 * Hardware Connections:
 *   - ESP32-WROOM-32 DevKit
 *   - HardwareSerial 2 (UART2) connected to Arduino Uno:
 *       ESP32 TX2 (GPIO 17) ---> Arduino Uno Pin 2 (RX)
 *       ESP32 RX2 (GPIO 16) <--- Arduino Uno Pin 3 (TX) [via 1k resistor or 3.3V divider]
 *       ESP32 GND           <---> Arduino Uno GND (Common ground required!)
 * 
 * Functions:
 *   - Connects to Wi-Fi (or starts AP mode if Wi-Fi unavailable)
 *   - Listens for REST commands from NAVIC-TRACK web interface
 *   - Communicates with Arduino Uno at 9600 Baud
 *   - Reads live real-time antenna angles from Arduino Uno
 *   - Serves live status to website (/api/v1/status)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// --- WI-FI CONFIGURATION (Enter your Wi-Fi details here) ---
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";

// --- AUTHENTICATION TOKEN (Must match website token) ---
const char* AUTH_TOKEN = "navic-secret-token-123";

// --- HARDWARE SERIAL TO ARDUINO UNO ---
HardwareSerial ArduinoSerial(2); // UART2: RX2=GPIO16, TX2=GPIO17
const int PIN_RX2 = 16;
const int PIN_TX2 = 17;

WebServer server(80);

// Tracker State (Synchronized continuously from Arduino Uno)
float currentAzimuth = 0.0;
float currentElevation = 0.0;
float targetAzimuth = 0.0;
float targetElevation = 0.0;
float minElevationMask = 10.0;
bool isTracking = false;
bool isMoving = false;
unsigned long lastArduinoPacketTime = 0;

bool isAuthenticated() {
  if (server.hasHeader("Authorization")) {
    String auth = server.header("Authorization");
    if (auth.startsWith("Bearer ")) {
      String token = auth.substring(7);
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

void handleStatus() {
  bool arduinoLive = (millis() - lastArduinoPacketTime < 3000);
  
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

void handleMove() {
  if (!isAuthenticated()) {
    sendJsonResponse(401, false, "", "Unauthorized: Invalid or missing token");
    return;
  }

  if (!server.hasArg("plain")) {
    sendJsonResponse(400, false, "", "Missing request body");
    return;
  }

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, server.arg("plain"));
  if (err) {
    sendJsonResponse(400, false, "", "Invalid JSON");
    return;
  }

  float reqAz = doc["azimuth"] | -1.0;
  float reqEl = doc["elevation"] | -1.0;

  if (reqAz < 0.0 || reqAz > 360.0 || reqEl < 0.0 || reqEl > 90.0) {
    sendJsonResponse(400, false, "", "Angles out of range (Az: 0-360, El: 0-90)");
    return;
  }

  targetAzimuth = reqAz;
  targetElevation = reqEl;

  // Forward command to Arduino Uno
  ArduinoSerial.print("GOTO,");
  ArduinoSerial.print(reqAz, 2);
  ArduinoSerial.print(",");
  ArduinoSerial.println(reqEl, 2);

  isMoving = true;
  sendJsonResponse(200, true, "{\"state\":\"SLEWING\"}");
}

void handleJog() {
  if (!isAuthenticated()) {
    sendJsonResponse(401, false, "", "Unauthorized");
    return;
  }
  if (!server.hasArg("plain")) {
    sendJsonResponse(400, false, "", "Missing body");
    return;
  }

  StaticJsonDocument<128> doc;
  deserializeJson(doc, server.arg("plain"));
  String direction = doc["direction"] | "";

  if (direction == "AZ_CW" || direction == "AZ_CCW" || direction == "EL_CW" || direction == "EL_CCW") {
    ArduinoSerial.println(direction);
    isMoving = true;
    sendJsonResponse(200, true, "{\"message\":\"Jog command sent\"}");
  } else {
    sendJsonResponse(400, false, "", "Invalid direction. Use AZ_CW, AZ_CCW, EL_CW, EL_CCW");
  }
}

void handleStop() {
  if (!isAuthenticated()) {
    sendJsonResponse(401, false, "", "Unauthorized");
    return;
  }
  ArduinoSerial.println("STOP");
  isTracking = false;
  isMoving = false;
  sendJsonResponse(200, true, "{\"state\":\"IDLE\"}");
}

void handleHome() {
  if (!isAuthenticated()) {
    sendJsonResponse(401, false, "", "Unauthorized");
    return;
  }
  ArduinoSerial.println("HOME");
  currentAzimuth = 0.0;
  currentElevation = 0.0;
  targetAzimuth = 0.0;
  targetElevation = 0.0;
  sendJsonResponse(200, true, "{\"message\":\"Homed to zero\"}");
}

void setup() {
  Serial.begin(115200);
  // Arduino SoftwareSerial runs at 9600 Baud
  ArduinoSerial.begin(9600, SERIAL_8N1, PIN_RX2, PIN_TX2);

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to Wi-Fi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected!");
    Serial.print("[Wi-Fi] ESP32 IP Address: http://");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[Wi-Fi] Connection failed. Starting Access Point mode...");
    WiFi.softAP("NAVIC-TRACK-AP", "navic123");
    Serial.print("[Wi-Fi] Access Point IP: http://");
    Serial.println(WiFi.softAPIP());
  }

  // Setup REST Endpoints matching NAVIC-TRACK API
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

  // Handle CORS preflight OPTIONS requests
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
  Serial.println("[HTTP] Server ready on port 80");
}

void loop() {
  server.handleClient();

  // Read telemetry lines from Arduino Uno (SoftwareSerial 9600 Baud)
  while (ArduinoSerial.available() > 0) {
    String line = ArduinoSerial.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) {
      Serial.println("[Arduino] " + line);
      
      // Parse STATUS:<az>,<el>,<isMoving>
      if (line.startsWith("STATUS:")) {
        lastArduinoPacketTime = millis();
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
  }
}
