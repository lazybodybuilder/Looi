# LOOI Bench Console

*Looi Robot infected by Venom.*

A single-page controller for the TangibleFuture LOOI desk robot. It talks straight to the robot over Web Bluetooth, so you don't need the official app.

**Live:** https://lazybodybuilder.github.io/Looi/

## Features
- Joystick driving, head, light and raw packet writes
- Live sensor decoding: front distance, cliff sensors, close-range sensor, dock, charger, battery
- **Explore mode**: wanders on its own, scans 360° at obstacles, escapes desk edges, remembers its last 6 legs, and turns the light on in the dark
- **Training wheels**: records your joystick driving, learns your style and drives like you
- **AI pilot**: an OpenAI model with tool calls, gated by a safety layer, and it can see through the camera
- **Eyes**: rear-camera free-floor detection that steers Explore, plus a full-screen face for the Flip's cover screen

## Run on the phone (Galaxy Z Flip 4 on LOOI)
1. Force-stop the official LOOI app so it releases Bluetooth.
2. Open the link above in **Chrome**. Bluetooth needs Chrome or Edge; the camera needs https.
3. Connect LOOI → Start camera (pick the ultra-wide if listed) → Face mode.
4. Fold the phone and mount it cover-screen forward. The rear cameras look ahead.
   To keep Chrome on the cover screen, use the free *CoverScreen OS* app.

## Protocol (service `0x00FF`)
| What | Where | Format |
|---|---|---|
| Handshake | FEDA `03` → FEF0 ASCII time `A2026 10 17 16 30 00` → FEDA `8101` | robot replies `59` ("Y") |
| Drive | FED0 write | `[forward, turn]` signed int8 −127…127, resend every 50 ms |
| Head | FED1 write | `00` up · `87` centre · `ff` down |
| Light | FED2 write | `01` / `00` |
| Battery | FED8 read/notify | `[percent, charging]` |
| Sensors | FED9 notify | `01 a b c d` cliff (1 = surface) · `0e LL HH` distance mm (FFFF = none) · `02 LL HH` close-range/light · `05`/`06` dock · `0b 01`/`0b 00` charger · `09 00` set down |
| Mirrors | FED5 / FED6 read | live cliff state / close-range value |

Unofficial community project. Writes to FED3/FEDF are blocked by default, since they may be firmware or reset commands.
