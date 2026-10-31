# Smashbra

[Play Super Smash Bros. online](https://jpdieffe.github.io/smashbra/)

The supplied, unchanged Super Smash Bros. (USA) N64 ROM runs in the host’s browser. A friend joins with a two-character room code or invite link. WebRTC carries the host’s game video/audio and the friend’s controller-two input. This follows the existing Mario Kart room system.

## Play together

1. Open the site and **Create a room**. Use **Invite** to send the link to your friend.
2. Your friend opens the link and taps **Join**. They do not run another emulator or download the ROM.
3. Press **Start**, then choose **VS MODE → VS START** using the stick and **A / Attack**.
4. Move your selection token onto a fighter and press A. Set unused 3P/4P slots to **N/A** (or CPU) using their **HMN** selectors. Press Start when both fighters are ready, then pick a stage.
5. Rotate phones sideways. Tap **Enable sound** when prompted. Keep the host’s game tab visible.

The host runs the original mechanics, fighters, stages, items, and sound. No replacement combat simulation is used. Solo warm-up opens the same original game, with its single-player and training modes.

## Controls

| Action | Phone | Keyboard | Standard gamepad |
| --- | --- | --- | --- |
| Move / cursor | Analog stick | Arrows / WASD | Left stick / D-pad |
| Attack / confirm | A | Z | Bottom face |
| Special / back | B | X | Right face |
| Jump | ↑ | Space | Top or left face |
| Shield | Shield | Shift | Left shoulder / trigger |
| Grab | Grab | E | Right shoulder / trigger |
| Taunt | Taunt | Q | Select |
| Start / pause | Start | Enter | Start |

Touch supports simultaneous stick and action buttons. Small stick movements walk; full travel runs. The native adapter limits analog values to 30000 because the bundled N64 core loses movement at the exact signed full-scale endpoint. Network values retain full precision, with scaling applied only at the emulator boundary.

## Phones and networks

The layout supports Android and iPhone portrait/landscape, safe areas, inline video, touch cancellation, and explicit audio activation. Safari’s **Share → Add to Home Screen** provides more space on iPhone. Hosting is more demanding than joining; use the faster device as host and prefer Wi-Fi. Guest latency includes video encoding, the network round trip, and decoding.

Rooms use PeerJS’s public signaling service and direct WebRTC. Some carrier, corporate, or isolated Wi-Fi networks need a TURN relay. **How to play → Phones, sound & connection help** accepts a custom HTTPS PeerServer and TURN credentials. Settings stay in memory for the current tab. A TURN service is not provisioned or bundled. Room codes identify rooms; they are not passwords. No microphone or screen-sharing permission is requested.

Lost input is cleared after 600 ms. Leaving, switching apps, opening Help, or losing the connection releases controls. A host who switches away pauses the game. Guests can retry and rejoin an existing room. Only one guest is admitted.

## Development

```sh
npm ci
npm start
# http://127.0.0.1:4186
npm run check
npm test
npm run test:browser
node tests/webkit.mjs
```

Browser tests use an installed Chrome. `test:browser` substitutes local signaling while retaining real PeerJS/WebRTC data channels and media. Set `PUBLIC_SIGNALING=1` to test the public service. Set `SMASHBRA_URL=https://jpdieffe.github.io/smashbra/` to test deployment. `WEBKIT_EXECUTABLE` can select an installed Playwright WebKit binary. Browser launch/network access must be allowed by the environment.

Phone browser emulation is not physical-device testing. The available Windows Playwright WebKit could not load the page and lacks WebRTC; the separate WebKit test checks native emulation, layout, rotation and audio activation where supported. A physical iPhone-to-Android match still needs device testing.

Pushing `main` runs syntax and unit checks and publishes `site/` through GitHub Actions / Pages. Dependencies are vendored and pinned, so solo play requires no external CDN. Online rooms still need signaling and STUN/TURN connectivity. No service worker is installed, avoiding stale multiplayer assets.

The original ROM ZIP’s SHA-256 and decoded ROM identity are in `site/game-manifest.json`. [Third-party notices](THIRD_PARTY.md) document runtime sources, licenses, and the loader modification.
