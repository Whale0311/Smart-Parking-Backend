#include <WiFi.h>
#include <HTTPClient.h>
#include <LiquidCrystal_I2C.h>
// Sử dụng FreeRTOS thực hiện hai task.
//Task 1: Kiểm tra trạng thái của các cảm biến, Nếu có thay đổi thì cập nhật lại thông tin trên LED
//Task 2: Cũng kiểm tra trạng thái của các cảm biến, sau đó gửi api đến thingspeak 
// Cấu hình WiFi & ThingSpeak
const char* ssid = "Hang MC";
const char* password = "141297kt";
const String writeApiKey = "GQH74IKVVYQFDV2A";

// Cảm biến IR
const int irPins[] = {13, 4, 14, 27, 26, 25, 33, 32};

// Biến toàn cục quản lý trạng thái
int lastStates[8];
bool hasChanged = false;
unsigned long lastChangeTime = 0;
unsigned long lastSendTime = 0;

LiquidCrystal_I2C lcd(0x27, 16, 2);

void TaskDisplay(void *pvParameters);
void TaskSendServer(void *pvParameters);

void setup() {
  Serial.begin(115200);
  lcd.init();
  lcd.backlight();
  // lcd.clear();
  
  for (int i = 0; i < 8; i++) {
    pinMode(irPins[i], INPUT);
    lastStates[i] = digitalRead(irPins[i]);
  }

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");

  // Tạo 2 Task song song
  xTaskCreate(TaskDisplay, "DisplayTask", 4096, NULL, 2, NULL);
  xTaskCreate(TaskSendServer, "NetworkTask", 8192, NULL, 1, NULL);
}

void loop() {} 

// TASK 1: QUÉT LIÊN TỤC & HIỂN THỊ LCD 
void TaskDisplay(void *pvParameters) {
  for (;;) {
    int countA = 0; // Số chỗ trống bãi A
    int countB = 0; // Số chỗ trống bãi B
    bool currentChange = false;

    for (int i = 0; i < 8; i++) {
      int s = digitalRead(irPins[i]);
      
      // Phát hiện thay đổi
      if (s != lastStates[i]) {
        lastStates[i] = s;
        currentChange = true;
      }

      // Đếm chỗ trống (HIGH = Không có vật cản = Trống)
      if (s == HIGH) {
        if (i < 4) countA++; else countB++;
      }
    }

    if (currentChange) {
      hasChanged = true;
      lastChangeTime = millis(); // Reset timer đếm lùi 2s
    }

    // Cập nhật LCD ngay lập tức
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.printf("Bai A: %d Trong  ", countA);
    lcd.setCursor(0, 1);
    lcd.printf("Bai B: %d Trong  ", countB);

    vTaskDelay(200 / portTICK_PERIOD_MS);
  }
}

//TASK 2: GỬI SERVER & LOG
void TaskSendServer(void *pvParameters) {
  for (;;) {
    //  Có thay đổi VÀ đã đợi đủ 2s VÀ cách lần gửi trước > 3s
    if (hasChanged && (millis() - lastChangeTime > 2000)) {
      if (millis() - lastSendTime > 3000) { 
        
        if (WiFi.status() == WL_CONNECTED) {
          HTTPClient http;
          String url = "https://api.thingspeak.com/update?api_key=" + writeApiKey;
          String logLine = "[Data] "; 

          // Đọc lại toàn bộ để gửi
          for (int i = 0; i < 8; i++) {
            // Quy ước gửi: 1 (Có xe), 0 (Trống)
            int val = (digitalRead(irPins[i]) == LOW) ? 1 : 0;
            
            url += "&field" + String(i + 1) + "=" + String(val);
            logLine += "S" + String(i + 1) + ":" + String(val) + " ";
          }

          http.begin(url);
          int httpCode = http.GET();
          String payload = http.getString();
          http.end();
          int entryId = payload.toInt();

          logLine += "| Status: " + String(httpCode);
          Serial.println(logLine);

          // Reset trạng thái
          if (httpCode == 200 && entryId > 0) {
            hasChanged = false; 
            
            Serial.println("Gửi data thành công");
          }
          // Nếu k gửi được thì giữ cờ 
          else if (entryId == 0){
            Serial.println("Rate Limit hoặc lỗi Data");
            // vTaskDelay(3000 / portTICK_PERIOD_MS);
          }
        }
      } else {
        // Serial.println("Cho cooldown..."); 
      }
    }
    vTaskDelay(1000 / portTICK_PERIOD_MS);
  }
}