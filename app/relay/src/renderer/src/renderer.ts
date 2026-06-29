import "@fontsource/outfit/300.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/700.css";
import "./style.css";

const relay = (window as any).relay;

const SHOWCASE_GAMES = [
    { name: "Elden Ring", appId: 1245620 },
    { name: "Cyberpunk 2077", appId: 1091500 },
    { name: "Baldur's Gate 3", appId: 1086940 },
    { name: "Hollow Knight", appId: 367520 },
    { name: "Red Dead Redemption 2", appId: 1174180 },
    { name: "Hades", appId: 1145360 },
    { name: "The Witcher 3", appId: 292030 },
    { name: "Balatro", appId: 2379780 },
    { name: "Celeste", appId: 504230 },
    { name: "Kerbal Space Program", appId: 220200 },
    { name: "Cuphead", appId: 268910 },
    { name: "Outer Wilds", appId: 753640 },
    { name: "Persona 5 Royal", appId: 1687950 },
    { name: "The Binding of Isaac: Rebirth", appId: 250900 },
    { name: "Geometry Dash", appId: 322170 },
    { name: "Slay the Spire", appId: 646570 },
    { name: "Terraria", appId: 105600 },
    { name: "Dead Cells", appId: 588650 },
    { name: "Vampire Survivors", appId: 1794680 },
    { name: "Factorio", appId: 427520 },
    { name: "Subnautica", appId: 264710 },
    { name: "God of War", appId: 1593500 },
    { name: "Control", appId: 870780 },
    { name: "Deep Rock Galactic", appId: 548430 },
    { name: "Stardew Valley", appId: 413150 },
    { name: "Dark Souls III", appId: 374320 },
    { name: "Disco Elysium", appId: 632470 },
    { name: "DOOM", appId: 379720 },
    { name: "Doom Eternal", appId: 782330 },
    { name: "Horizon Zero Dawn", appId: 1151640 },
    { name: "Half-Life: Alyx", appId: 546560 },
    { name: "Portal 2", appId: 620 },
];

function heroUrl(appId: string | number): string {
    return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_hero.jpg`;
}

function portraitUrl(appId: string | number): string {
    return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;
}

function capsuleUrl(appId: string | number): string {
    return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`;
}

interface LibraryGame {
    appId: string;
    name: string;
    sizeOnDisk: number;
    source: string;
    lastPlayed: string;
    platform: string;
    installDir: string;
    executablePath: string;
    launchConfig: { type: string; exePath?: string };
}

let libraryGames: LibraryGame[] = [];
let libraryCode = "";

let currentMode: "host" | "client" | null = null;

let clientId = "";
let clientHostId = "";
let clientHostCode = "";
let clientDisplayName = "";

let hostWsInstance: WebSocket | null = null;
let clientWsInstance: WebSocket | null = null;

let hostPeerConnection: RTCPeerConnection | null = null;
let clientPeerConnection: RTCPeerConnection | null = null;
let activeStreamOverlay: HTMLElement | null = null;

const RTC_CONFIG: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
        {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
        {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
    ],
};

type DeviceEvent =
    | { type: "device-joined"; device: { id: string; display_name: string; last_seen: string; online: boolean } }
    | { type: "device-left"; deviceId: string }
    | { type: "device-renamed"; deviceId: string; name: string };

let onDeviceEvent: ((e: DeviceEvent) => void) | null = null;

const SETTINGS_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="12" cy="12" r="2" stroke="#ffffff" fill="#000000"/>
<path d="M5.39856 5.87922L5.64856 5.4462C5.44653 5.32956 5.19069 5.36813 5.03202 5.53914L5.39856 5.87922ZM3.40061 9.3446L2.92283 9.19719C2.85405 9.42011 2.94857 9.66097 3.15061 9.77762L3.40061 9.3446ZM3.3989 14.6564L3.1489 14.2234C2.94667 14.3402 2.85219 14.5813 2.9213 14.8044L3.3989 14.6564ZM5.39889 18.1205L5.03193 18.4602C5.19055 18.6315 5.44666 18.6703 5.64889 18.5535L5.39889 18.1205ZM9.99994 20.775L9.49994 20.775C9.49994 21.0083 9.66127 21.2106 9.88872 21.2625L9.99994 20.775ZM14 20.7774L14.1113 21.2649C14.3387 21.213 14.5 21.0107 14.5 20.7774L14 20.7774ZM18.6014 18.1208L18.3514 18.5538C18.5535 18.6705 18.8093 18.6319 18.968 18.4609L18.6014 18.1208ZM20.5994 14.6554L21.0772 14.8028C21.1459 14.5799 21.0514 14.3391 20.8494 14.2224L20.5994 14.6554ZM20.6011 9.34354L20.8511 9.77656C21.0533 9.6598 21.1478 9.41861 21.0787 9.19556L20.6011 9.34354ZM18.6011 5.87944L18.968 5.53982C18.8094 5.36844 18.5533 5.32967 18.3511 5.44643L18.6011 5.87944ZM14 3.22501L14.5 3.22501C14.5 2.99172 14.3387 2.78944 14.1113 2.73754L14 3.22501ZM9.99994 3.2226L9.8887 2.73513C9.66127 2.78704 9.49994 2.98932 9.49994 3.2226L9.99994 3.2226ZM14 5.07175L13.5 5.07175L14 5.07175ZM19 13.732L18.75 14.165L19 13.732ZM17 17.1962L16.75 17.6292L17 17.1962ZM4.99992 13.7321L5.24992 14.1651L4.99992 13.7321ZM6.99994 6.80377L6.74994 7.23679L6.99994 6.80377ZM3.87839 9.49201C4.24981 8.28817 4.88751 7.16517 5.7651 6.21929L5.03202 5.53914C4.05014 6.59744 3.3376 7.85288 2.92283 9.19719L3.87839 9.49201ZM4.63879 16.25C4.31383 15.6872 4.06077 15.1032 3.8765 14.5084L2.9213 14.8044C3.12745 15.4698 3.41032 16.1222 3.77276 16.75L4.63879 16.25ZM5.76585 17.7809C5.34296 17.324 4.96373 16.8128 4.63879 16.25L3.77276 16.75C4.13519 17.3778 4.55882 17.949 5.03193 18.4602L5.76585 17.7809ZM13.8888 20.29C12.6308 20.577 11.3394 20.5678 10.1112 20.2875L9.88872 21.2625C11.2603 21.5754 12.7038 21.5861 14.1113 21.2649L13.8888 20.29ZM20.1216 14.508C19.7502 15.7119 19.1125 16.8348 18.2349 17.7807L18.968 18.4609C19.9499 17.4026 20.6624 16.1471 21.0772 14.8028L20.1216 14.508ZM19.3612 7.75001C19.6862 8.31284 19.9392 8.89683 20.1235 9.49153L21.0787 9.19556C20.8725 8.53023 20.5897 7.87776 20.2272 7.25001L19.3612 7.75001ZM18.2341 6.21906C18.657 6.67601 19.0363 7.18716 19.3612 7.75001L20.2272 7.25001C19.8648 6.62224 19.4412 6.05103 18.968 5.53982L18.2341 6.21906ZM10.1112 3.71007C11.3691 3.423 12.6605 3.43223 13.8888 3.71248L14.1113 2.73754C12.7397 2.42458 11.2962 2.41394 9.8887 2.73513L10.1112 3.71007ZM10.4999 5.07172L10.4999 3.2226L9.49994 3.2226L9.49994 5.07172L10.4999 5.07172ZM7.24994 6.37076L5.64856 5.4462L5.14856 6.31223L6.74994 7.23679L7.24994 6.37076ZM4.74992 13.2991L3.1489 14.2234L3.6489 15.0894L5.24992 14.1651L4.74992 13.2991ZM5.24992 9.83495L3.65061 8.91159L3.15061 9.77762L4.74992 10.701L5.24992 9.83495ZM10.4999 20.775L10.4999 18.9282L9.49994 18.9282L9.49994 20.775L10.4999 20.775ZM6.74994 16.7632L5.14889 17.6875L5.64889 18.5535L7.24994 17.6292L6.74994 16.7632ZM18.8514 17.6878L17.25 16.7632L16.75 17.6292L18.3514 18.5538L18.8514 17.6878ZM14.5 20.7774L14.5 18.9283L13.5 18.9283L13.5 20.7774L14.5 20.7774ZM20.3511 8.91053L18.75 9.83491L19.25 10.7009L20.8511 9.77656L20.3511 8.91053ZM20.8494 14.2224L19.25 13.299L18.75 14.165L20.3494 15.0884L20.8494 14.2224ZM14.5 5.07175L14.5 3.22501L13.5 3.22501L13.5 5.07175L14.5 5.07175ZM18.3511 5.44643L16.75 6.37079L17.25 7.23681L18.8511 6.31245L18.3511 5.44643ZM13.5 5.07175C13.5 6.99625 15.5834 8.19906 17.25 7.23681L16.75 6.37079C15.75 6.94814 14.5 6.22645 14.5 5.07175L13.5 5.07175ZM18.75 9.83491C17.0834 10.7972 17.0834 13.2028 18.75 14.165L19.25 13.299C18.25 12.7217 18.25 11.2783 19.25 10.7009L18.75 9.83491ZM17.25 16.7632C15.5834 15.801 13.5 17.0038 13.5 18.9283L14.5 18.9283C14.5 17.7736 15.75 17.0519 16.75 17.6292L17.25 16.7632ZM10.4999 18.9282C10.4999 17.0037 8.41661 15.8009 6.74994 16.7632L7.24994 17.6292C8.24994 17.0518 9.49994 17.7735 9.49994 18.9282L10.4999 18.9282ZM5.24992 14.1651C6.91659 13.2028 6.91658 10.7972 5.24992 9.83495L4.74992 10.701C5.74992 11.2783 5.74992 12.7217 4.74992 13.2991L5.24992 14.1651ZM9.49994 5.07172C9.49995 6.22642 8.24995 6.94811 7.24994 6.37076L6.74994 7.23679C8.41661 8.19904 10.4999 6.99623 10.4999 5.07172L9.49994 5.07172Z" fill="#ffffff"/>
</svg>`;

const RESCAN_SVG = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" clip-rule="evenodd" d="M1.84998 7.49998C1.84998 4.66458 4.05979 1.84998 7.49998 1.84998C10.2783 1.84998 11.6515 3.9064 12.2367 5H10.5C10.2239 5 10 5.22386 10 5.5C10 5.77614 10.2239 6 10.5 6H13.5C13.7761 6 14 5.77614 14 5.5V2.5C14 2.22386 13.7761 2 13.5 2C13.2239 2 13 2.22386 13 2.5V4.31318C12.2955 3.07126 10.6659 0.849976 7.49998 0.849976C3.43716 0.849976 0.849976 4.18537 0.849976 7.49998C0.849976 10.8146 3.43716 14.15 7.49998 14.15C9.44382 14.15 11.0622 13.3808 12.2145 12.2084C12.8315 11.5806 13.3133 10.839 13.6418 10.0407C13.7469 9.78536 13.6251 9.49315 13.3698 9.38806C13.1144 9.28296 12.8222 9.40478 12.7171 9.66014C12.4363 10.3425 12.0251 10.9745 11.5013 11.5074C10.5295 12.4963 9.16504 13.15 7.49998 13.15C4.05979 13.15 1.84998 10.3354 1.84998 7.49998Z" fill="#ffffff"/>
</svg>`;

const POWER_SVG = `<svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#ffffff" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M17.953 5.25a9 9 0 1 1-11.906 0M12 3v9"/></svg>`
function makeCrossfader(id0: string, id1: string) {
    const layers = [document.getElementById(id0)!, document.getElementById(id1)!];
    let cur = 0, gen = 0;
    return (url: string) => {
        gen++;
        const myGen = gen, nxt = 1 - cur;
        layers[nxt].style.backgroundImage = `url('${url}')`;
        layers[nxt].style.zIndex = "1";
        layers[cur].style.zIndex = "0";
        layers[nxt].classList.add("active");
        const old = layers[cur];
        setTimeout(() => { if (myGen === gen) old.classList.remove("active"); }, 340);
        cur = nxt;
    };
}

const POLE_SVG = `<svg viewBox="0 0 680 340" style="position:absolute;left:0;top:0;width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <path id="splash-pp" d="M27.55,17.57h0L40.89.58A1.52,1.52,0,0,1,43,.33a1.38,1.38,0,0,1,.31.33L56.29,17.58l.09.12,24.5,11.21a1.53,1.53,0,0,1-.51,3H77.8v3.48a1.87,1.87,0,1,1-3.74,0V31.88H72.22v3.48a1.87,1.87,0,0,1-3.74,0V31.88H56.6v7.06L80.88,49.83a1.53,1.53,0,0,1-.51,3H77.8v3.71a1.87,1.87,0,1,1-3.74,0V52.8H72.22v3.71a1.87,1.87,0,1,1-3.74,0V52.8H56.6V68.11l9.7,21.43a1.53,1.53,0,0,1,.39.82.07.07,0,0,0,0,0l10.52,23.24h6.55v9.23H62.94v-9.23H73.09L44.79,92.09H38.9L10.8,113.65h10v9.23H0v-9.23H6.6L27.24,68.1V52.8H14.36v3.71a1.87,1.87,0,1,1-3.74,0V52.8h-2v3.71a1.88,1.88,0,0,1-3.75,0V52.8H3.46a1.53,1.53,0,0,1-.62-2.92l24.4-11.09V31.88H14.36v3.48a1.87,1.87,0,1,1-3.74,0V31.88h-2v3.48a1.88,1.88,0,0,1-3.75,0V31.88H3.46A1.53,1.53,0,0,1,2.82,29l24.73-11.4ZM30.3,63.91l9.93-11.38L30.52,41.38H30.3V63.91ZM41.92,50.59l8-9.21H33.9l8,9.21Zm11.42-9.21L43.62,52.53l9.91,11.38V41.38ZM41.92,54.47,31.1,66.88H52.74L41.92,54.47ZM30.3,36.63l9.31-7.79L30.3,21.05V36.63Zm11.62-9.72,7.7-6.44H34.23l7.69,6.44Zm11.61-5.83-9.29,7.77,9.29,7.79V21.08Zm-11.6,9.71-9,7.54h18l-9-7.54ZM71.64,108.7,64.11,92.09H49.82L71.64,108.7ZM33.89,92.09H19.72l-7.55,16.66L33.89,92.09Zm25.6-3L41.93,78.27,24.37,89ZM39,76.48l-9.57-5.87L22.08,86.87,39,76.48Zm2.91-1.79,7.75-4.75H34.18l7.75,4.75Zm12.46-4.06-9.55,5.85L61.73,86.84,54.39,70.63Zm2.21-41.8H73.37L56.6,21.15v7.68ZM27.24,21.07,10.42,28.83H27.24V21.07ZM56.6,42.28v7.47H73.25L56.6,42.28ZM27.24,49.75V42.14L10.51,49.75ZM52.15,17.18,42.07,4,31.74,17.18Z"/>
  </defs>
  <line x1="0" y1="308" x2="680" y2="308" stroke="rgba(10,22,42,.85)" stroke-width="1.5"/>
  <use href="#splash-pp" fill="#1c3858" transform="translate(48.9,95) scale(1.506)"/>
  <use href="#splash-pp" fill="#1c3858" transform="translate(276.9,75) scale(1.506)"/>
  <use href="#splash-pp" fill="#1c3858" transform="translate(504.9,95) scale(1.506)"/>
  <path d="M112,180 Q226,197 340,160" stroke="rgba(16,36,62,.92)" stroke-width="1.5" fill="none"/>
  <path d="M340,160 Q454,197 568,180" stroke="rgba(16,36,62,.92)" stroke-width="1.5" fill="none"/>
</svg>`;

function startPoleAnimation(canvas: HTMLCanvasElement): () => void {
    const g = canvas.getContext("2d")!;
    canvas.width = 680;
    canvas.height = 340;

    const P = [{ x: 112, wy: 180 }, { x: 340, wy: 160 }, { x: 568, wy: 180 }];

    function wMid(x1: number, y1: number, x2: number, y2: number) {
        return { x: (x1 + x2) / 2, y: Math.max(y1, y2) + Math.abs(x2 - x1) * 0.072 };
    }

    function drawBall(x: number, y: number) {
        g.save();
        ([
            [24, "rgba(18,85,215,.05)"], [15, "rgba(45,132,255,.11)"],
            [9, "rgba(92,170,255,.22)"], [5, "rgba(150,206,255,.46)"],
            [2.8, "rgba(210,237,255,.76)"], [1.3, "rgba(248,253,255,.97)"],
        ] as [number, string][]).forEach(([r, col]) => {
            g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = col; g.fill();
        });
        for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2 + Math.random() * 0.9;
            const len = 5 + Math.random() * 12;
            let tx = x, ty = y;
            g.beginPath(); g.moveTo(tx, ty);
            for (let j = 0; j < 3; j++) {
                const a = ang + (Math.random() - 0.5) * 1.5;
                tx += Math.cos(a) * len / 3 + (Math.random() - 0.5) * 4;
                ty += Math.sin(a) * len / 3 + (Math.random() - 0.5) * 4;
                g.lineTo(tx, ty);
            }
            g.strokeStyle = `rgba(130,200,255,${0.15 + Math.random() * 0.4})`;
            g.lineWidth = 0.65; g.stroke();
        }
        g.restore();
    }

    function drawGlow(x: number, y: number, a: number) {
        g.save();
        g.beginPath(); g.arc(x, y, 34 + 20 * a, 0, Math.PI * 2);
        g.fillStyle = `rgba(48,128,255,${a * 0.09})`; g.fill();
        g.beginPath(); g.arc(x, y, 15 * a, 0, Math.PI * 2);
        g.fillStyle = `rgba(108,182,255,${a * 0.26})`; g.fill();
        g.restore();
    }

    const SEQ = [0, 1, 2, 1];
    let si = 0, traveling = false, tT = 0, pT = 0;
    const PAUSE = 16, TRAVEL = 32;
    const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const glow = [1, 0, 0];
    const trail: { x: number; y: number }[] = [];
    const TLEN = 12;
    const sparks: { x: number; y: number; vx: number; vy: number; life: number; d: number }[] = [];

    function burst(x: number, y: number) {
        for (let i = 0; i < 14; i++) {
            const a = Math.random() * Math.PI * 2, s = 0.8 + Math.random() * 3.4;
            sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.95, life: 1, d: 0.06 + Math.random() * 0.05 });
        }
    }

    function getPos() {
        if (!traveling) return { x: P[SEQ[si]].x, y: P[SEQ[si]].wy };
        const a = P[SEQ[si]], b = P[SEQ[(si + 1) % SEQ.length]], c = wMid(a.x, a.wy, b.x, b.wy);
        const t = ease(tT), u = 1 - t;
        return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.wy + 2 * u * t * c.y + t * t * b.wy };
    }

    function update() {
        if (!traveling) {
            const here = SEQ[si];
            if (here === 1) {
                traveling = true; tT = 0; pT = 0;
                for (let i = 0; i < 3; i++) glow[i] = Math.max(0, glow[i] - 0.05);
            } else {
                pT++;
                glow[here] = Math.max(0, 1 - pT / PAUSE);
                for (let i = 0; i < 3; i++) if (i !== here) glow[i] = Math.max(0, glow[i] - 0.05);
                if (pT >= PAUSE) { pT = 0; traveling = true; tT = 0; }
            }
        } else {
            tT = Math.min(1, tT + 1 / TRAVEL);
            for (let i = 0; i < 3; i++) glow[i] = Math.max(0, glow[i] - 0.028);
            if (tT >= 1) {
                traveling = false; si = (si + 1) % SEQ.length; pT = 0;
                const here = SEQ[si];
                if (here !== 1) { burst(P[here].x, P[here].wy); glow[here] = 1; }
            }
        }
    }

    let running = true;

    function frame() {
        if (!running) return;
        g.clearRect(0, 0, 680, 340);
        P.forEach((p, i) => { if (glow[i] > 0.01) drawGlow(p.x, p.wy, glow[i]); });
        const pos = getPos();
        trail.push({ ...pos });
        if (trail.length > TLEN) trail.shift();
        if (trail.length > 1) {
            g.save(); g.lineCap = "round"; g.lineJoin = "round";
            const t0 = trail[0], t1 = trail[trail.length - 1];
            ([
                [10, 0.13, "38,118,255"], [5, 0.28, "80,155,255"],
                [2, 0.6, "160,210,255"], [0.8, 0.9, "220,240,255"],
            ] as [number, number, string][]).forEach(([lw, maxA, rgb]) => {
                const gr = g.createLinearGradient(t0.x, t0.y, t1.x, t1.y);
                gr.addColorStop(0, `rgba(${rgb},0)`);
                gr.addColorStop(1, `rgba(${rgb},${maxA})`);
                g.beginPath();
                g.moveTo(trail[0].x, trail[0].y);
                for (let i = 1; i < trail.length; i++) g.lineTo(trail[i].x, trail[i].y);
                g.strokeStyle = gr; g.lineWidth = lw; g.stroke();
            });
            g.restore();
        }
        drawBall(pos.x, pos.y);
        for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i];
            s.x += s.vx; s.y += s.vy; s.vy += 0.12; s.life -= s.d;
            if (s.life <= 0) { sparks.splice(i, 1); continue; }
            g.beginPath(); g.arc(s.x, s.y, 2.2 * s.life, 0, Math.PI * 2);
            g.fillStyle = `rgba(145,206,255,${s.life * 0.9})`; g.fill();
        }
        update();
        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
    return () => { running = false; };
}

function showSplash(): () => void {
    const game = SHOWCASE_GAMES[Math.floor(Math.random() * SHOWCASE_GAMES.length)];

    const splash = document.createElement("div");
    splash.id = "splash";
    splash.innerHTML = `
        <div class="splash-bg" id="splashBg" style="background-image:url('${heroUrl(game.appId)}')"></div>
        <div class="splash-anim" id="splashAnim">
            <div class="splash-anim-box">
                ${POLE_SVG}
                <canvas id="splashCanvas"></canvas>
            </div>
            <div class="splash-game-name" id="splashGameName">${game.name}</div>
        </div>
    `;
    document.body.appendChild(splash);

    preloadImage(heroUrl(game.appId)).then(() => {
        document.getElementById("splashBg")?.classList.add("loaded");
        document.getElementById("splashGameName")?.classList.add("loaded");
    });

    const canvas = splash.querySelector<HTMLCanvasElement>("#splashCanvas")!;
    return startPoleAnimation(canvas);
}

async function dismissSplash(stopAnim: () => void) {
    const splash = document.getElementById("splash");
    if (!splash) return;
    splash.classList.add("splash-exiting");
    await new Promise<void>(r => setTimeout(r, 500));
    stopAnim();
    splash.remove();
}

async function dismissSplashToPicker(stopAnim: () => void) {
    document.getElementById("splashAnim")?.classList.add("splash-anim-hiding");
    document.getElementById("splashBg")?.classList.add("splash-bg-blurring");
    await new Promise<void>(r => setTimeout(r, 450));
    const splash = document.getElementById("splash");
    if (!splash) return;
    splash.classList.add("splash-exiting");
    await new Promise<void>(r => setTimeout(r, 600));
    stopAnim();
    splash.remove();
}

function navigateTo(renderFn: () => Promise<void> | void) {
    const app = document.querySelector<HTMLDivElement>("#app")!;

    app.addEventListener(
        "transitionend",
        async () => {
            try {
                await renderFn();
            } catch (err) {
                console.error("[relay] navigation error:", err);
            }
            void app.offsetWidth;
            app.classList.remove("page-exit");
        },
        { once: true }
    );

    app.classList.add("page-exit");
}

const KB_VARIANTS = ["kb-1", "kb-2", "kb-3", "kb-4"] as const;

function activateBg(index: number) {
    const el = document.getElementById(`bg${index}`)!;
    el.classList.remove(...KB_VARIANTS);
    void el.offsetWidth;
    el.classList.add(KB_VARIANTS[Math.floor(Math.random() * KB_VARIANTS.length)]);
    el.classList.add("active");
}

function deactivateBg(index: number) {
    document.getElementById(`bg${index}`)?.classList.remove("active");
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "";
    const gb = bytes / 1_073_741_824;
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1_048_576).toFixed(0)} MB`;
}

function formatRelativeTime(iso: string): string {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function connectHostWebSocket(hostId: string) {
    if (hostWsInstance?.readyState === WebSocket.OPEN ||
        hostWsInstance?.readyState === WebSocket.CONNECTING) return;

    hostWsInstance = new WebSocket("wss://relayapi.sahildash.dev/ws");
    hostWsInstance.onopen = () => {
        hostWsInstance!.send(JSON.stringify({ type: "register", id: hostId, role: "host" }));
    };
    hostWsInstance.onmessage = async (event) => {
        const msg = JSON.parse(event.data as string);

        if (msg.type === "device-joined" || msg.type === "device-left" || msg.type === "device-renamed") {
            onDeviceEvent?.(msg as DeviceEvent);
            return;
        }

        if (msg.type === "connect-request") {
            console.log("[relay] received connect-request, launching game on host...");

            await relay.launchGame(msg.payload);

            await new Promise(r => setTimeout(r, 6000));

            await startHostStreaming(msg.from, msg.payload);
            return;
        }

        if (msg.type === "answer" && hostPeerConnection) {
            console.log("[relay] received answer from client");
            await hostPeerConnection.setRemoteDescription(new RTCSessionDescription(msg.payload));
            return;
        }

        if (msg.type === "ice-candidate" && hostPeerConnection && msg.payload) {
            await hostPeerConnection.addIceCandidate(new RTCIceCandidate(msg.payload)).catch(console.error);
            return;
        }

        if (msg.type === "stream-ended") {
            hostPeerConnection?.close();
            hostPeerConnection = null;
            if ((window as any).__stopNativeCapture) {
                (window as any).__stopNativeCapture();
                (window as any).__stopNativeCapture = null;
            }
            console.log("[relay] stream ended by client");
            return;
        }
    };
    hostWsInstance.onclose = () => setTimeout(() => connectHostWebSocket(hostId), 3000);
}

function connectClientWebSocket() {
    if (clientWsInstance?.readyState === WebSocket.OPEN ||
        clientWsInstance?.readyState === WebSocket.CONNECTING) return;

    clientWsInstance = new WebSocket("wss://relayapi.sahildash.dev/ws");
    clientWsInstance.onopen = () => {
        clientWsInstance!.send(JSON.stringify({
            type: "register",
            id: clientId,
            role: "client",
            hostId: clientHostId,
            displayName: clientDisplayName,
        }));
    };
    clientWsInstance.onmessage = async (event) => {
        const msg = JSON.parse(event.data as string);

        function closeSettingsIfOpen() {
            const settingsOverlay = document.querySelector<HTMLElement>(".settings-overlay");
            if (settingsOverlay) {
                settingsOverlay.classList.remove("settings-open");
                setTimeout(() => settingsOverlay.remove(), 300);
            }
        }

        if (msg.type === "revoked") {
            closeSettingsIfOpen();
            clientHostId = ""; clientHostCode = "";
            relay.saveClientConfig({ clientId, hostId: "", hostCode: "", displayName: clientDisplayName });
            clientWsInstance?.close();
            clientWsInstance = null;
            navigateTo(() => renderClientCodeEntry("revoked"));
        } else if (msg.type === "code-changed") {
            closeSettingsIfOpen();
            clientHostId = ""; clientHostCode = "";
            relay.saveClientConfig({ clientId, hostId: "", hostCode: "", displayName: clientDisplayName });
            clientWsInstance?.close();
            clientWsInstance = null;
            navigateTo(() => renderClientCodeEntry("code-changed"));
        } else if (msg.type === "name-updated") {
            clientDisplayName = msg.name;
            relay.saveClientConfig({
                clientId, hostId: clientHostId,
                hostCode: clientHostCode.replace(/\s/g, ""), displayName: msg.name,
            });
            const nameInput = document.getElementById("deviceNameInput") as HTMLInputElement | null;
            if (nameInput) nameInput.value = msg.name;
        } else if (msg.type === "offer") {
            await handleClientOffer(msg.from, msg.payload);
            return;
        }

        else if (msg.type === "ice-candidate" && clientPeerConnection && msg.payload) {
            await clientPeerConnection.addIceCandidate(new RTCIceCandidate(msg.payload)).catch(console.error);
            return;
        }

        else if (msg.type === "session-busy") {
            const playBtn = document.getElementById("playBtn") as HTMLButtonElement | null;
            if (playBtn) {
                playBtn.disabled = false;
                playBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 10.268C20.333 11.038 20.333 12.962 19 13.732L10 18.928C8.667 19.698 7 18.736 7 17.196L7 6.804C7 5.264 8.667 4.302 10 5.072L19 10.268Z"/>
        </svg> Play`;
            }
            alert("Host is already streaming to another device.");
            return;
        }

        else if (msg.type === "stream-ended") {
            closeStreamOverlay();
            return;
        }
    };
    clientWsInstance.onclose = () => {
        if (clientHostId) setTimeout(connectClientWebSocket, 3000);
    };
}

async function startHostStreaming(toClientId: string, payload: any) {
    console.log("[relay] starting stream to", toClientId);
    hostPeerConnection?.close();

    try {
        let stream: MediaStream;

        const sources = await relay.getDesktopSources() as Array<{ id: string; name: string }>;

        let targetSource = sources.find(s =>
            payload?.name && s.name.toLowerCase().includes(payload.name.toLowerCase())
        );

        if (!targetSource) {
            console.log("[relay] Game window not found, falling back to screen");
            targetSource = sources.find(s => s.id.startsWith("screen:")) ?? sources[0];
        } else {
            console.log("[relay] Found game window:", targetSource.name);
        }

        if (!targetSource) { console.error("[relay] no capture source"); return; }

        stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                mandatory: {
                    chromeMediaSource: "desktop",
                    chromeMediaSourceId: targetSource.id,
                    maxWidth: 1920,
                    maxHeight: 1080,
                    maxFrameRate: 30,
                },
            } as any,
        });

        hostPeerConnection = new RTCPeerConnection(RTC_CONFIG);
        stream.getTracks().forEach(t => {
            const sender = hostPeerConnection!.addTrack(t, stream);

            const params = sender.getParameters();
            if (!params.encodings) {
                params.encodings = [{}];
            }
            params.encodings[0].maxBitrate = 8000000;
            params.encodings[0].scaleResolutionDownBy = 1.0;
            sender.setParameters(params);
        });

        hostPeerConnection.onicecandidate = (e) => {
            if (e.candidate && hostWsInstance?.readyState === WebSocket.OPEN) {
                hostWsInstance.send(JSON.stringify({
                    type: "ice-candidate", target: toClientId, payload: e.candidate,
                }));
            }
        };

        const offer = await hostPeerConnection.createOffer();
        await hostPeerConnection.setLocalDescription(offer);
        hostWsInstance?.send(JSON.stringify({ type: "offer", target: toClientId, payload: offer }));

        console.log("[relay] offer sent to", toClientId);
    } catch (err) {
        console.error("[relay] host stream failed:", err);
    }
}

async function handleClientOffer(fromHostId: string, offer: RTCSessionDescriptionInit) {
    console.log("[relay] received offer, creating answer");
    clientPeerConnection?.close();
    clientPeerConnection = new RTCPeerConnection(RTC_CONFIG);

    clientPeerConnection.oniceconnectionstatechange = () => {
        console.log("[relay] client ICE connection state:", clientPeerConnection?.iceConnectionState);
    };

    clientPeerConnection.ontrack = (e) => {
        console.log("[relay] stream track received. Track enabled:", e.track.enabled, "Track muted:", e.track.muted);
        showStreamOverlay(e.streams[0], fromHostId);
    };

    clientPeerConnection.onicecandidate = (e) => {
        console.log("[relay] client generated ICE candidate:", e.candidate?.candidate);
        if (e.candidate && clientWsInstance?.readyState === WebSocket.OPEN) {
            clientWsInstance.send(JSON.stringify({
                type: "ice-candidate", target: clientHostId, payload: e.candidate,
            }));
        }
    };

    await clientPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await clientPeerConnection.createAnswer();
    await clientPeerConnection.setLocalDescription(answer);

    clientWsInstance?.send(JSON.stringify({
        type: "answer", target: clientHostId, payload: answer,
    }));

    console.log("[relay] answer sent");
}

function showStreamOverlay(stream: MediaStream, hostId: string) {
    closeStreamOverlay();

    const overlay = document.createElement("div");
    overlay.id = "streamOverlay";

    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.backgroundColor = "#000";
    overlay.style.zIndex = "99999";

    overlay.innerHTML = `
        <video id="streamVideo" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; background: #000;"></video>
        <div class="stream-hud" style="position: absolute; top: 20px; right: 20px;">
            <button class="stream-stop-btn" id="streamStopBtn">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                Stop streaming
            </button>
        </div>
    `;
    document.body.appendChild(overlay);
    activeStreamOverlay = overlay;

    const video = document.getElementById("streamVideo") as HTMLVideoElement;
    video.srcObject = stream;
    video.onloadedmetadata = () => {
        console.log("[relay] video metadata loaded, attempting play...");
        video.play().then(() => {
            console.log("[relay] video is playing!");
        }).catch(e => console.error("[relay] video play failed:", e));
    };

    const stop = () => {
        clientWsInstance?.send(JSON.stringify({
            type: "stream-ended", target: hostId, payload: null,
        }));
        closeStreamOverlay();
        clientPeerConnection?.close();
        clientPeerConnection = null;

        const playBtn = document.getElementById("playBtn") as HTMLButtonElement | null;
        if (playBtn) {
            playBtn.disabled = false;
            playBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 10.268C20.333 11.038 20.333 12.962 19 13.732L10 18.928C8.667 19.698 7 18.736 7 17.196L7 6.804C7 5.264 8.667 4.302 10 5.072L19 10.268Z"/>
            </svg> Play`;
        }
    };

    document.getElementById("streamStopBtn")!.addEventListener("click", stop);
}

function closeStreamOverlay() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
    activeStreamOverlay?.remove();
    activeStreamOverlay = null;
}

function attachDeviceRowHandlers(row: HTMLElement) {
    const deviceId = row.dataset.id!;

    row.querySelector(".device-rename-btn")?.addEventListener("click", () => {
        const nameEl = row.querySelector<HTMLElement>(".device-name")!;
        const current = nameEl.dataset.name!;
        nameEl.innerHTML = `
            <input class="device-name-input" value="${current}" />
            <button class="device-save-btn">Save</button>
            <button class="device-cancel-btn">Cancel</button>
        `;
        const input = nameEl.querySelector<HTMLInputElement>(".device-name-input")!;
        input.focus(); input.select();
        nameEl.querySelector(".device-save-btn")!.addEventListener("click", async () => {
            const newName = input.value.trim();
            if (!newName) return;
            await relay.renameDevice(deviceId, newName);
            nameEl.dataset.name = newName;
            nameEl.textContent = newName;
            nameEl.dataset.name = newName;
        });
        nameEl.querySelector(".device-cancel-btn")!.addEventListener("click", () => {
            nameEl.textContent = current;
        });
        input.addEventListener("keydown", e => {
            if (e.key === "Enter") nameEl.querySelector<HTMLElement>(".device-save-btn")!.click();
            if (e.key === "Escape") nameEl.querySelector<HTMLElement>(".device-cancel-btn")!.click();
        });
    });

    const SVG_X = `<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;

    let revokePending = false;
    const revokeBtn = row.querySelector<HTMLElement>(".device-revoke-btn")!;

    revokeBtn.addEventListener("click", async () => {
        if (!revokePending) {
            revokePending = true;
            revokeBtn.innerHTML = `<span class="revoke-confirm-text">Remove?</span>`;
            revokeBtn.classList.add("device-revoke-pending");
            setTimeout(() => {
                if (revokePending) {
                    revokePending = false;
                    revokeBtn.innerHTML = SVG_X;
                    revokeBtn.classList.remove("device-revoke-pending");
                }
            }, 2500);
            return;
        }
        await relay.revokeDevice(deviceId);
        row.style.opacity = "0";
        row.style.transition = "opacity 0.25s ease";
        setTimeout(() => row.remove(), 260);
    });
}

async function openSettings() {
    const [devices, startupSettings, version] = await Promise.all([
        relay.getDevices() as Promise<Array<{
            id: string; display_name: string; last_seen: string | null; online: boolean;
        }>>,
        relay.getStartupSettings() as Promise<{ launchOnLogin: boolean; startMinimized: boolean }>,
        relay.getVersion() as Promise<string>,
    ]);

    function deviceRow(d: { id: string; display_name: string; last_seen: string | null; online: boolean }) {
        const lastSeen = d.last_seen ? `Last seen ${formatRelativeTime(d.last_seen)}` : "Never connected";
        return `
            <div class="settings-device" data-id="${d.id}">
                <div class="device-status ${d.online ? "online" : ""}"></div>
                <div class="device-info">
                    <div class="device-name" data-name="${d.display_name}">${d.display_name}</div>
                    <div class="device-last-seen">${lastSeen}</div>
                </div>
                <div class="device-actions">
                    <button class="device-btn device-rename-btn" title="Rename">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button class="device-btn device-revoke-btn" title="Revoke access">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </div>`;
    }

    const overlay = document.createElement("div");
    overlay.className = "settings-overlay";
    overlay.innerHTML = `
        <div class="settings-backdrop"></div>
        <div class="settings-drawer">
            <div class="settings-header">
                <span class="settings-title">Settings</span>
                <button class="settings-close" id="settingsClose">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <div class="settings-body">
                <div class="settings-section">
                    <div class="settings-section-title">Library</div>
                    <div class="settings-code-row">
                        <div class="settings-code-display" id="settingsCodeDisplay">${libraryCode}</div>
                        <button class="settings-btn-small" id="copyCodeBtn">Copy</button>
                    </div>
                    <button class="settings-btn-small settings-btn-danger settings-regen-btn" id="regenCodeBtn">Regenerate code</button>
                    <div class="settings-hint" style="margin-top: 8px">Share this code with devices you want to grant access</div>
                </div>
                <div class="settings-section">
                    <div class="settings-section-title">Connected Devices</div>
                    <div class="settings-devices-list">
                        ${devices.length === 0
            ? `<div class="settings-empty">No devices have connected yet</div>`
            : devices.map(deviceRow).join("")}
                    </div>
                </div>
                <div class="settings-section">
                    <div class="settings-section-title">On Startup</div>
                    <div class="settings-toggle-row">
                        <div>
                            <div class="settings-toggle-label">Launch on login</div>
                            <div class="settings-toggle-sub">Start Relay automatically when you log in</div>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" id="launchOnLoginToggle" ${startupSettings.launchOnLogin ? "checked" : ""}>
                            <span class="toggle-track"></span>
                        </label>
                    </div>
                    <div class="settings-toggle-row">
                        <div>
                            <div class="settings-toggle-label">Start minimized</div>
                            <div class="settings-toggle-sub">Open to system tray instead of foreground</div>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" id="startMinimizedToggle" ${startupSettings.startMinimized ? "checked" : ""}>
                            <span class="toggle-track"></span>
                        </label>
                    </div>
                </div>
                <div class="settings-section">
                    <div class="settings-section-title">Mode</div>
                    <div class="settings-toggle-row">
                        <div>
                            <div class="settings-toggle-label">Currently: Host</div>
                            <div class="settings-toggle-sub">This PC is sharing its game library</div>
                        </div>
                        <button class="settings-btn-small" id="switchModeBtn">Switch to Client</button>
                    </div>
                </div>
            </div>
            <div class="settings-footer">
                <span class="settings-version">Relay v${version}</span>
            </div>
        </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("settings-open")));

    function close() {
        onDeviceEvent = null;
        overlay.classList.remove("settings-open");
        setTimeout(() => overlay.remove(), 300);
    }

    overlay.querySelector(".settings-backdrop")!.addEventListener("click", close);
    document.getElementById("settingsClose")!.addEventListener("click", close);

    document.getElementById("copyCodeBtn")!.addEventListener("click", () => {
        navigator.clipboard.writeText(libraryCode.replace(/\s/g, ""));
        const btn = document.getElementById("copyCodeBtn")!;
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = "Copy"; }, 1500);
    });

    let regenPending = false;
    document.getElementById("regenCodeBtn")!.addEventListener("click", async () => {
        const btn = document.getElementById("regenCodeBtn") as HTMLButtonElement;
        if (!regenPending) {
            regenPending = true;
            btn.textContent = "Are you sure?";
            setTimeout(() => { if (regenPending) { regenPending = false; btn.textContent = "Regenerate code"; } }, 3000);
            return;
        }
        btn.disabled = true; btn.textContent = "Regenerating...";
        const newCode = await relay.regenerateCode();
        if (newCode) {
            libraryCode = newCode.match(/.{1,4}/g)?.join(" ") ?? newCode;
            document.getElementById("settingsCodeDisplay")!.textContent = libraryCode;
            document.querySelectorAll<HTMLElement>(".code-value").forEach(el => { el.textContent = libraryCode; });
        }
        regenPending = false; btn.disabled = false; btn.textContent = "Regenerate code";
    });

    document.getElementById("launchOnLoginToggle")!.addEventListener("change", e => {
        relay.setStartupSettings({ launchOnLogin: (e.target as HTMLInputElement).checked });
    });
    document.getElementById("startMinimizedToggle")!.addEventListener("change", e => {
        relay.setStartupSettings({ startMinimized: (e.target as HTMLInputElement).checked });
    });

    document.getElementById("switchModeBtn")!.addEventListener("click", async () => {
        hostWsInstance?.close(); hostWsInstance = null;
        libraryGames = []; libraryCode = "";
        close();
        await relay.setMode("client");
        await relay.saveGames([]);
        currentMode = "client";
        navigateTo(renderClientCodeEntry);
    });

    overlay.querySelectorAll<HTMLElement>(".settings-device").forEach(row => attachDeviceRowHandlers(row));

    const devicesList = overlay.querySelector<HTMLElement>(".settings-devices-list")!;
    onDeviceEvent = (event) => {
        if (event.type === "device-joined") {
            const empty = devicesList.querySelector(".settings-empty");
            if (empty) empty.remove();
            if (devicesList.querySelector(`[data-id="${event.device.id}"]`)) return;
            const tmp = document.createElement("div");
            tmp.innerHTML = deviceRow(event.device);
            const newRow = tmp.firstElementChild as HTMLElement;
            devicesList.appendChild(newRow);
            attachDeviceRowHandlers(newRow);
        } else if (event.type === "device-left") {
            const row = devicesList.querySelector<HTMLElement>(`[data-id="${event.deviceId}"]`);
            if (row) {
                row.querySelector(".device-status")?.classList.remove("online");
                const lastSeenEl = row.querySelector<HTMLElement>(".device-last-seen");
                if (lastSeenEl) lastSeenEl.textContent = "Just disconnected";
            }
        } else if (event.type === "device-renamed") {
            const row = devicesList.querySelector<HTMLElement>(`[data-id="${event.deviceId}"]`);
            if (row) {
                const nameEl = row.querySelector<HTMLElement>(".device-name");
                if (nameEl && !nameEl.querySelector("input")) {
                    nameEl.textContent = event.name;
                    nameEl.dataset.name = event.name;
                }
            }
        }
    };
}

async function openClientSettings() {
    const [startupSettings, version] = await Promise.all([
        relay.getStartupSettings() as Promise<{ launchOnLogin: boolean; startMinimized: boolean }>,
        relay.getVersion() as Promise<string>,
    ]);

    const overlay = document.createElement("div");
    overlay.className = "settings-overlay";
    overlay.innerHTML = `
        <div class="settings-backdrop"></div>
        <div class="settings-drawer">
            <div class="settings-header">
                <span class="settings-title">Settings</span>
                <button class="settings-close" id="settingsClose">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <div class="settings-body">
                <div class="settings-section">
                    <div class="settings-section-title">This Device</div>
                    <div class="settings-toggle-label" style="margin-bottom: 6px">Display Name</div>
                    <div class="settings-toggle-sub" style="margin-bottom: 10px">How this device appears to the host</div>
                    <div class="settings-name-edit">
                        <input class="device-name-input settings-name-input" id="deviceNameInput" value="${clientDisplayName}" />
                        <button class="settings-btn-small" id="saveNameBtn">Save</button>
                    </div>
                </div>
                <div class="settings-section">
                    <div class="settings-section-title">Library</div>
                    <div class="settings-toggle-row" style="margin-bottom: 12px">
                        <div>
                            <div class="settings-toggle-label">Connected to</div>
                            <div class="settings-toggle-sub">Host library code</div>
                        </div>
                        <span class="code-value" style="font-size: 14px">${clientHostCode}</span>
                    </div>
                    <button class="settings-btn-small settings-btn-danger settings-regen-btn" id="leaveLibraryBtn">Leave library</button>
                    <div class="settings-hint" style="margin-top: 8px">You'll need to enter a new code to reconnect</div>
                </div>
                <div class="settings-section">
                    <div class="settings-section-title">On Startup</div>
                    <div class="settings-toggle-row">
                        <div>
                            <div class="settings-toggle-label">Launch on login</div>
                            <div class="settings-toggle-sub">Start Relay automatically when you log in</div>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" id="launchOnLoginToggle" ${startupSettings.launchOnLogin ? "checked" : ""}>
                            <span class="toggle-track"></span>
                        </label>
                    </div>
                    <div class="settings-toggle-row">
                        <div>
                            <div class="settings-toggle-label">Start minimized</div>
                            <div class="settings-toggle-sub">Open to system tray instead of foreground</div>
                        </div>
                        <label class="toggle">
                            <input type="checkbox" id="startMinimizedToggle" ${startupSettings.startMinimized ? "checked" : ""}>
                            <span class="toggle-track"></span>
                        </label>
                    </div>
                </div>
                <div class="settings-section">
                    <div class="settings-section-title">Mode</div>
                    <div class="settings-toggle-row">
                        <div>
                            <div class="settings-toggle-label">Currently: Client</div>
                            <div class="settings-toggle-sub">Playing games from a remote library</div>
                        </div>
                        <button class="settings-btn-small" id="switchModeBtn">Switch to Host</button>
                    </div>
                </div>
            </div>
            <div class="settings-footer">
                <span class="settings-version">Relay v${version}</span>
            </div>
        </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("settings-open")));

    function close() {
        overlay.classList.remove("settings-open");
        setTimeout(() => overlay.remove(), 300);
    }

    overlay.querySelector(".settings-backdrop")!.addEventListener("click", close);
    document.getElementById("settingsClose")!.addEventListener("click", close);

    document.getElementById("saveNameBtn")!.addEventListener("click", async () => {
        const input = document.getElementById("deviceNameInput") as HTMLInputElement;
        const newName = input.value.trim();
        if (!newName || newName === clientDisplayName) return;
        const btn = document.getElementById("saveNameBtn") as HTMLButtonElement;
        btn.disabled = true; btn.textContent = "Saving...";
        clientDisplayName = newName;
        await relay.saveClientConfig({ clientId, hostId: clientHostId, hostCode: clientHostCode.replace(/\s/g, ""), displayName: newName });
        await relay.renameDevice(clientId, newName);
        btn.disabled = false; btn.textContent = "Saved!";
        setTimeout(() => { btn.textContent = "Save"; }, 1500);
    });

    let leavePending = false;
    document.getElementById("leaveLibraryBtn")!.addEventListener("click", async () => {
        const btn = document.getElementById("leaveLibraryBtn") as HTMLButtonElement;
        if (!leavePending) {
            leavePending = true;
            btn.textContent = "Are you sure?";
            setTimeout(() => { if (leavePending) { leavePending = false; btn.textContent = "Leave library"; } }, 3000);
            return;
        }
        clientId = ""; clientHostId = ""; clientHostCode = ""; clientDisplayName = "";
        clientWsInstance?.close(); clientWsInstance = null;
        await relay.saveClientConfig({ clientId: "", hostId: "", hostCode: "", displayName: "" });
        close();
        navigateTo(renderClientCodeEntry);
    });

    document.getElementById("launchOnLoginToggle")!.addEventListener("change", e => {
        relay.setStartupSettings({ launchOnLogin: (e.target as HTMLInputElement).checked });
    });
    document.getElementById("startMinimizedToggle")!.addEventListener("change", e => {
        relay.setStartupSettings({ startMinimized: (e.target as HTMLInputElement).checked });
    });

    document.getElementById("switchModeBtn")!.addEventListener("click", async () => {
        clientWsInstance?.close(); clientWsInstance = null;
        clientId = ""; clientHostId = ""; clientHostCode = ""; clientDisplayName = "";
        libraryGames = []; libraryCode = "";
        close();
        await relay.setMode("host");
        await relay.saveGames([]);
        await relay.saveClientConfig({ clientId: "", hostId: "", hostCode: "", displayName: "" });
        currentMode = "host";
        navigateTo(renderHost);
    });
}

function attachQuitHandler() {
    document.getElementById("quitBtn")?.addEventListener("click", () => {
        relay.quitApp();
    });
}

function attachSettingsHandler() {
    document.getElementById("settingsBtn")?.addEventListener("click",
        currentMode === "client" ? openClientSettings : openSettings
    );
}

function attachScanHandler() {
    const btn = document.getElementById("scanBtn") as HTMLButtonElement | null;
    if (!btn) return;

    btn.onclick = async () => {
        const content = document.querySelector<HTMLDivElement>(".host-content")!;

        btn.disabled = true;
        btn.textContent = "Scanning...";

        content.innerHTML = `
      <div class="scan-anim-wrap" id="scanAnimWrap">
        <div class="splash-anim-box">
          ${POLE_SVG}
          <canvas id="scanCanvas"></canvas>
        </div>
        <div class="scan-anim-label" id="scanAnimLabel">Scanning for games...</div>
      </div>
    `;

        const wrap = document.getElementById("scanAnimWrap")!;
        const canvas = content.querySelector<HTMLCanvasElement>("#scanCanvas")!;
        const stopAnim = startPoleAnimation(canvas);

        requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add("scan-visible")));

        const games = await relay.scanGames() as Array<{ appId: string; name: string; sizeOnDisk: number; source: string }>;

        if (games.length === 0) {
            wrap.classList.remove("scan-visible");
            await new Promise<void>(r => setTimeout(r, 350));
            stopAnim();

            content.innerHTML = `
        <div class="scan-results" id="scanResults">
          <div class="empty-state">
            <div class="empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8m-4-4v4"/>
              </svg>
            </div>
            <h2>No games found</h2>
            <p>Relay couldn't find any installed Steam games on this PC.</p>
            <button class="scan-btn" id="scanBtn">Try again</button>
          </div>
        </div>
      `;
            const results = document.getElementById("scanResults")!;
            requestAnimationFrame(() => requestAnimationFrame(() => results.classList.add("scan-visible")));
            attachScanHandler();
            return;
        }

        const urls: string[] = [];
        games.forEach((g, i) => {
            urls.push(portraitUrl(g.appId));
            if (i < 8) {
                urls.push(heroUrl(g.appId));
                urls.push(capsuleUrl(g.appId));
            }
        });

        await Promise.all([
            Promise.all(
                urls.map(url =>
                    preloadImage(url)
                )
            ),
            new Promise<void>(r => setTimeout(r, 2000)),
        ]);

        wrap.classList.remove("scan-visible");
        await new Promise<void>(r => setTimeout(r, 350));
        stopAnim();

        libraryGames = games.filter(g =>
            !g.name.toLowerCase().includes("steamworks common redistributables")
        ).map(g => ({
            lastPlayed: "N/A",
            platform: "Steam",
            installDir: "",
            executablePath: "",
            launchConfig: { type: "steam" as const },
            ...g,
        }));

        await relay.saveGames(libraryGames);
        const app = document.querySelector<HTMLDivElement>("#app")!;
        app.classList.add("page-exit");
        await new Promise<void>(r => setTimeout(r, 350));
        renderHostHome();
        void app.offsetWidth;
        app.classList.remove("page-exit");
    };
}

async function rescanLibrary(): Promise<boolean> {
    const fresh = await relay.scanGames() as Array<{
        appId: string; name: string; sizeOnDisk: number; source: string;
    }>;
    if (fresh.length === 0) return false;

    const existingIds = new Set(libraryGames.map(g => g.appId));
    const freshIds = new Set(fresh.map(g => g.appId));

    const changed =
        fresh.length !== libraryGames.length ||
        fresh.some(g => !existingIds.has(g.appId)) ||
        libraryGames.some(g => !freshIds.has(g.appId));

    if (changed) {
        libraryGames = fresh.filter(g =>
            !g.name.toLowerCase().includes("steamworks common redistributables")
        ).map(g => ({
            lastPlayed: "N/A",
            platform: "Steam",
            installDir: "",
            executablePath: "",
            launchConfig: { type: "steam" as const },
            ...g,
        }));
        await relay.saveGames(libraryGames);
    }
    return changed;
}

async function init() {
    const stopAnim = showSplash();

    const [[mode, savedGames]] = await Promise.all([
        Promise.all([
            relay.getMode() as Promise<string | null>,
            relay.getSavedGames() as Promise<LibraryGame[] | null>,
        ]),
        new Promise<void>(r => setTimeout(r, 5000)),
    ]);

    currentMode = (mode as "host" | "client" | null);

    if (mode === "host" && savedGames?.length) {
        libraryGames = (savedGames as any[]).filter(g =>
            !g.name.toLowerCase().includes("steamworks common redistributables")
        ).map(g => ({
            lastPlayed: "N/A",
            platform: "Steam",
            installDir: "",
            executablePath: "",
            launchConfig: { type: "steam" as const },
            ...g,
        }));

        const config = await relay.getHostConfig();
        if (config) {
            libraryCode = config.code.match(/.{1,4}/g)?.join(" ") ?? config.code;
            connectHostWebSocket(config.hostId);
            relay.pushLibrary();
        }
        const urls: string[] = [];
        savedGames.forEach((g, i) => {
            urls.push(portraitUrl(g.appId));
            if (i < 8) { urls.push(heroUrl(g.appId)); urls.push(capsuleUrl(g.appId)); }
        });
        const appEl = document.querySelector<HTMLDivElement>("#app")!;
        appEl.classList.add("page-exit");
        await Promise.all([Promise.all(urls.map(preloadImage)), dismissSplash(stopAnim)]);
        renderHostHome();
        void appEl.offsetWidth;
        appEl.classList.remove("page-exit");
        rescanLibrary().then(changed => { if (changed) renderHostHome(); });
        return;
    }

    if (mode === "host") {
        const appEl = document.querySelector<HTMLDivElement>("#app")!;
        appEl.classList.add("page-exit");
        await dismissSplash(stopAnim);
        await renderHost();
        void appEl.offsetWidth;
        appEl.classList.remove("page-exit");
        return;
    }

    if (mode === "client") {
        const savedConfig = await relay.getClientConfig() as {
            clientId: string; hostId: string; hostCode: string; displayName: string;
        } | null;

        const appEl = document.querySelector<HTMLDivElement>("#app")!;
        appEl.classList.add("page-exit");
        await dismissSplash(stopAnim);

        if (savedConfig?.hostId && savedConfig.clientId) {
            clientId = savedConfig.clientId;
            clientHostId = savedConfig.hostId;
            clientHostCode = savedConfig.hostCode.match(/.{1,4}/g)?.join(" ") ?? savedConfig.hostCode;
            clientDisplayName = savedConfig.displayName;

            const library = await relay.getHostLibrary(clientHostId) as LibraryGame[] | null;
            if (library?.length) {
                libraryGames = library;
                const urls = library.slice(0, 8).flatMap(g => [portraitUrl(g.appId), heroUrl(g.appId), capsuleUrl(g.appId)]);
                await Promise.all(urls.map(preloadImage));
                renderClientHome();
                connectClientWebSocket();
            } else {
                renderClientCodeEntry("offline");
            }
        } else {
            renderClientCodeEntry();
        }

        void appEl.offsetWidth;
        appEl.classList.remove("page-exit");
        return;
    }

    renderPicker();
    await dismissSplashToPicker(stopAnim);
}

function preloadImage(url: string): Promise<void> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
    });
}

function renderPicker() {
    const bgLayers = SHOWCASE_GAMES.map((game, i) => `
        <div
            class="bg-layer"
            id="bg${i}"
            style="background-image: url('${heroUrl(game.appId)}')"
        ></div>
    `).join("");

    document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
        <div class="picker-wrap" id="pickerWrap">
            ${bgLayers}
            <div class="game-label" id="gameLabel"></div>
            <div class="glass-card">
                <div class="brand">
                    <div class="brand-rule"></div>
                    <div class="wordmark">Relay</div>
                    <div class="brand-rule"></div>
                </div>
                <div class="tagline">Your Games, Your Hardware, Anywhere</div>
                <div class="pick-cards">
                    <div class="pick-card" id="hostBtn">
                        <div class="pick-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                                <path d="M0 0h24v24H0z" fill="none"/>
                                <path fill="currentColor" d="M4 19q-.825 0-1.412-.587T2 17V5q0-.825.588-1.412T4 3h16q.825 0 1.413.588T22 5v12q0 .825-.587 1.413T20 19h-4v1q0 .425-.288.713T15 21H9q-.425 0-.712-.288T8 20v-1zm0-2h16V5H4zm0 0V5z"/>
                            </svg>
                        </div>
                        <strong>Host</strong>
                        <span>This PC has the games</span>
                    </div>
                    <div class="pick-card" id="clientBtn">
                        <div class="pick-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 14 14">
                                <path d="M0 0h14v14H0z" fill="none"/>
                                <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M4.4 7v2.31m1.156-1.154H3.245m-1.989-.963l-.412 3.71a2.283 2.283 0 0 0 4.311 1.272l.36-.718h2.97l.36.718a2.283 2.283 0 0 0 4.31-1.273l-.411-3.71a3 3 0 0 0-2.982-2.668H4.238a3 3 0 0 0-2.982 2.669"/>
                                    <path d="M7 4.524v-.98a1 1 0 0 1 1-1h1.466a1 1 0 0 0 1-1V.562m0 6.933a.248.248 0 0 1 0-.495m0 .495a.248.248 0 1 0 0-.495M8.733 8.733a.248.248 0 0 1 .495 0m-.495 0a.248.248 0 0 0 .495 0"/>
                                </g>
                            </svg>
                        </div>
                        <strong>Client</strong>
                        <span>I want to play remotely</span>
                    </div>
                </div>
                <div class="pick-hint">This choice will be saved. You can change it later in settings</div>
            </div>
        </div>
    `;

    const wrap = document.getElementById("pickerWrap")!;
    const label = document.getElementById("gameLabel")!;
    const order = [...SHOWCASE_GAMES.keys()].sort(() => Math.random() - 0.5);
    let current = 0;
    let orderIndex = 0;

    preloadImage(heroUrl(SHOWCASE_GAMES[order[0]].appId)).then(() => {
        activateBg(order[0]);
        current = order[0];
        label.textContent = SHOWCASE_GAMES[current].name;
        wrap.classList.add("visible");
        setTimeout(() => label.classList.add("active"), 800);
    });

    setInterval(() => {
        deactivateBg(current);
        label.classList.remove("active");

        orderIndex++;
        if (orderIndex >= order.length) {
            const lastPlayed = order[order.length - 1];
            order.splice(0, order.length, ...[...SHOWCASE_GAMES.keys()]
                .filter(i => i !== lastPlayed)
                .sort(() => Math.random() - 0.5));
            orderIndex = 0;
        }

        current = order[orderIndex];
        activateBg(current);

        setTimeout(() => {
            label.textContent = SHOWCASE_GAMES[current].name;
            label.classList.add("active");
        }, 600);
    }, 12000);

    document.getElementById("hostBtn")!.onclick = async () => {
        await relay.setMode("host");
        navigateTo(renderHost);
    };

    document.getElementById("clientBtn")!.onclick = async () => {
        await relay.setMode("client");
        currentMode = "client";
        navigateTo(renderClientCodeEntry);
    };
}

async function renderHost() {
    const existing = await relay.getHostConfig();
    const isFirstLaunch = !existing;
    const config = existing ?? await relay.registerHost();

    libraryCode = config.code.match(/.{1,4}/g)?.join(" ") ?? config.code;
    connectHostWebSocket(config.hostId);

    if (libraryGames.length > 0) {
        renderHostHome();
        return;
    }

    document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="host-wrap">
    <div class="hud-pill hud-left">
      <div class="wordmark-small">Relay</div>
    </div>
    <div class="hud-right-group">
        <div class="hud-pill">
            <span class="code-label">Library code</span>
            <span class="code-value">${libraryCode}</span>
        </div>
        <div class="hud-pill hud-settings" id="settingsBtn" data-tooltip="Settings">${SETTINGS_SVG}</div>
        <div class="hud-pill hud-quit" id="quitBtn" data-tooltip="Quit Relay">${POWER_SVG}</div>
    </div>
    <div class="host-content">
      <div class="empty-state">
        <div class="empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8m-4-4v4"/>
          </svg>
        </div>
        <h2>No games in your library</h2>
        <p>Relay hasn't scanned for games yet. This only takes a moment.</p>
        <button class="scan-btn" id="scanBtn">Scan for games</button>
      </div>
    </div>
  </div>

  ${isFirstLaunch ? `
  <div class="modal-overlay" id="codeModal">
    <div class="modal">
      <div class="modal-header">Your library code</div>
      <div class="modal-code">${libraryCode}</div>
      <p class="modal-desc">Enter this code on any other device in Client mode to access your games remotely.</p>
      <button class="scan-btn" id="modalDismiss">Got it</button>
    </div>
  </div>
  ` : ""}
`;

    if (isFirstLaunch) {
        document.getElementById("modalDismiss")!.onclick = () => {
            const modal = document.getElementById("codeModal")!;
            modal.classList.add("modal-exit");
            setTimeout(() => modal.remove(), 300);
        };
    }

    attachScanHandler();
    attachQuitHandler();
    attachSettingsHandler();
}

function renderHostHome() {
    const games = libraryGames;
    const recent = games.slice(0, 5);
    const collage = [
        games[0],
        games[Math.floor(games.length / 2)],
        games[games.length - 1],
    ].filter(Boolean);

    document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
    <div class="host-wrap">
      <div class="home-main">
        <div class="home-bg-layer" id="hbg0"></div>
        <div class="home-bg-layer" id="hbg1"></div>
        <div class="home-gradient"></div>
        <div class="hud-pill hud-left">
          <div class="wordmark-small">Relay</div>
        </div>
        <div class="hud-right-group">
  <div class="hud-pill">
    <span class="code-label">Library code</span>
    <span class="code-value">${libraryCode}</span>
  </div>
  <div class="hud-pill hud-rescan" id="rescanBtn" data-tooltip="Rescan games">${RESCAN_SVG}</div>
  <div class="hud-pill hud-settings" id="settingsBtn" data-tooltip="Settings">${SETTINGS_SVG}</div>
  <div class="hud-pill hud-quit" id="quitBtn" data-tooltip="Quit Relay">${POWER_SVG}</div>
</div>
        <div class="home-content">
          <div class="spotlight">
            <div class="spotlight-inner" id="spotInner">
              <div class="spot-genre" id="spotGenre">${recent[0]?.platform ?? ""}</div>
              <div class="spot-title" id="spotTitle">${recent[0]?.name ?? ""}</div>
              <div class="spot-meta">
                <span id="spotLastPlayed">Last played ${recent[0]?.lastPlayed ?? "N/A"}</span>
                ${recent[0]?.sizeOnDisk ? `<span class="spot-dot">·</span><span>${formatBytes(recent[0].sizeOnDisk)}</span>` : ""}
              </div>
            </div>
          </div>
          <div>
            <div class="section-header">
              <span class="section-label">Recently Played</span>
            </div>
            <div class="recent-row" id="recentRow">
              ${recent.map((g, i) => `
                <div class="game-item" data-idx="${i}">
                  <img class="art-portrait" src="${portraitUrl(g.appId)}" alt="${g.name}" onerror="this.remove()">
                  <img class="art-landscape" src="${capsuleUrl(g.appId)}" alt="" onerror="this.remove()">
                  <div class="game-item-overlay">
                    <div class="game-item-name">${g.name}</div>
                  </div>
                </div>
              `).join("")}
              <div class="game-item lib-card" id="libCard">
                <div class="lib-card-collage">
                  ${collage.map(g => `<img src="${portraitUrl(g.appId)}" alt="">`).join("")}
                  <div class="lib-card-collage-overlay"></div>
                </div>
                <div class="lib-card-body">
                  <svg class="lib-card-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                  <div class="lib-card-title">Library</div>
                  <div class="lib-card-sub">${games.length} titles</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

    const setHeroBg = makeCrossfader("hbg0", "hbg1");
    const row = document.getElementById("recentRow")!;
    const firstCard = row.querySelector<HTMLElement>('[data-idx="0"]')!;
    let expandedCard: HTMLElement = firstCard;
    firstCard.classList.add("js-expanded");
    if (recent[0]) setHeroBg(heroUrl(recent[0].appId));

    function updateSpotlight(g: LibraryGame) {
        document.getElementById("spotGenre")!.textContent = g.platform;
        document.getElementById("spotTitle")!.textContent = g.name;
        document.getElementById("spotLastPlayed")!.textContent = `Last played ${g.lastPlayed}`;
    }

    row.querySelectorAll<HTMLElement>(".game-item[data-idx]").forEach(card => {
        const idx = parseInt(card.dataset.idx!);
        const game = recent[idx];
        card.addEventListener("mouseenter", () => {
            if (expandedCard === card) return;
            expandedCard?.classList.remove("js-expanded");
            card.classList.add("js-expanded");
            expandedCard = card;
            setHeroBg(heroUrl(game.appId));
            updateSpotlight(game);
        });
        card.addEventListener("click", () => openGameModal(game));
    });

    const libCard = document.getElementById("libCard")!;
    libCard.addEventListener("mouseenter", () => expandedCard?.classList.remove("js-expanded"));
    libCard.addEventListener("click", () => navigateTo(renderHostLibrary));
    row.addEventListener("mouseleave", () => expandedCard?.classList.add("js-expanded"));

    document.getElementById("rescanBtn")?.addEventListener("click", async () => {
        const btn = document.getElementById("rescanBtn")!;
        btn.classList.add("hud-rescan-spinning");
        const changed = await rescanLibrary();
        btn.classList.remove("hud-rescan-spinning");
        if (changed) renderHostHome();
    });

    attachQuitHandler();
    attachSettingsHandler();
}

function renderHostLibrary() {
    const games = libraryGames;

    document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
    <div class="host-wrap">
      <div class="hud-pill hud-left">
        <button class="hud-back-btn" id="backBtn" data-tooltip="Back">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M9.5 3L4.5 7.5L9.5 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="hud-divider"></div>
        <div class="wordmark-small">Library</div>
      </div>
      <div class="hud-right-group">
  <div class="hud-pill">
    <span class="code-label">Library code</span>
    <span class="code-value">${libraryCode}</span>
  </div>
  <div class="hud-pill hud-rescan" id="rescanBtn" data-tooltip="Rescan games">${RESCAN_SVG}</div>
  <div class="hud-pill hud-settings" id="settingsBtn" data-tooltip="Settings">${SETTINGS_SVG}</div>
  <div class="hud-pill hud-quit" id="quitBtn" data-tooltip="Quit Relay">${POWER_SVG}</div>
</div>
      <div class="library-content">
        <div class="library-filter-row">
  <span class="library-view-title">All Games</span>
  <div class="library-search-wrap">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
    <input class="library-search" id="librarySearch" placeholder="Search games..." autocomplete="off" spellcheck="false" />
  </div>
  <span class="library-game-count" id="libraryCount">${games.length} titles</span>
</div>
        <div class="library-grid">
          ${games.map((g, i) => `
            <div class="library-card${i < 8 ? " recent" : ""}" data-idx="${i}">
              <img src="${portraitUrl(g.appId)}" alt="${g.name}" onerror="this.style.opacity='0'">
              <div class="library-card-overlay">
                <div class="library-card-name">${g.name}</div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;

    document.querySelector<HTMLElement>(".hud-left")!.addEventListener("click", () => navigateTo(renderHostHome));
    document.querySelectorAll<HTMLElement>(".library-card").forEach(card => {
        card.addEventListener("click", () => openGameModal(games[parseInt(card.dataset.idx!)]));
    });

    document.getElementById("rescanBtn")?.addEventListener("click", async () => {
        const btn = document.getElementById("rescanBtn")!;
        btn.classList.add("hud-rescan-spinning");
        const changed = await rescanLibrary();
        btn.classList.remove("hud-rescan-spinning");
        if (changed) renderHostLibrary();
    });

    const searchInput = document.getElementById("librarySearch") as HTMLInputElement;
    const countEl = document.getElementById("libraryCount")!;
    const grid = document.querySelector<HTMLElement>(".library-grid")!;

    searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim().toLowerCase();
        const cards = grid.querySelectorAll<HTMLElement>(".library-card");
        let visible = 0;
        cards.forEach(card => {
            const idx = parseInt(card.dataset.idx!);
            const matches = !q || games[idx].name.toLowerCase().includes(q);
            card.style.display = matches ? "" : "none";
            if (matches) visible++;
        });
        countEl.textContent = q ? `${visible} of ${games.length}` : `${games.length} titles`;
    });

    const onKey = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "f") {
            e.preventDefault();
            searchInput.focus();
        }
    };
    document.addEventListener("keydown", onKey);

    attachSettingsHandler();
}

function openGameModal(g: LibraryGame) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
    <div class="game-modal">
      <div class="game-modal-bg" style="background-image: url('${heroUrl(g.appId)}')"></div>
      <div class="game-modal-vignette"></div>
      <button class="modal-close-btn" id="modalClose">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="game-modal-inner">
        <div class="game-modal-art">
          <img src="${portraitUrl(g.appId)}" alt="${g.name}" onerror="this.style.display='none'"/>
        </div>
        <div class="game-modal-info">
          <div>
            <div class="game-modal-title">${g.name}</div>
            <div class="game-modal-genre">${g.platform}</div>
          </div>
          <div class="game-modal-rule"></div>
          <div class="game-modal-stats">
            <div class="stat-item">
              <span class="stat-label">Last Played</span>
              <span class="stat-value">${g.lastPlayed}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Install Size</span>
              <span class="stat-value">${g.sizeOnDisk ? formatBytes(g.sizeOnDisk) : "N/A"}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Platform</span>
              <span class="stat-value">${g.platform}</span>
            </div>
          </div>
          <div>
            ${currentMode === "client"
            ? `<button class="play-btn" id="playBtn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 10.268C20.333 11.038 20.333 12.962 19 13.732L10 18.928C8.667 19.698 7 18.736 7 17.196L7 6.804C7 5.264 8.667 4.302 10 5.072L19 10.268Z"/>
                    </svg>
                    Play
                </button>`
            : `<button class="play-btn" disabled>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 10.268C20.333 11.038 20.333 12.962 19 13.732L10 18.928C8.667 19.698 7 18.736 7 17.196L7 6.804C7 5.264 8.667 4.302 10 5.072L19 10.268Z"/>
                    </svg>
                    Client mode only
                </button>
                <div class="modal-play-hint">Connect as a client to launch games</div>`
        }
          </div>
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);

    if (currentMode === "client") {
        document.getElementById("playBtn")?.addEventListener("click", async () => {
            const btn = document.getElementById("playBtn") as HTMLButtonElement;
            btn.disabled = true;
            btn.textContent = "Connecting to host...";

            clientWsInstance?.send(JSON.stringify({
                type: "connect-request",
                target: clientHostId,
                payload: g,
            }));

            const timeout = setTimeout(() => {
                if (!activeStreamOverlay) {
                    btn.disabled = false;
                    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 10.268C20.333 11.038 20.333 12.962 19 13.732L10 18.928C8.667 19.698 7 18.736 7 17.196L7 6.804C7 5.264 8.667 4.302 10 5.072L19 10.268Z"/>
            </svg> Play`;
                }
            }, 30000);

            const checkConnected = setInterval(() => {
                if (activeStreamOverlay) { clearTimeout(timeout); clearInterval(checkConnected); }
            }, 500);
        });
    }

    function close() {
        overlay.classList.add("modal-exit");
        setTimeout(() => overlay.remove(), 220);
    }

    document.getElementById("modalClose")!.addEventListener("click", close);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") { close(); document.removeEventListener("keydown", onKey); }
    };
    document.addEventListener("keydown", onKey);

    attachQuitHandler();
}

function renderClientCodeEntry(reason?: "revoked" | "offline" | "code-changed") {
    const errorMsg = reason === "revoked"
        ? "Your access was revoked by the host."
        : reason === "code-changed"
            ? "The host changed their library code. Enter the new code to reconnect."
            : reason === "offline"
                ? "The host is offline. Check that the host machine is running Relay."
                : "";

    const bgLayers = SHOWCASE_GAMES.map((game, i) =>
        `<div class="bg-layer" id="bg${i}" style="background-image: url('${heroUrl(game.appId)}')"></div>`
    ).join("");

    document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
        <div class="picker-wrap" id="pickerWrap">
            ${bgLayers}
            <div class="game-label" id="gameLabel"></div>
            <div class="glass-card">
                <div class="brand">
                    <div class="brand-rule"></div>
                    <div class="wordmark">Relay</div>
                    <div class="brand-rule"></div>
                </div>
                <div class="tagline">Enter a library code to connect</div>
                ${errorMsg ? `<div class="code-entry-error">${errorMsg}</div>` : ""}
                <div class="code-input-wrap">
                    <input class="code-input" id="codeInput" placeholder="XXXX XXXX"
                        maxlength="9" autocomplete="off" spellcheck="false" />
                </div>
                <div class="code-entry-error" id="codeError" style="display:none"></div>
                <button class="scan-btn code-connect-btn" id="connectBtn">Connect</button>
                <div class="pick-hint">Get this code from the host device running Relay</div>
            </div>
        </div>`;

    const wrap = document.getElementById("pickerWrap")!;
    const label = document.getElementById("gameLabel")!;
    const order = [...SHOWCASE_GAMES.keys()].sort(() => Math.random() - 0.5);
    let current = 0, orderIndex = 0;

    preloadImage(heroUrl(SHOWCASE_GAMES[order[0]].appId)).then(() => {
        activateBg(order[0]);
        current = order[0];
        label.textContent = SHOWCASE_GAMES[current].name;
        wrap.classList.add("visible");
        setTimeout(() => label.classList.add("active"), 800);
    });

    setInterval(() => {
        deactivateBg(current); label.classList.remove("active");
        orderIndex = (orderIndex + 1) % order.length;
        current = order[orderIndex];
        activateBg(current);
        setTimeout(() => { label.textContent = SHOWCASE_GAMES[current].name; label.classList.add("active"); }, 600);
    }, 12000);

    const codeInput = document.getElementById("codeInput") as HTMLInputElement;
    codeInput.addEventListener("input", () => {
        const raw = codeInput.value.replace(/\s/g, "").toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 8);
        codeInput.value = raw.length > 4 ? raw.slice(0, 4) + " " + raw.slice(4) : raw;
    });

    codeInput.addEventListener("keydown", e => {
        if (e.key === "Enter") document.getElementById("connectBtn")?.click();
    });

    function showError(msg: string) {
        const el = document.getElementById("codeError")!;
        el.textContent = msg; el.style.display = "block";
    }

    document.getElementById("connectBtn")!.addEventListener("click", async () => {
        const raw = codeInput.value.replace(/\s/g, "");
        if (raw.length !== 8) { showError("Enter the full 8-character code."); return; }

        const btn = document.getElementById("connectBtn") as HTMLButtonElement;
        btn.disabled = true; btn.textContent = "Connecting...";
        document.getElementById("codeError")!.style.display = "none";

        const result = await relay.validateCode(raw) as { valid: boolean; reason?: string; hostId?: string };

        if (!result.valid) {
            btn.disabled = false; btn.textContent = "Connect";
            showError(result.reason === "host offline"
                ? "Host is offline. Ask the host to open Relay and try again."
                : "Invalid code. Double-check with the host and try again.");
            return;
        }

        if (!clientId) {
            const buf = new Uint8Array(8);
            crypto.getRandomValues(buf);
            clientId = Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("");
        }

        clientHostId = result.hostId!;
        clientHostCode = raw.match(/.{1,4}/g)?.join(" ") ?? raw;
        clientDisplayName = clientDisplayName || await relay.getHostname();

        await relay.saveClientConfig({
            clientId,
            hostId: clientHostId,
            hostCode: raw,
            displayName: clientDisplayName,
        });

        const pickerWrap = document.getElementById("pickerWrap")!;
        const glassCard = pickerWrap.querySelector<HTMLElement>(".glass-card")!;
        const gameLabel = document.getElementById("gameLabel")!;

        glassCard.style.transition = "opacity 0.3s ease";
        glassCard.style.opacity = "0";
        gameLabel.style.transition = "opacity 0.3s ease";
        gameLabel.style.opacity = "0";
        await new Promise<void>(r => setTimeout(r, 300));
        glassCard.remove();

        const animEl = document.createElement("div");
        animEl.className = "connect-anim-wrap";
        animEl.innerHTML = `
    <div class="splash-anim-box">
        ${POLE_SVG}
        <canvas id="connectCanvas"></canvas>
    </div>
    <div class="scan-anim-label" style="color: #ffffff;">Connecting to library...</div>
`;
        pickerWrap.appendChild(animEl);
        requestAnimationFrame(() => requestAnimationFrame(() => animEl.classList.add("connect-anim-visible")));

        const connectCanvas = animEl.querySelector<HTMLCanvasElement>("#connectCanvas")!;
        const stopConnectAnim = startPoleAnimation(connectCanvas);

        const library = await relay.getHostLibrary(clientHostId) as LibraryGame[] | null;

        const urls: string[] = [];
        if (library?.length) {
            library.forEach((g, i) => {
                urls.push(portraitUrl(g.appId));
                if (i < 8) {
                    urls.push(heroUrl(g.appId));
                    urls.push(capsuleUrl(g.appId));
                }
            });
        }

        await Promise.all([
            Promise.all(urls.map(preloadImage)),
            new Promise<void>(r => setTimeout(r, 2000)),
        ]);

        stopConnectAnim();

        pickerWrap.style.transition = "opacity 0.45s ease";
        pickerWrap.style.opacity = "0";
        await new Promise<void>(r => setTimeout(r, 450));

        if (library?.length) libraryGames = library;

        connectClientWebSocket();
        navigateTo(renderClientHome);
    });
}

function renderClientHome() {
    const games = libraryGames;
    const recent = games.slice(0, 5);
    const collage = [games[0], games[Math.floor(games.length / 2)], games[games.length - 1]].filter(Boolean);

    document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
    <div class="host-wrap">
      <div class="home-main">
        <div class="home-bg-layer" id="hbg0"></div>
        <div class="home-bg-layer" id="hbg1"></div>
        <div class="home-gradient"></div>
        <div class="hud-pill hud-left">
          <div class="wordmark-small">Relay</div>
        </div>
        <div class="hud-right-group">
          <div class="hud-pill">
            <span class="code-label">Connected to</span>
            <span class="code-value">${clientHostCode}</span>
          </div>
          <div class="hud-pill hud-settings" id="settingsBtn" data-tooltip="Settings">${SETTINGS_SVG}</div>
          <div class="hud-pill hud-quit" id="quitBtn" data-tooltip="Quit Relay">${POWER_SVG}</div>
        </div>
        <div class="home-content">
          <div class="spotlight">
            <div class="spotlight-inner">
              <div class="spot-genre" id="spotGenre">${recent[0]?.platform ?? ""}</div>
              <div class="spot-title" id="spotTitle">${recent[0]?.name ?? ""}</div>
              <div class="spot-meta">
                ${recent[0]?.sizeOnDisk ? `<span>${formatBytes(recent[0].sizeOnDisk)}</span>` : ""}
              </div>
            </div>
          </div>
          <div>
            <div class="section-header">
              <span class="section-label">Library</span>
            </div>
            <div class="recent-row" id="recentRow">
              ${recent.map((g, i) => `
                <div class="game-item" data-idx="${i}">
                  <img class="art-portrait" src="${portraitUrl(g.appId)}" alt="${g.name}" onerror="this.remove()">
                  <img class="art-landscape" src="${capsuleUrl(g.appId)}" alt="" onerror="this.remove()">
                  <div class="game-item-overlay"><div class="game-item-name">${g.name}</div></div>
                </div>`).join("")}
              <div class="game-item lib-card" id="libCard">
                <div class="lib-card-collage">
                  ${collage.map(g => `<img src="${portraitUrl(g.appId)}" alt="">`).join("")}
                  <div class="lib-card-collage-overlay"></div>
                </div>
                <div class="lib-card-body">
                  <svg class="lib-card-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                  <div class="lib-card-title">All Games</div>
                  <div class="lib-card-sub">${games.length} titles</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

    const setHeroBg = makeCrossfader("hbg0", "hbg1");
    const row = document.getElementById("recentRow")!;
    const firstCard = row.querySelector<HTMLElement>('[data-idx="0"]')!;
    let expandedCard: HTMLElement = firstCard;
    firstCard.classList.add("js-expanded");
    if (recent[0]) setHeroBg(heroUrl(recent[0].appId));

    row.querySelectorAll<HTMLElement>(".game-item[data-idx]").forEach(card => {
        const game = recent[parseInt(card.dataset.idx!)];
        card.addEventListener("mouseenter", () => {
            if (expandedCard === card) return;
            expandedCard?.classList.remove("js-expanded");
            card.classList.add("js-expanded");
            expandedCard = card;
            setHeroBg(heroUrl(game.appId));
            document.getElementById("spotGenre")!.textContent = game.platform;
            document.getElementById("spotTitle")!.textContent = game.name;
        });
        card.addEventListener("click", () => openGameModal(game));
    });

    const libCard = document.getElementById("libCard")!;
    libCard.addEventListener("mouseenter", () => expandedCard?.classList.remove("js-expanded"));
    libCard.addEventListener("click", () => navigateTo(renderClientLibrary));
    row.addEventListener("mouseleave", () => expandedCard?.classList.add("js-expanded"));

    attachSettingsHandler();
    attachQuitHandler();
}

function renderClientLibrary() {
    const games = libraryGames;

    document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
    <div class="host-wrap">
      <div class="hud-pill hud-left">
        <button class="hud-back-btn" data-tooltip="Back">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M9.5 3L4.5 7.5L9.5 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="hud-divider"></div>
        <div class="wordmark-small">Library</div>
      </div>
      <div class="hud-right-group">
        <div class="hud-pill">
          <span class="code-label">Connected to</span>
          <span class="code-value">${clientHostCode}</span>
        </div>
        <div class="hud-pill hud-settings" id="settingsBtn" data-tooltip="Settings">${SETTINGS_SVG}</div>
        <div class="hud-pill hud-quit" id="quitBtn" data-tooltip="Quit Relay">${POWER_SVG}</div>
      </div>
      <div class="library-content">
        <div class="library-filter-row">
  <span class="library-view-title">All Games</span>
  <div class="library-search-wrap">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
    <input class="library-search" id="librarySearch" placeholder="Search games..." autocomplete="off" spellcheck="false" />
  </div>
  <span class="library-game-count" id="libraryCount">${games.length} titles</span>
</div>
        <div class="library-grid">
          ${games.map((g, i) => `
            <div class="library-card${i < 8 ? " recent" : ""}" data-idx="${i}">
              <img src="${portraitUrl(g.appId)}" alt="${g.name}" onerror="this.style.opacity='0'">
              <div class="library-card-overlay">
                <div class="library-card-name">${g.name}</div>
              </div>
            </div>`).join("")}
        </div>
      </div>
    </div>`;

    document.querySelector<HTMLElement>(".hud-left")!.addEventListener("click", () => navigateTo(renderClientHome));
    document.querySelectorAll<HTMLElement>(".library-card").forEach(card => {
        card.addEventListener("click", () => openGameModal(games[parseInt(card.dataset.idx!)]));
    });

    const searchInput = document.getElementById("librarySearch") as HTMLInputElement;
    const countEl = document.getElementById("libraryCount")!;
    const grid = document.querySelector<HTMLElement>(".library-grid")!;

    searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim().toLowerCase();
        const cards = grid.querySelectorAll<HTMLElement>(".library-card");
        let visible = 0;
        cards.forEach(card => {
            const idx = parseInt(card.dataset.idx!);
            const matches = !q || games[idx].name.toLowerCase().includes(q);
            card.style.display = matches ? "" : "none";
            if (matches) visible++;
        });
        countEl.textContent = q ? `${visible} of ${games.length}` : `${games.length} titles`;
    });

    const onKey = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "f") {
            e.preventDefault();
            searchInput.focus();
        }
    };
    document.addEventListener("keydown", onKey);

    attachSettingsHandler();
    attachQuitHandler();
}

init();