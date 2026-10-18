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
- **Eyes**: rear-camera free-floor detection that steers Explore (it only triggers avoidance within the *Camera reacts within* distance, 300 mm by default), a head-tilt "second look" when camera and distance disagree, and a full-screen face for the Flip's cover screen
- **Sensor fusion**: the camera learns to judge distance from the distance sensor (per head tilt), giving each of 9 columns a distance estimate; the distance sensor overrides the centre and the close-range sensor confirms contact
- **Map & home**: heading from the phone's gyroscope (falls back to commanded turns), distance from drive commands with speed self-tuned by the distance sensor, a live radar with obstacle points, the last 5 minutes of path, Set home / Go home
- **Patrol & guard**: record waypoints by driving to them, then patrol them in laps with obstacle avoidance. At each point LOOI parks and watches the camera; motion raises an alert with a photo on the phone and PC, optionally pushed to your phone via an ntfy topic, plus a spoken "Who's there?" and an alarm face
- **Robo eyes face** (in the style of [FluxGarage RoboEyes](https://github.com/FluxGarage/RoboEyes)): rounded glowing eyes with eyelid moods, blinks, glances and colours that glide between moods. Lime and focused while hunting, red and curious with a "?" when blocked, yellow happy cheeks when it finds a way out, trembling with sweat drops at edges, purple when the AI is thinking, tired teal on low battery
- **Audio & light**: listen to the phone's microphone, talk through its speaker (hold to talk), make it say things or play sounds, toggle the flashlight
- **Remote console**: live camera with vision overlay, telemetry, joystick, Explore, AI chat and settings from a PC browser. Rotate or mirror the video and switch between the phone's cameras. The header shows the robot's and the phone's battery. Remote driving keeps a 300 ms deadman (if the PC goes quiet, it stops). The forward block and edge stop can be switched off with **Safety off** on the PC; they come back on when the PC disconnects

## Run on the phone (Galaxy Z Flip 4 on LOOI)
1. Force-stop the official LOOI app so it releases Bluetooth.
1. Once, on the phone: open the console, and under *Remote control* press **Suggest** (or type 12+ characters), write the password down, and press **Set password**. Remote control stays off until a password is set.
2. On the phone, open **https://lazybodybuilder.github.io/Looi/?remote=1** in Chrome. On the cover screen, use *CoverScreen OS* or Good Lock to launch Chrome there.
   Narrow screens show a compact layout with just **Connect LOOI** and the pairing code.
3. Tap **Connect LOOI** and pick the robot. This is the only tap needed on the phone.
4. On the PC, open **remote.html**, type the 6-letter code and the password, and press Connect. Tick **Remember on this PC** to skip the password next time.
5. From the PC: **Camera on** (pick a camera from the list or press **Next camera**; the full list appears after the camera has started once), **Face on**, then drive, **Explore** or talk to the AI.
6. Mount the folded phone with the cover screen and rear cameras facing forward.

Face screen gestures: press and hold to start/stop exploring, double-tap to exit.
Tip: LOOI charges the phone wirelessly, so *Developer options → Stay awake* keeps the screen on while it's docked.

### How the remote link works
WebRTC between the phone and the PC via [PeerJS](https://peerjs.com). The free PeerJS cloud server only introduces the two devices, then video and commands go directly between them. It works best with both on the same Wi-Fi.
To use your own signalling server, add `?peerhost=HOST&peerport=PORT&peersecure=0|1` to both URLs.

### Calibration (do once, in this order)
1. **360° time**: press Test 360° spin. With a gyro, the time is set for you from the measured turn; without one, adjust until LOOI ends where it started.
2. **Speed**: learns itself when LOOI drives straight at something within ~80 cm (*Learn speed from the distance sensor*). To set it by hand: Speed test (1 s at speed 100), measure the distance in mm, enter it as *mm/s at speed 100*.
3. **Camera rotation**: rotate the view on the PC until it's upright. The phone uses the same setting to analyse the image.
4. **Camera ranging** learns by itself while driving toward things the distance sensor can see.

## Remote security
The repository and the pages are public, so the only secret is the password, and the phone enforces it.

- **Password → key.** The phone stores a key derived with PBKDF2-SHA256 (600,000 rounds, random salt), never the password itself. **Remember on this PC** stores the same derived key on the PC, per phone code.
- **Login.** When a PC connects, the phone sends a fresh random challenge. The PC must answer with an HMAC over both sides' nonces and both peer IDs. Until it does, the phone shares nothing (no telemetry, video, settings or log) and ignores every command. The phone then proves itself back, so a fake "phone" can't fool the PC.
- **Encrypted link.** Every message after login is AES-256-GCM encrypted with a key unique to that link. Each message is numbered, so a tampered, replayed or reordered message closes the link.
- **Lockout.** After 5 wrong passwords the phone refuses logins for 1 minute, doubling each further miss up to 1 hour. Setting the password again clears the lockout.
- **One PC at a time.** A PC that hasn't logged in can't hold the slot; it's replaced by the next one, or dropped after 20 s.
- **Video and audio** only start for the logged-in PC, and the PC only accepts video from the phone it logged in to. Each media call has its own WebRTC encryption keys, set up through the PeerJS signal server. Both ends then compare those keys' fingerprints over the password-protected link and hang up if they differ, so a relay that swaps in its own keys gets cut off.
- **Disconnects.** The PC says goodbye when you press Disconnect or close the tab, and pings every 1.5 s. If the phone hears nothing for 6 s it frees the slot, so a crashed PC can't lock you out.
- **Remembered key and a changed password.** If the phone's password changes, a PC with a remembered key won't log in on its own; you type the new password once.
- The crypto lives in one file, `sec.js`, loaded by both pages, so the phone and the PC always run the same code.
- The 6-letter code is only an address; it isn't the secret. Changing the password ends any current PC link.

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
