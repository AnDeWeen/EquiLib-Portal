/*
 * Dual MG996R Servo Motor Testing Sketch (ESP & Arduino Compatible)
 * 
 * Description:
 * This sketch controls TWO high-torque MG996R servo motors connected to Pins 8 and 9.
 * Both servos rotate to 60 degrees, pause for 5 seconds, rotate back to 0 degrees,
 * pause for 5 seconds, and repeat this cycle.
 * 
 * --- ⚠️ CRITICAL WARNING FOR ESP32 & ESP8266 USERS ⚠️ ---
 * GPIO 8 and GPIO 9 are connected to the internal SPI Flash Memory chip on ESP boards!
 * - If you try to use Pin 8 and Pin 9 on an ESP32 or ESP8266, the board WILL crash 
 *   or fail to boot.
 * - If you are using an ESP board, you MUST use different pins (e.g., Pins 18 and 19 
 *   on ESP32, or Pins 4 and 5 (labeled D2 and D1) on ESP8266/NodeMCU).
 * - If you are using a standard Arduino Uno/Mega, Pins 8 and 9 are perfectly safe.
 * 
 * --- ESP32 LIBRARY REQUIREMENTS ---
 * If using ESP32, install the "ESP32Servo" library in Arduino IDE:
 *   Sketch -> Include Library -> Manage Libraries... -> Search for "ESP32Servo"
 * 
 * WIRING DIAGRAM (Dual Servos):
 * -------------------------------------------------------------
 * Component          | Connection
 * -------------------------------------------------------------
 * Servo 1 GND        | Common Ground (Arduino/ESP GND & External Power GND)
 * Servo 1 VCC        | External Power +5V to +6V (Capable of 3A+)
 * Servo 1 Signal     | Pin 8 (ESP users: use GPIO 18 instead)
 * -------------------------------------------------------------
 * Servo 2 GND        | Common Ground (Arduino/ESP GND & External Power GND)
 * Servo 2 VCC        | External Power +5V to +6V (Capable of 3A+)
 * Servo 2 Signal     | Pin 9 (ESP users: use GPIO 19 instead)
 * -------------------------------------------------------------
 */

// Handle compilation differences between ESP32, ESP8266, and Arduino AVR
#if defined(ESP32)
  #include <ESP32Servo.h>
  // WARNING: GPIO 8 & 9 cannot be used on ESP32! Redirecting to GPIO 18 & 19.
  const int servoPin1 = 18;  
  const int servoPin2 = 19;  
#elif defined(ESP8266)
  #include <Servo.h>
  // WARNING: GPIO 8 & 9 cannot be used on ESP8266! Redirecting to GPIO 4 & 5 (D2 & D1).
  const int servoPin1 = 4;   // Labeled D2
  const int servoPin2 = 5;   // Labeled D1
#else
  #include <Servo.h>
  // Safe to use Pins 8 & 9 on standard Arduino Uno/Mega
  const int servoPin1 = 8;   
  const int servoPin2 = 9;   
#endif

// Create servo objects
Servo servo1;
Servo servo2;

void setup() {
  Serial.begin(115200);
  delay(500);
  
  Serial.println("\n--- Dual MG996R Servo Test Started ---");

  #if defined(ESP32)
    ESP32PWM::allocateTimer(0);
    ESP32PWM::allocateTimer(1);
    ESP32PWM::allocateTimer(2);
    ESP32PWM::allocateTimer(3);
    servo1.setPeriodHertz(50);
    servo2.setPeriodHertz(50);
    Serial.println("Board detected: ESP32");
    Serial.println("Redirected to safe pins to avoid SPI Flash crash:");
    Serial.print("Servo 1 Pin: GPIO "); Serial.println(servoPin1);
    Serial.print("Servo 2 Pin: GPIO "); Serial.println(servoPin2);
  #elif defined(ESP8266)
    Serial.println("Board detected: ESP8266");
    Serial.println("Redirected to safe pins to avoid SPI Flash crash:");
    Serial.print("Servo 1 Pin: GPIO 4 (D2)\n");
    Serial.print("Servo 2 Pin: GPIO 5 (D1)\n");
  #else
    Serial.println("Board detected: Arduino (AVR)");
    Serial.print("Servo 1 Pin: D"); Serial.println(servoPin1);
    Serial.print("Servo 2 Pin: D"); Serial.println(servoPin2);
  #endif

  // Attach servo objects
  servo1.attach(servoPin1);
  servo2.attach(servoPin2);
  
  // Set initial positions to 0
  servo1.write(0);
  servo2.write(0);
  Serial.println("Initial positions set to 0 degrees.");
}

void loop() {
  // 1. Rotate both servos to 60 degrees
  Serial.println("Rotating both servos to 60 degrees...");
  servo1.write(60);
  servo2.write(60);
  delay(5000); // Hold for 5 seconds
  
  // 2. Rotate both servos back to 0 degrees
  Serial.println("Rotating both servos back to 0 degrees...");
  servo1.write(0);
  servo2.write(0);
  delay(5000); // Hold for 5 seconds
}
