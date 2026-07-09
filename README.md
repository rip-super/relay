# relay

A self-hosted cloud gaming application. Stream your local game library to any device over WebRTC with full audio passthrough and input forwarding.

---

## How It Works

The host scans local Steam directories and registers with a signaling server. When a client connects via a pairing code, the host launches the game and starts a WebRTC peer connection.

Video and audio are streamed directly between peers. Keyboard and mouse inputs are captured by the client and sent over an unordered WebRTC DataChannel to mimic UDP behavior, dropping stale packets immediately.

The signaling server only handles pairing, WebRTC offer/answer relay, and library storage. It never touches the video or input traffic.

---

## Features

* **Steam library scanning** - Parses `libraryfolders.vdf` and `appmanifest_*.acf` files natively. No Steam API key required.
* **WebRTC video + audio** - Uses Electron's `desktopCapturer` (Windows) and `getDisplayMedia` loopback (macOS) with a forced 8 Mbps bitrate cap.
* **Input forwarding** - Mouse coordinates and keyboard events sent over a `maxRetransmits: 0` DataChannel. Native OS simulation handled by `@nut-tree-fork`.
* **Process management** - Auto-launches games via Steam URI and monitors the process. The stream automatically closes if the game is quit.
* **Session locking** - Only one active client stream per host at a time.

---

## Installation

This repository has attached binaries for all the major operating systems (Windows, MacOS, and Linux), allowing you to simply install and use Relay without any hassle!

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

WebRTC requires a TURN server for connections across different networks. The app is pre-configured to use a free public TURN server, but you can swap this out in `RTC_CONFIG` inside `src/renderer/renderer.ts` for a self-hosted `coturn` instance.

---

## Notes

* **macOS Audio**: System audio capture requires `getDisplayMedia` with the `MacLoopbackAudioForScreenShare` Chromium flag enabled. Electron's standard `desktopCapturer` cannot capture macOS system audio natively without a virtual audio driver.
* **Input Latency**: While the DataChannel is configured for zero retransmits, `@nut-tree-fork` processes inputs asynchronously. Swapping the input library for a native C++ addon would yield the lowest possible overhead.
* **Permissions**: Both macOS and Windows require explicit screen recording permissions for the host application.

---

### If you like what you see, feel free to give this repo a star!!!!
