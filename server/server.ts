import { Hono } from "hono";

import { serve, upgradeWebSocket } from "@hono/node-server";
import { WebSocketServer } from "ws";
import type { WSContext } from "hono/ws";

import { randomBytes } from "crypto";
import Database from "better-sqlite3";

type SignalMessage = {
    type: "register" | "offer" | "answer" | "ice-candidate";
    id?: string;
    target?: string;
    payload?: unknown;
}

const db = new Database("relay.db");

db.exec(`
    CREATE TABLE IF NOT EXISTS hosts (
        id TEXT PRIMARY KEY,
        code TEST UNIQUE NOT NULL
    )
`);

const insertHost = db.prepare("INSERT INTO hosts (id, code) VALUES (?, ?)");
const findByCode = db.prepare("SELECT id FROM hosts WHERE code = ?");

const app = new Hono();
const peers = new Map<string, WSContext>();

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
    return c.json({ valid: true, hostId: host.id });
});

app.get("/ws", upgradeWebSocket(() => {
    let myId: string | null = null;

    return {
        onMessage(event, ws) {
            const msg: SignalMessage = JSON.parse(event.data as string);

            if (msg.type == "register") {
                myId = msg.id!;
                peers.set(myId, ws);
                console.log(`[+] ${myId} connected`);
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
                peers.delete(myId);
                console.log(`[-] ${myId} disconnected`);
            }
        }
    }
}));

const wss = new WebSocketServer({ noServer: true });

serve({ fetch: app.fetch, port: 6004, websocket: { server: wss } }, () => {
    console.log("Server running on http://localhost:6004/");
});