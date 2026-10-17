#define STRINGIFY(x) #x
#include <WiFi.h>
#include <HTTPClient.h>
#include "secrets.h"

#ifndef STRINGIFY
#define STRINGIFY(x) #x
#endif

const char* server = "http://" SERVER_IP ":" STRINGIFY(SERVER_PORT) "/api/devices/heartbeat";

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("WiFi conectado");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(server);
    http.addHeader("X-Device-Key", DEVICE_KEY);
    int code = http.POST("");
    Serial.println(code);
    http.end();
  }
  delay(20000);
}
