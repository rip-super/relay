import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve, upgradeWebSocket } from "@hono/node-server";
import { WebSocketServer } from "ws";
import type { WSContext } from "hono/ws";
import { randomBytes } from "crypto";
import Database from "better-sqlite3";

type SignalMessage = {
    type: "register" | "connect-request" | "offer" | "answer" | "ice-candidate" | "stream-ended";
    id?: string;
    target?: string;
    payload?: unknown;
    role?: "host" | "client";
    hostId?: string;
    displayName?: string;
};

const db = new Database("relay.db");
db.exec(`
    CREATE TABLE IF NOT EXISTS hosts (
        id   TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS devices (
        id           TEXT PRIMARY KEY,
        host_id      TEXT NOT NULL,
        display_name TEXT NOT NULL DEFAULT 'Unknown Device',
        last_seen    TEXT,
        FOREIGN KEY (host_id) REFERENCES hosts(id) ON DELETE CASCADE
    );
`);
try { db.exec("ALTER TABLE hosts ADD COLUMN library TEXT"); } catch { }

const insertHost = db.prepare("INSERT INTO hosts (id, code) VALUES (?, ?)");
const findByCode = db.prepare("SELECT id FROM hosts WHERE code = ?");
const findById = db.prepare("SELECT id FROM hosts WHERE id = ?");
const updateCode = db.prepare("UPDATE hosts SET code = ? WHERE id = ?");

const upsertDevice = db.prepare(`
    INSERT INTO devices (id, host_id, display_name, last_seen)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET last_seen = excluded.last_seen
`);
const renameDevice = db.prepare("UPDATE devices SET display_name = ? WHERE id = ?");
const deleteDevice = db.prepare("DELETE FROM devices WHERE id = ?");
const listDevices = db.prepare("SELECT * FROM devices WHERE host_id = ?");
const findDevice = db.prepare("SELECT * FROM devices WHERE id = ?");
const getLibrary = db.prepare("SELECT library FROM hosts WHERE id = ?");
const setLibrary = db.prepare("UPDATE hosts SET library = ? WHERE id = ?");

const app = new Hono();
const peers = new Map<string, WSContext>();
const onlineHosts = new Map<string, WSContext>();
const activeSessions = new Set<string>();
const deviceHosts = new Map<string, string>();

app.use("*", cors());

app.post("/hosts/register", (c) => {
    const hostId = randomBytes(4).toString("hex");
    const code = randomBytes(4).toString("hex").toUpperCase();
    insertHost.run(hostId, code);
    console.log(`[host] registered ${hostId} with code ${code}`);
    return c.json({ hostId, code });
});

app.post("/codes/validate", async (c) => {
    const { code } = await c.req.json<{ code: string }>();
    const host = findByCode.get(code?.toUpperCase()) as { id: string } | undefined;

    if (!host) return c.json({ valid: false }, 404);
    if (!onlineHosts.has(host.id)) return c.json({ valid: false, reason: "host offline" }, 503);

    return c.json({ valid: true, hostId: host.id });
});

app.get("/hosts/:hostId/devices", (c) => {
    const { hostId } = c.req.param();
    const devices = listDevices.all(hostId) as {
        id: string; host_id: string; display_name: string; last_seen: string | null;
    }[];
    return c.json(devices.map(d => ({ ...d, online: peers.has(d.id) })));
});

app.patch("/devices/:deviceId/name", async (c) => {
    const { deviceId } = c.req.param();
    const { name } = await c.req.json<{ name: string }>();
    if (!name?.trim()) return c.json({ error: "Name required" }, 400);
    const device = findDevice.get(deviceId) as any;
    if (!device) return c.json({ error: "Not found" }, 404);
    renameDevice.run(name.trim(), deviceId);
    const hostWs = onlineHosts.get(device.host_id);
    if (hostWs) hostWs.send(JSON.stringify({ type: "device-renamed", deviceId, name: name.trim() }));
    const deviceWs = peers.get(deviceId);
    if (deviceWs) deviceWs.send(JSON.stringify({ type: "name-updated", name: name.trim() }));
    return c.json({ ok: true });
});

app.delete("/devices/:deviceId", (c) => {
    const { deviceId } = c.req.param();
    const device = findDevice.get(deviceId);
    if (!device) return c.json({ error: "Not found" }, 404);
    const ws = peers.get(deviceId);
    if (ws) {
        ws.send(JSON.stringify({ type: "revoked" }));
        ws.close();
    }
    deleteDevice.run(deviceId);
    return c.json({ ok: true });
});

app.post("/hosts/:hostId/regenerate-code", (c) => {
    const { hostId } = c.req.param();
    const host = findById.get(hostId);
    if (!host) return c.json({ error: "Not found" }, 404);
    const newCode = randomBytes(4).toString("hex").toUpperCase();
    updateCode.run(newCode, hostId);
    for (const [clientId, hId] of deviceHosts) {
        if (hId === hostId) {
            const ws = peers.get(clientId);
            if (ws) ws.send(JSON.stringify({ type: "code-changed" }));
        }
    }
    console.log(`[host] ${hostId} regenerated code -> ${newCode}`);
    return c.json({ code: newCode });
});

app.put("/hosts/:hostId/library", async (c) => {
    const { hostId } = c.req.param();
    const { games } = await c.req.json<{ games: unknown }>();
    setLibrary.run(JSON.stringify(games), hostId);
    return c.json({ ok: true });
});

app.get("/hosts/:hostId/library", (c) => {
    const { hostId } = c.req.param();
    const row = getLibrary.get(hostId) as { library: string | null } | undefined;
    if (!row?.library) return c.json([]);
    return c.json(JSON.parse(row.library));
});

app.get("/ws", upgradeWebSocket(() => {
    let myId: string | null = null;
    let myWs: WSContext | null = null;

    return {
        onMessage(event, ws) {
            const msg: SignalMessage = JSON.parse(event.data as string);
            myWs = ws;

            if (msg.type === "register") {
                myId = msg.id!;
                peers.set(myId, ws);

                if (msg.role === "host" || findById.get(myId)) {
                    onlineHosts.set(myId, ws);
                } else if (msg.role === "client" && msg.hostId) {
                    deviceHosts.set(myId, msg.hostId);
                    upsertDevice.run(myId, msg.hostId, msg.displayName ?? "Unknown Device", new Date().toISOString());
                    const hostWs = onlineHosts.get(msg.hostId);
                    if (hostWs) {
                        const device = findDevice.get(myId) as any;
                        hostWs.send(JSON.stringify({ type: "device-joined", device: { ...device, online: true } }));
                    }
                }
                console.log(`[+] ${myId} (${msg.role ?? "unknown"}) connected`);
                return;
            }

            if (msg.type === "connect-request") {
                if (activeSessions.has(msg.target!)) {
                    ws.send(JSON.stringify({ type: "session-busy" }));
                    return;
                }
                activeSessions.add(msg.target!);
            }

            if (msg.type === "stream-ended") {
                activeSessions.delete(msg.target!);
                const target = peers.get(msg.target!);
                if (target) target.send(JSON.stringify({ type: "stream-ended", from: myId }));
                return;
            }

            const target = peers.get(msg.target!);
            if (target) {
                target.send(JSON.stringify({ type: msg.type, from: myId, payload: msg.payload }));
            } else {
                console.warn(`[!] Target "${msg.target}" not connected`);
            }
        },

        onClose() {
            if (myId) {
                const hostId = deviceHosts.get(myId);
                if (hostId) {
                    deviceHosts.delete(myId);
                    activeSessions.delete(hostId);
                    const hostWs = onlineHosts.get(hostId);
                    if (hostWs) hostWs.send(JSON.stringify({ type: "device-left", deviceId: myId }));
                }
                peers.delete(myId);
                onlineHosts.delete(myId);
                activeSessions.delete(myId);
                console.log(`[-] ${myId} disconnected`);
            }
        },
    };
}));

const wss = new WebSocketServer({ noServer: true });

serve({ fetch: app.fetch, port: 6004, websocket: { server: wss } }, () => {
    console.log("Server running on http://localhost:6004/");
});