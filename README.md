# relay

A self-hosted cloud gaming application. Stream your local game library to any device over WebRTC with full audio passthrough and input forwarding.

---

## How It Works

The host scans local game launchers (Steam, Epic, GOG, and Minecraft) and registers with a signaling server. When a client connects via a pairing code, the host launches the requested game, coerces it into a capture-friendly fullscreen mode, and starts a WebRTC peer connection.

Video and audio are streamed directly between peers. Keyboard, mouse, and scroll inputs are captured by the client and sent over an unordered WebRTC DataChannel to mimic UDP behavior, dropping stale packets immediately.

The signaling server only handles pairing, WebRTC offer/answer relay, device tracking, and library/artwork storage. It never touches the video or input traffic.

---

## Features

* **Multi-launcher scanning** - Detects installed games from **Steam**, **Epic Games**, **GOG**, and **Minecraft** natively:
  * *Steam*: parses `libraryfolders.vdf` and `appmanifest_*.acf` (no Steam API key required).
  * *Epic*: parses `.item` manifests from the launcher's data directory.
  * *GOG*: reads the Windows registry, or scans `goggame-*.info` bundles on macOS.
  * *Minecraft*: detects the official launcher's Java versions (including modded profiles via `inheritsFrom`), Prism Launcher / PolyMC / MultiMC instances, and Bedrock Edition. Clients pick the exact version or instance to launch from a per-title picker.
* **Minecraft launching** - Java editions launch through `minecraft-launcher-core`, with automatic detection of the active account (`launcher_accounts.json`), the correct bundled Java runtime, and memory allocation. Offline UUIDs are derived when no account is present. Bedrock launches via its UWP AUMID, and MultiMC-family instances launch through their own launcher.
* **Automatic artwork** - Steam titles pull grid/hero/capsule art from the Steam CDN. Non-Steam titles are resolved through **SteamGridDB** and cached server-side in SQLite, so lookups only happen once.
* **WebRTC video + audio** - Uses `getDisplayMedia` with system-audio loopback on both **Windows** and **macOS** (`desktopCapturer` is the fallback on Linux). On Windows, capture runs through the **Windows Graphics Capture** backend (enabled via Chromium flags, with zero-Hz frame skipping disabled for consistent delivery). H.264 is forced as the preferred codec with an 8 Mbps bitrate cap tuned directly into the SDP.
* **Fullscreen game capture (Windows)** - A bundled native helper (`win-borderless-helper.exe`) makes fullscreen games streamable without the freezes that plague exclusive-fullscreen capture. When a game launches it coerces the game window into borderless mode sized to the display (leaving a 1px seam so the compositor stays engaged and the stream survives window focus), hides the taskbar, sets a temporary black desktop background, and minimizes other windows - then restores everything the moment the game exits. The result looks identical to true fullscreen on the client. Minecraft Java is additionally forced windowed via `options.txt`.
* **Input forwarding** - Normalized mouse coordinates, scroll, and keyboard events sent over a `maxRetransmits: 0` DataChannel. Native OS simulation is handled by `@nut-tree-fork`, and raw **relative** mouse motion (for proper in-game camera control) is delivered through dedicated native helpers - `win-mouse-helper.exe` (`SendInput`) on Windows and a Swift `mouse-helper` (`CGEvent`) on macOS. The client grabs pointer/keyboard lock in fullscreen so shortcuts pass through to the game.
* **Process management** - Auto-launches games via Steam/Epic URIs, a direct executable, a UWP AUMID, or the Minecraft launcher, then monitors the process. The stream automatically closes if the game is quit on the host.
* **Session locking** - Only one active client stream per host at a time.
* **Device management** - Hosts can name and revoke access for any connected device from settings. Regenerating the pairing code immediately disconnects all existing clients.
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

### Native Helpers

Relay ships small native helper binaries alongside the app (in `src/mouse/`, bundled into `resources/mouse/` on build):

* `win-mouse-helper.exe` / `mac-mouse-helper` (macOS) - raw relative mouse motion for in-game camera control.
* `win-borderless-helper.exe` (Windows) - the borderless-fullscreen coercion described above.

If you modify a helper's source, recompile it before building. For example, the Windows borderless helper:
```bat
csc.exe /target:exe /platform:x64 /reference:System.Drawing.dll /out:win-borderless-helper.exe win-borderless-helper.cs
```

### Signaling Server

The app is configured to point to a remote signaling server. If you are self-hosting the server, deploy the `server/` directory and update the HTTP and WebSocket URLs in `src/main/index.ts` and `src/renderer/renderer.ts`.

The server is a [Hono](https://hono.dev/) app backed by `better-sqlite3` (`relay.db`) and a `ws` WebSocket server. To enable artwork resolution for non-Steam games, set a `STEAMGRIDDB_KEY` environment variable (a `.env` file is loaded automatically); without it, non-Steam titles simply render without art.

WebRTC requires a TURN server for connections across different networks. The app is pre-configured to use a free public TURN server, but you can swap this out in `RTC_CONFIG` inside `src/renderer/renderer.ts` for a self-hosted `coturn` instance.

---

## Notes

* **Windows fullscreen capture**: Windows Graphics Capture (like every compositor-based capture API) cannot reliably grab a game running in *true exclusive* fullscreen, which is why the borderless helper keeps games composited instead. This covers the vast majority of titles. A game that boots straight into exclusive fullscreen and never presents a normal window is logged as `NOWINDOW` and won't capture - that case would require graphics-hook injection, which Relay does not do.
* **macOS Audio**: System audio capture requires `getDisplayMedia` with the `MacLoopbackAudioForScreenShare` Chromium flag enabled. Electron's standard `desktopCapturer` cannot capture macOS system audio natively without a virtual audio driver.
* **Linux scanning**: Steam scanning works on Linux, but Epic and GOG detection is currently Windows/macOS only.
* **Input Latency**: While the DataChannel is configured for zero retransmits, `@nut-tree-fork` processes inputs asynchronously. Swapping the input library for a native C++ addon would yield the lowest possible overhead.
* **Permissions**: Both macOS and Windows require explicit screen recording permissions for the host application.

---

### If you like what you see, feel free to give this repo a star!!!!
