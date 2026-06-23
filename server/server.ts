import { Hono } from "hono";
import { serve, upgradeWebSocket } from "@hono/node-server";
import { WebSocketServer } from "ws";
import type { WSContext } from "hono/ws";

type SignalMessage = {
    type: "register" | "offer" | "answer" | "ice-candidate";
    id?: string;
    target?: string;
    payload?: unknown;
}

const app = new Hono();
const peers = new Map<string, WSContext>();

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