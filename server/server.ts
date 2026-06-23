import { Hono } from "hono";

import { serve, upgradeWebSocket } from "@hono/node-server";
import { WebSocketServer } from "ws";
import type { WSContext } from "hono/ws";

import { randomBytes } from "crypto";
import Database from "better-sqlite3";

type SignalMessage = {
    type: "register" | "connect-request" | "offer" | "answer" | "ice-candidate";
    id?: string;
    target?: string;
    payload?: unknown;
}

const db = new Database("relay.db");

db.exec(`
    CREATE TABLE IF NOT EXISTS hosts (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL
    )
`);

const insertHost = db.prepare("INSERT INTO hosts (id, code) VALUES (?, ?)");
const findByCode = db.prepare("SELECT id FROM hosts WHERE code = ?");
const findById = db.prepare("SELECT id FROM hosts WHERE id = ?");

const app = new Hono();
const peers = new Map<string, WSContext>();
const onlineHosts = new Map<string, WSContext>();
const activeSessions = new Set<string>();

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
                if (findById.get(myId)) onlineHosts.set(myId, ws);
                console.log(`[+] ${myId} connected`);
                return;
            }

            if (msg.type === "connect-request") {
                if (activeSessions.has(msg.target!)) {
                    ws.send(JSON.stringify({ type: "session-busy" }));
                    return;
                }
                activeSessions.add(msg.target!);
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
                peers.delete(myId);
                onlineHosts.delete(myId);
                activeSessions.delete(myId);
                for (const [hostId] of onlineHosts) {
                    if (myWs && peers.get(hostId) === myWs) activeSessions.delete(hostId);
                }
                console.log(`[-] ${myId} disconnected`);
            }
        },
    };
}));

const wss = new WebSocketServer({ noServer: true });

serve({ fetch: app.fetch, port: 6004, websocket: { server: wss } }, () => {
    console.log("Server running on http://localhost:6004/");
});