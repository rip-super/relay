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

function heroUrl(appId: number): string {
    return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_hero.jpg`;
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
            await renderFn();
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
    document.getElementById(`bg${index}`)!.classList.remove("active");
}

async function init() {
    const stopAnim = showSplash();

    const [mode] = await Promise.all([
        relay.getMode(),
        new Promise<void>(r => setTimeout(r, 5000)),
    ]);

    if (mode === "host" || mode === "client") {
        const app = document.querySelector<HTMLDivElement>("#app")!;
        app.classList.add("page-exit");
        await dismissSplash(stopAnim);
        if (mode === "host") await renderHost();
        else renderClient();
        void app.offsetWidth;
        app.classList.remove("page-exit");
    } else {
        renderPicker();
        await dismissSplashToPicker(stopAnim);
    }
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
        navigateTo(renderClient);
    };
}

async function renderHost() {
    const existing = await relay.getHostConfig();
    const isFirstLaunch = !existing;
    const config = existing ?? await relay.registerHost();

    const formattedCode = config.code.match(/.{1,4}/g)?.join(" ") ?? config.code;

    document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
        <div class="host-wrap">
            <div class="topbar">
                <div class="wordmark-small">Relay</div>
                <div class="topbar-right">
                    <div class="code-pill">
                        <span class="code-label">Library code</span>
                        <span class="code-value">${formattedCode}</span>
                    </div>
                    <div class="icon-btn" id="settingsBtn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                    </div>
                </div>
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
                <div class="modal-code">${formattedCode}</div>
                <p class="modal-desc">
                    Share this code with anyone you'd like to give access to your library.
                    They'll enter it on their device in Client mode to connect.
                </p>
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

    document.getElementById("scanBtn")!.onclick = () => {
        console.log("scan triggered - coming soon");
    };
}

function renderClient() {
    document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
        <div class="host-wrap">
            <div class="topbar">
                <div class="wordmark-small">Relay</div>
            </div>
            <div class="host-content">
                <p style="color: var(--muted)">Client UI coming soon</p>
            </div>
        </div>
    `;
}

init();