# LOOI Bench Console

*Looi Robot infected by Venom.*

A single-page controller for the TangibleFuture LOOI desk robot. It talks straight to the robot over Web Bluetooth, so you don't need the official app.

**Live:** https://lazybodybuilder.github.io/Looi/ (robot console, runs on the phone)
**Remote:** https://lazybodybuilder.github.io/Looi/remote.html (control it from your PC)

## Features
- Joystick driving, head, light and raw packet writes
- Live sensor decoding: front distance, cliff sensors, close-range sensor, dock, charger, battery
- **Explore mode**: wanders on its own, scans 360° at obstacles, escapes desk edges, remembers its last 6 legs, and turns the light on in the dark
- **Training wheels**: records your joystick driving, learns your style and drives like you
- **AI pilot**: an OpenAI model with tool calls, gated by a safety layer, and it can see through the camera
- **Eyes**: rear-camera free-floor detection that steers Explore, a head-tilt "second look" when camera and distance disagree, and a full-screen face for the Flip's cover screen
- **Remote console**: live camera with vision overlay, telemetry, joystick, Explore, AI chat and settings from a PC browser. The phone keeps a 300 ms deadman, forward block and edge stop on remote driving

## Run on the phone (Galaxy Z Flip 4 on LOOI)
1. Force-stop the official LOOI app so it releases Bluetooth.
2. On the phone, open **https://lazybodybuilder.github.io/Looi/?remote=1** in Chrome. On the cover screen, use *CoverScreen OS* or Good Lock to launch Chrome there.
   Narrow screens show a compact layout with just **Connect LOOI** and the pairing code.
3. Tap **Connect LOOI** and pick the robot. This is the only tap needed on the phone.
4. On the PC, open **remote.html**, type the 6-letter code, and press Connect.
5. From the PC: **Camera on** (choose the ultra-wide if listed), **Face on**, then drive, **Explore** or talk to the AI.
6. Mount the folded phone with the cover screen and rear cameras facing forward.

Face screen gestures: press and hold to start/stop exploring, double-tap to exit.
Tip: LOOI charges the phone wirelessly, so *Developer options → Stay awake* keeps the screen on while it's docked.

### How the remote link works
WebRTC between the phone and the PC via [PeerJS](https://peerjs.com). The free PeerJS cloud server only introduces the two devices, then video and commands go directly between them. It works best with both on the same Wi-Fi.
To use your own signalling server, add `?peerhost=HOST&peerport=PORT&peersecure=0|1` to both URLs.

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
