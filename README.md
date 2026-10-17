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
2. Open the link above in **Chrome** with the phone unfolded. Bluetooth needs Chrome or Edge; the camera needs https.
3. **Connect LOOI**, then **Start camera** and pick the rear camera (try each "facing back" entry; the ultra-wide shows the most). Set the field of view to match (~70° wide, ~110° ultra-wide).
4. Get Chrome onto the cover screen: Good Lock → MultiStar → *I ♡ Galaxy Foldable* → Launcher widget (if your One UI offers it), or the free *CoverScreen OS* app.
5. Press **Face mode**, fold, and mount the phone with the cover screen and rear cameras facing forward.
6. On the face: **press and hold** to start/stop exploring, **double-tap** to exit. If folding hides the page for a moment, the camera and Bluetooth reconnect automatically.

Tip: LOOI charges the phone wirelessly, so *Developer options → Stay awake* keeps the screen on while it's docked.

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
