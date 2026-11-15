/*
 * NAVIC-TRACK ESP32 USB Serial Bridge
 * Zero Wi-Fi Required - Connects Arduino Uno to Website over USB Cable!
 *
 * Pin Connections:
 *   ESP32 GPIO 16 (ESP_RX) <- Arduino Pin 3 (TX)
 *   ESP32 GPIO 17 (ESP_TX) -> Arduino Pin 2 (RX)
 *   ESP32 GND              <-> Arduino GND
 */

#define ESP_RX 16
#define ESP_TX 17

void setup() {
  // USB Serial to Computer (Website connects here at 115200 baud)
  Serial.begin(115200);

  // HardwareSerial to Arduino Uno
  Serial2.begin(9600, SERIAL_8N1, ESP_RX, ESP_TX);

  Serial.println("NAVIC-TRACK ESP32 READY");
  Serial.println("STATUS:0.0,0.0,0");
}

void loop() {
  // 1. Read commands from PC USB (Website) -> forward to Arduino
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command.length() > 0) {
      Serial2.println(command);
    }
  }

  // 2. Read live status telemetry from Arduino -> forward to PC USB (Website)
  while (Serial2.available()) {
    Serial.write(Serial2.read());
  }
}
