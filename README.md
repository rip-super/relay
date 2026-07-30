# relay

A self-hosted cloud gaming application. Stream your local game library to any device over WebRTC with full audio passthrough and input forwarding.

---

## How It Works

The host scans local game launchers (Steam, Epic, GOG) and registers with a signaling server. When a client connects via a pairing code, the host launches the game and starts a WebRTC peer connection.

Video and audio are streamed directly between peers. Keyboard, mouse, and scroll inputs are captured by the client and sent over an unordered WebRTC DataChannel to mimic UDP behavior, dropping stale packets immediately.

The signaling server only handles pairing, WebRTC offer/answer relay, device tracking, and library/artwork storage. It never touches the video or input traffic.

---

## Features

* **Multi-launcher scanning** - Detects installed games from **Steam**, **Epic Games**, and **GOG** natively:
  * *Steam*: parses `libraryfolders.vdf` and `appmanifest_*.acf` (no Steam API key required).
  * *Epic*: parses `.item` manifests from the launcher's data directory.
  * *GOG*: reads the Windows registry, or scans `goggame-*.info` bundles on macOS.
* **Automatic artwork** - Steam titles pull grid/hero/capsule art from the Steam CDN. Non-Steam titles are resolved through **SteamGridDB** and cached server-side in SQLite, so lookups only happen once.
* **WebRTC video + audio** - Uses Electron's `desktopCapturer` (Windows) and `getDisplayMedia` loopback (macOS), with H.264 forced as the preferred codec and an 8 Mbps bitrate cap tuned into the SDP.
* **Input forwarding** - Normalized mouse coordinates, scroll, and keyboard events sent over a `maxRetransmits: 0` DataChannel. Native OS simulation handled by `@nut-tree-fork`. The client grabs pointer/keyboard lock in fullscreen so shortcuts pass through to the game.
* **Process management** - Auto-launches games via Steam/Epic URIs or a direct executable, then monitors the process. The stream automatically closes if the game is quit on the host.
* **Session locking** - Only one active client stream per host at a time.
* **Device management** - Hosts can name, and revoke access for any connected device from settings. Regenerating the pairing code immediately disconnects all existing clients.
* **Library sync** - The host's scanned library is pushed to the server, so clients can browse the full catalog and recently-played titles the moment they connect.
* **Desktop conveniences** - System tray, launch-on-login, and start-minimized options.

---

## Installation

This repository has attached binaries for all the major operating systems (Windows, macOS, and Linux), allowing you to simply install and use Relay without any hassle!

## Running Locally

Make sure you have Node.js installed.

1. Clone the repository:
```bash
git clone https://github.com/rip-super/relay.git
cd relay/app/relay
```
2. Install dependencies:
```bash
npm install
```
3. Start the Electron app in development mode:
```bash
npm run dev
```
To test the client and host simultaneously on the same machine, you can run the client in a temporary user data directory:
```bash
npm run dev:client
```

### Signaling Server

The app is configured to point to a remote signaling server. If you are self-hosting the server, deploy the `server/` directory and update the HTTP and WebSocket URLs in `src/main/index.ts` and `src/renderer/renderer.ts`.

The server is a [Hono](https://hono.dev/) app backed by `better-sqlite3` (`relay.db`) and a `ws` WebSocket server. To enable artwork resolution for non-Steam games, set a `STEAMGRIDDB_KEY` environment variable (a `.env` file is loaded automatically); without it, non-Steam titles simply render without art.

WebRTC requires a TURN server for connections across different networks. The app is pre-configured to use a free public TURN server, but you can swap this out in `RTC_CONFIG` inside `src/renderer/renderer.ts` for a self-hosted `coturn` instance.

---

## Notes

* **macOS Audio**: System audio capture requires `getDisplayMedia` with the `MacLoopbackAudioForScreenShare` Chromium flag enabled. Electron's standard `desktopCapturer` cannot capture macOS system audio natively without a virtual audio driver.
* **Linux scanning**: Steam scanning works on Linux, but Epic and GOG detection is currently Windows/macOS only.
* **Input Latency**: While the DataChannel is configured for zero retransmits, `@nut-tree-fork` processes inputs asynchronously. Swapping the input library for a native C++ addon would yield the lowest possible overhead.
* **Permissions**: Both macOS and Windows require explicit screen recording permissions for the host application.

---

### If you like what you see, feel free to give this repo a star!!!!
