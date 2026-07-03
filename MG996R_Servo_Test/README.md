# Dual MG996R Servo Arduino/ESP Testing Guide

This project contains a flexible testing sketch for controlling **TWO MG996R High-Torque Servo Motors** simultaneously. It is optimized to work with **ESP32**, **ESP8266**, and standard **Arduino** boards. Both servos will rotate to **60 degrees**, hold for **5 seconds**, and then rotate back to **0 degrees** for **5 seconds** before repeating.

---

## 📂 File Location
The Arduino sketch is saved at:
[`MG996R_Servo_Test.ino`](file:///c:/Users/DELL/.gemini/antigravity/scratch/EquiLib/MG996R_Servo_Test/MG996R_Servo_Test.ino)

---

## ⚠️ CRITICAL WARNING FOR ESP USERS (ESP32 / ESP8266)
If you are using an ESP board:
- **DO NOT USE GPIO 8 and GPIO 9!**
- These pins are connected to the internal SPI Flash Memory chip where your code is stored. Accessing them as GPIO output pins will crash your ESP board immediately or prevent it from booting.
- **The code handles this automatically:** If compiling for an ESP board, the sketch redirects the controls to safe pins instead (GPIO 18 & 19 on ESP32, and GPIO 4 & 5 on ESP8266).
- If you are using a standard Arduino Uno/Mega, pins 8 and 9 are perfectly safe.

---

## 🔌 Wiring & Pin Connections

Because you are using two high-torque servos, they can pull **up to 4A-5A peak current** together. 
- **YOU MUST** use an external 5V-6V power supply (e.g. 5V 3A+ power adapter or battery pack).
- **Common GND is mandatory:** Connect the ground (`-`) of your power supply, both servo ground wires, and the Arduino/ESP GND pin together.

```
                            +--------------------------+
                            |  External Power Supply   |
                            |       (5V - 6V, 3A+)     |
                            +------+-------------+-----+
                                   |             |
                              (+)  |             |  (-)
                               V   V             V  V
  +-----------+              +-------+         +-------+
  |  ESP or   |              |       |         |       |
  |  Arduino  |              |  VCC  |         |  GND  |<----+ (Common GND)
  |           |              |  Line |         |  Line |     |
  |    GND    |<=============|       |         +-------+     |
  |           |              +-------+                       |
  |  Signal 1 |---+              |                           |
  |  Signal 2 |--+|              |                           |
  +-----------+  ||              |                           |
                 ||              |                           |
                 ||   +----------+                           |
                 ||   |          |                           |
                 ||   V          V                           |
                 || +------------+                         +------------+
                 || |   Servo 1  |                         |   Servo 2  |
                 || |   (MG996R) |                         |   (MG996R) |
                 |+-| Orange/Yel |                         |            |
                 |  | (Signal)   |                         |            |
                 +--|------------+                         |            |
                    | Red (VCC)  |                         | Red (VCC)  |
                    | Brown/Blk  |------------------------>| Brown/Blk  |
                    | (GND)      |                         | (GND)      |
                    +------------+                         +------------+
```

### Pin Selection Table:

| Board Type | Servo 1 Signal Pin | Servo 2 Signal Pin | Labels on Board | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Arduino Uno** | **Pin 8** | **Pin 9** | `8`, `~9` | Standard digital pins |
| **ESP32** | **GPIO 18** | **GPIO 19** | `D18`, `D19` | Safe PWM pins *(automatically redirected)* |
| **ESP8266** *(NodeMCU)* | **GPIO 4** | **GPIO 5** | `D2`, `D1` | Safe PWM pins *(automatically redirected)* |

---

## 🚀 How to Upload and Test

1. Launch **Arduino IDE** and open [`MG996R_Servo_Test.ino`](file:///c:/Users/DELL/.gemini/antigravity/scratch/EquiLib/MG996R_Servo_Test/MG996R_Servo_Test.ino).
2. If using ESP32, verify that **`ESP32Servo`** is installed (Sketch > Include Library > Manage Libraries...).
3. Connect your board to the computer via USB.
4. Set **Board** and **Port** under the **Tools** menu.
5. Click **Upload** (arrow icon).
6. Connect all components as outlined above, power up the external supply, and open **Serial Monitor** at **`115200`** baud rate.
