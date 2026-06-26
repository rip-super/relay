import "@fontsource/outfit/300.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/700.css";
import "./style.css";

const relay = (window as any).relay;

const SHOWCASE_GAMES = [
    { name: "Cyberpunk 2077", appId: 1091500 },
    { name: "Elden Ring", appId: 1245620 },
    { name: "Hollow Knight", appId: 367520 },
    { name: "Starfield", appId: 1716740 },
    { name: "Red Dead Redemption 2", appId: 1174180 },
    { name: "The Witcher 3", appId: 292030 },
    { name: "Celeste", appId: 504230 },
    { name: "Factorio", appId: 427520 },
    { name: "Balatro", appId: 2379780 },
    { name: "Kerbal Space Program", appId: 220200 },
    { name: "Subnautica", appId: 264710 },
    { name: "Hades", appId: 1145360 },
    { name: "Baldur's Gate 3", appId: 1086940 },
    { name: "Death Stranding", appId: 1190460 },
    { name: "God of War", appId: 1593500 },
    { name: "Sekiro", appId: 814380 },
    { name: "Control", appId: 870780 },
    { name: "Deep Rock Galactic", appId: 548430 },
    { name: "No Man's Sky", appId: 275850 },
    { name: "Stardew Valley", appId: 413150 },
    { name: "Monster Hunter: World", appId: 582010 },
    { name: "Dark Souls III", appId: 374320 },
    { name: "Disco Elysium", appId: 632470 },
    { name: "Doom Eternal", appId: 782330 },
    { name: "Hogwarts Legacy", appId: 990080 },
    { name: "Plague Tale: Requiem", appId: 1850010 },
    { name: "Horizon Zero Dawn", appId: 1151640 },
    { name: "Half-Life: Alyx", appId: 546560 },
    { name: "Portal 2", appId: 620 },
];

function heroUrl(appId: number): string {
    return `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_hero.jpg`;
}

function navigateTo(renderFn: () => void) {
    const app = document.querySelector<HTMLDivElement>("#app")!;
    app.classList.add("page-exit");
    setTimeout(() => {
        renderFn();
        app.classList.remove("page-exit");
    }, 350);
}

async function init() {
    const mode = await relay.getMode();
    if (mode === "host") return renderHost();
    if (mode === "client") return renderClient();
    renderPicker();

    // delete me
    window.addEventListener("keydown", async e => {
        if (e.ctrlKey && e.shiftKey && e.key === "R") {
            await relay.clearMode();
            location.reload();
        }
    })
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
                <div class="tagline">Stream your library, anywhere</div>
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
        document.getElementById(`bg${order[0]}`)!.classList.add("active");
        current = order[0];
        label.textContent = SHOWCASE_GAMES[current].name;
        wrap.classList.add("visible");
        setTimeout(() => label.classList.add("active"), 800);
    });

    setInterval(() => {
        document.getElementById(`bg${current}`)!.classList.remove("active");
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
        document.getElementById(`bg${current}`)!.classList.add("active");

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