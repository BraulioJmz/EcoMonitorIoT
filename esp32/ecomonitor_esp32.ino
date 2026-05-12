/*
 * ============================================================
 * EcoMonitor IoT — ESP32 Firmware v2.0
 * ============================================================
 *
 * 3 potenciómetros simulan potencia de 3 máquinas industriales.
 * 3 LEDs son controlados remotamente desde el dashboard.
 *
 * Conexiones:
 *   GPIO34 (ADC) ── POT 1 (Máquina CNC A / br01) ── 3.3V / GND
 *   GPIO35 (ADC) ── POT 2 (Compresor B    / br02) ── 3.3V / GND
 *   GPIO32 (ADC) ── POT 3 (Panel Solar C  / br03) ── 3.3V / GND
 *   GPIO25       ── [220Ω] ── LED 1 ── GND
 *   GPIO26       ── [220Ω] ── LED 2 ── GND
 *   GPIO27       ── [220Ω] ── LED 3 ── GND
 *
 * Librerías (instalar desde Arduino Library Manager):
 *   - ArduinoJson  v7+  (Benoit Blanchon)
 *   - WiFi         (incluida con ESP32)
 *   - HTTPClient   (incluida con ESP32)
 *
 * ============================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN — Editar antes de subir al ESP32
// ═══════════════════════════════════════════════════════════════

const char* WIFI_SSID      = "TU_RED_WIFI";
const char* WIFI_PASSWORD  = "TU_CONTRASEÑA_WIFI";

// URL base del dashboard (sin barra final)
// Desarrollo con ngrok: "https://xxxx.ngrok-free.app"
// Vercel:               "https://tu-dashboard.vercel.app"
const char* DASHBOARD_URL  = "https://tu-dashboard.vercel.app";
const char* IOT_SECRET     = "ecomonitor-iot-secret";

// ═══════════════════════════════════════════════════════════════
// PINES
// ═══════════════════════════════════════════════════════════════

const int POT_PINS[3] = { 34, 35, 32 };
const int LED_PINS[3] = { 25, 26, 27 };
const char* BRANCH_IDS[3] = { "br01", "br02", "br03" };
const int NUM_MACHINES = 3;

// ═══════════════════════════════════════════════════════════════
// PARÁMETROS
// ═══════════════════════════════════════════════════════════════

const unsigned long SEND_INTERVAL    = 30000;  // 30 s — envío normal
const unsigned long CONTROL_INTERVAL = 5000;   // 5 s  — polling LEDs
const unsigned long SERIAL_INTERVAL  = 2000;   // 2 s  — log serial

const float MAX_POWER_KW    = 1.0;   // kW máximo por máquina
const float VOLTAGE_SIM     = 120.0; // Voltaje simulado (V)
const float POWER_FACTOR_SIM = 0.92; // Factor de potencia simulado

// ═══════════════════════════════════════════════════════════════
// BUFFER OFFLINE — guarda lecturas cuando no hay WiFi
// ═══════════════════════════════════════════════════════════════

// Capacidad: 48 entradas × 30 s = 24 minutos de datos offline
#define BUFFER_SIZE 48

struct MachineReading {
  float powerKw;
  float currentA;
};

struct BufferEntry {
  MachineReading machines[3]; // Una lectura por máquina
  unsigned long captureMillis; // millis() al momento de captura
  bool valid;
};

BufferEntry offlineBuffer[BUFFER_SIZE];
int bufferHead = 0;  // Próxima posición de escritura
int bufferCount = 0; // Entradas actualmente almacenadas

// ═══════════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ═══════════════════════════════════════════════════════════════

unsigned long lastSendMs    = 0;
unsigned long lastControlMs = 0;
unsigned long lastSerialMs  = 0;

float currentPowerKw[3]  = { 0 };
float currentCurrentA[3] = { 0 };

bool wifiConnected = false;

// ═══════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(800);

  Serial.println("\n╔═══════════════════════════════════════════╗");
  Serial.println("║   EcoMonitor IoT — ESP32 v2.0            ║");
  Serial.println("║   SmartFactory Energy Hub                ║");
  Serial.println("╚═══════════════════════════════════════════╝\n");

  // Inicializar pines LED
  for (int i = 0; i < NUM_MACHINES; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    digitalWrite(LED_PINS[i], LOW);
  }

  // Inicializar buffer
  initBuffer();

  // Test secuencial de LEDs
  Serial.println("🔧 Test LEDs...");
  for (int i = 0; i < NUM_MACHINES; i++) {
    digitalWrite(LED_PINS[i], HIGH);
    delay(200);
    digitalWrite(LED_PINS[i], LOW);
    delay(100);
  }

  // Conectar WiFi
  connectWiFi();

  Serial.println("\n✅ Listo. Intervalo de envío: 30 segundos");
  Serial.printf("📡 Dashboard: %s\n", DASHBOARD_URL);
  Serial.printf("💾 Buffer offline: %d entradas (~%.0f min)\n",
                BUFFER_SIZE, (BUFFER_SIZE * SEND_INTERVAL / 1000.0) / 60.0);
  Serial.println("─────────────────────────────────────────────");
}

// ═══════════════════════════════════════════════════════════════
// LOOP
// ═══════════════════════════════════════════════════════════════

void loop() {
  unsigned long now = millis();

  // Reconectar WiFi si es necesario
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    connectWiFi();
  }

  // Leer sensores (siempre)
  readPotentiometers();

  // Log serial
  if (now - lastSerialMs >= SERIAL_INTERVAL) {
    lastSerialMs = now;
    printStatus();
  }

  // Enviar datos (cada 30 segundos)
  if (now - lastSendMs >= SEND_INTERVAL || lastSendMs == 0) {
    lastSendMs = now;
    handleSendCycle();
  }

  // Polling LEDs (cada 5 segundos, solo si hay WiFi)
  if (wifiConnected && now - lastControlMs >= CONTROL_INTERVAL) {
    lastControlMs = now;
    checkLedControl();
  }

  delay(100);
}

// ═══════════════════════════════════════════════════════════════
// BUFFER CIRCULAR
// ═══════════════════════════════════════════════════════════════

void initBuffer() {
  for (int i = 0; i < BUFFER_SIZE; i++) {
    offlineBuffer[i].valid = false;
  }
  bufferHead  = 0;
  bufferCount = 0;
  Serial.printf("💾 Buffer inicializado: %d slots × 30s = %.0f min offline\n",
                BUFFER_SIZE, (BUFFER_SIZE * 30.0) / 60.0);
}

// Agregar la lectura actual al buffer
void pushToBuffer() {
  int idx = bufferHead % BUFFER_SIZE;
  offlineBuffer[idx].captureMillis = millis();
  for (int i = 0; i < NUM_MACHINES; i++) {
    offlineBuffer[idx].machines[i].powerKw  = currentPowerKw[i];
    offlineBuffer[idx].machines[i].currentA = currentCurrentA[i];
  }
  offlineBuffer[idx].valid = true;

  bufferHead = (bufferHead + 1) % BUFFER_SIZE;

  if (bufferCount < BUFFER_SIZE) {
    bufferCount++;
  }
  // Si bufferCount == BUFFER_SIZE, el buffer está lleno y sobreescribe la más antigua
}

// Enviar y vaciar el buffer completo
bool flushBuffer() {
  if (bufferCount == 0) return true;

  Serial.printf("📦 Vaciando buffer: %d lecturas pendientes...\n", bufferCount);

  unsigned long nowMs  = millis();
  int flushed = 0;
  int failed  = 0;

  // Calcular índice de la entrada más antigua
  int startIdx = (bufferHead - bufferCount + BUFFER_SIZE) % BUFFER_SIZE;

  for (int i = 0; i < bufferCount; i++) {
    int idx = (startIdx + i) % BUFFER_SIZE;
    if (!offlineBuffer[idx].valid) continue;

    // Calcular cuánto hace que se capturó (en segundos)
    unsigned long ageMs = nowMs - offlineBuffer[idx].captureMillis;

    // Construir payload con offset_seconds_ago para que el servidor
    // pueda reconstruir el timestamp histórico
    String payload = buildPayload(
      offlineBuffer[idx].machines,
      (long)(ageMs / 1000)   // segundos en el pasado
    );

    bool ok = postToServer(payload);
    if (ok) {
      offlineBuffer[idx].valid = false;
      flushed++;
      delay(200); // pausa entre peticiones para no saturar
    } else {
      failed++;
      // Mantener las entradas fallidas en el buffer (ya están ahí)
    }
  }

  if (failed == 0) {
    // Todo enviado — resetear buffer
    bufferCount = 0;
    bufferHead  = 0;
    Serial.printf("   ✅ Buffer vaciado: %d lecturas enviadas\n", flushed);
    return true;
  } else {
    // Actualizar conteo (solo quitan las enviadas)
    bufferCount = failed;
    Serial.printf("   ⚠️  Buffer parcial: %d enviadas, %d pendientes\n", flushed, failed);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// CICLO DE ENVÍO
// ═══════════════════════════════════════════════════════════════

void handleSendCycle() {
  if (!wifiConnected) {
    // Sin WiFi → guardar en buffer
    pushToBuffer();
    Serial.printf("📵 Sin WiFi — Guardado en buffer [%d/%d]\n", bufferCount, BUFFER_SIZE);
    return;
  }

  // Primero, vaciar el buffer si hay entradas pendientes
  if (bufferCount > 0) {
    flushBuffer();
  }

  // Luego enviar la lectura actual
  MachineReading current[3];
  for (int i = 0; i < NUM_MACHINES; i++) {
    current[i].powerKw  = currentPowerKw[i];
    current[i].currentA = currentCurrentA[i];
  }

  String payload = buildPayload(current, 0); // 0 = ahora mismo
  bool ok = postToServer(payload);

  if (!ok) {
    // Si falló, guardar en buffer para el próximo ciclo
    pushToBuffer();
    Serial.printf("   ⚠️  Guardado en buffer [%d/%d]\n", bufferCount, BUFFER_SIZE);
  }
}

// ═══════════════════════════════════════════════════════════════
// CONSTRUCCIÓN DEL PAYLOAD JSON
// ═══════════════════════════════════════════════════════════════

String buildPayload(MachineReading readings[3], long secondsAgo) {
  JsonDocument doc;
  doc["seconds_ago"] = secondsAgo; // El servidor usa esto para reconstruir el timestamp

  JsonArray arr = doc["machines"].to<JsonArray>();

  for (int i = 0; i < NUM_MACHINES; i++) {
    JsonObject m = arr.add<JsonObject>();
    m["branch_id"]    = BRANCH_IDS[i];
    m["power_kw"]     = roundToDecimal(readings[i].powerKw, 4);
    m["voltage_v"]    = VOLTAGE_SIM;
    m["current_a"]    = roundToDecimal(readings[i].currentA, 4);
    m["power_factor"] = POWER_FACTOR_SIM;
  }

  String out;
  serializeJson(doc, out);
  return out;
}

// ═══════════════════════════════════════════════════════════════
// ENVÍO HTTP
// ═══════════════════════════════════════════════════════════════

bool postToServer(const String& payload) {
  HTTPClient http;
  String url = String(DASHBOARD_URL) + "/api/iot/ingest";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-iot-secret", IOT_SECRET);
  http.setTimeout(8000); // 8 seg timeout

  int code = http.POST(payload);
  bool ok  = (code >= 200 && code < 300);

  if (ok) {
    Serial.printf("   ✅ HTTP %d → Datos enviados\n", code);
  } else {
    Serial.printf("   ❌ HTTP %d → %s\n", code,
                  code < 0 ? http.errorToString(code).c_str() : "Error del servidor");
  }

  http.end();
  return ok;
}

// ═══════════════════════════════════════════════════════════════
// LECTURA DE SENSORES
// ═══════════════════════════════════════════════════════════════

void readPotentiometers() {
  for (int i = 0; i < NUM_MACHINES; i++) {
    int raw = analogRead(POT_PINS[i]);
    currentPowerKw[i]  = (raw / 4095.0) * MAX_POWER_KW;
    currentCurrentA[i] = (currentPowerKw[i] * 1000.0) / VOLTAGE_SIM;
  }
}

// ═══════════════════════════════════════════════════════════════
// CONTROL DE LEDs
// ═══════════════════════════════════════════════════════════════

void checkLedControl() {
  HTTPClient http;

  for (int i = 0; i < NUM_MACHINES; i++) {
    String url = String(DASHBOARD_URL) + "/api/iot/control?device_id=" + BRANCH_IDS[i];
    http.begin(url);
    http.setTimeout(4000);

    int code = http.GET();
    if (code == 200) {
      String resp = http.getString();
      JsonDocument doc;
      if (!deserializeJson(doc, resp)) {
        bool on = doc["led_on"].as<bool>();
        digitalWrite(LED_PINS[i], on ? HIGH : LOW);
      }
    }
    http.end();
    delay(50);
  }
}

// ═══════════════════════════════════════════════════════════════
// WIFI
// ═══════════════════════════════════════════════════════════════

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    return;
  }

  Serial.printf("📶 Conectando a \"%s\"", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  for (int i = 0; i < 20; i++) {
    if (WiFi.status() == WL_CONNECTED) break;
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.printf("✅ WiFi OK — IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    wifiConnected = false;
    Serial.println("❌ Sin WiFi — datos se guardarán en buffer local");
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════

float roundToDecimal(float val, int decimals) {
  float factor = powf(10.0f, decimals);
  return roundf(val * factor) / factor;
}

void printStatus() {
  unsigned long secsToSend = (SEND_INTERVAL - (millis() - lastSendMs)) / 1000;

  Serial.println("┌───────────────┬──────────┬──────────┬──────────┐");
  Serial.println("│    Máquina    │   kW     │  Amp     │  LED     │");
  Serial.println("├───────────────┼──────────┼──────────┼──────────┤");
  for (int i = 0; i < NUM_MACHINES; i++) {
    Serial.printf("│ %-13s │ %6.3f   │ %6.3f   │   %s     │\n",
                  BRANCH_IDS[i],
                  currentPowerKw[i],
                  currentCurrentA[i],
                  digitalRead(LED_PINS[i]) ? "🟢" : "⚫");
  }
  Serial.println("└───────────────┴──────────┴──────────┴──────────┘");
  Serial.printf("📶 WiFi: %s  |  💾 Buffer: %d/%d  |  ⏱ Envío en: %lus\n",
                wifiConnected ? "OK" : "OFFLINE",
                bufferCount, BUFFER_SIZE,
                secsToSend);
  Serial.println();
}
