import { app, shell, BrowserWindow, ipcMain, desktopCapturer, session, screen, Tray, Menu, nativeImage } from "electron";
import { join } from "path";
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { homedir, hostname } from "os";
import { spawn, exec } from "child_process";
import { mouse, keyboard, Button, Key, Point } from "@nut-tree-fork/nut-js";

mouse.config.mouseSpeed = 0;
keyboard.config.autoDelayMs = 0;

type LaunchConfig =
    | { type: "steam" }
    | { type: "epic"; epicAppName: string }
    | { type: "gog"; exePath: string; workingDir?: string }
    | { type: "exe"; exePath: string; workingDir?: string };

interface ScannedGame {
    appId: string;
    name: string;
    installDir: string;
    executablePath: string;
    launchConfig: LaunchConfig;
    sizeOnDisk: number;
    source: "steam" | "epic" | "gog";
}

const configPath = join(app.getPath("userData"), "config.json");

function getConfig(): { mode: "host" | "client" } | null {
    if (!existsSync(configPath)) return null;
    return JSON.parse(readFileSync(configPath, "utf-8"));
}

function saveConfig(mode: "host" | "client"): void {
    const existing = (getConfig() as any) ?? {};
    writeFileSync(configPath, JSON.stringify({ ...existing, mode }));
}

function findSteamRoots(): string[] {
    const home = homedir();
    const candidates: string[] = [];

    if (process.platform === "win32") {
        const x86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";
        const x64 = process.env["ProgramFiles"] ?? "C:\\Program Files";
        candidates.push(join(x86, "Steam"), join(x64, "Steam"));
    } else if (process.platform === "darwin") {
        candidates.push(join(home, "Library", "Application Support", "Steam"));
    } else {
        candidates.push(
            join(home, ".steam", "steam"),
            join(home, ".local", "share", "Steam")
        );
    }

    return candidates.filter((p) => existsSync(p));
}

function parseVdfFlat(content: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const match of content.matchAll(/"([^"]+)"\s+"([^"]*)"/g)) {
        result[match[1].toLowerCase()] = match[2];
    }
    return result;
}

function getLibraryFolders(steamRoot: string): string[] {
    const defaultApps = join(steamRoot, "steamapps");
    const folders = new Set<string>([defaultApps]);

    const vdfPath = join(defaultApps, "libraryfolders.vdf");
    if (existsSync(vdfPath)) {
        try {
            const content = readFileSync(vdfPath, "utf-8");
            for (const match of content.matchAll(/"path"\s+"([^"]+)"/gi)) {
                folders.add(join(match[1], "steamapps"));
            }
        } catch { }
    }

    return [...folders].filter((p) => existsSync(p));
}

const EXE_BLACKLIST = new Set([
    "unins000.exe", "uninstall.exe", "crashpad_handler.exe",
    "unitycrashandler64.exe", "unitycrashandler32.exe",
    "dxsetup.exe", "vcredist_x64.exe", "vcredist_x86.exe",
    "vc_redist.x64.exe", "vc_redist.x86.exe", "dotnetfx.exe",
]);

function findBestExe(installDir: string): string {
    let bestPath = "";
    let bestSize = 0;
    try {
        for (const file of readdirSync(installDir)) {
            if (!file.toLowerCase().endsWith(".exe")) continue;
            if (EXE_BLACKLIST.has(file.toLowerCase())) continue;
            const fullPath = join(installDir, file);
            try {
                const size = statSync(fullPath).size;
                if (size > bestSize) { bestSize = size; bestPath = fullPath; }
            } catch { }
        }
    } catch { }
    return bestPath;
}

function scanSteamGames(): ScannedGame[] {
    const games: ScannedGame[] = [];
    const seenAppIds = new Set<string>();

    for (const steamRoot of findSteamRoots()) {
        for (const appsDir of getLibraryFolders(steamRoot)) {
            let files: string[];
            try {
                files = readdirSync(appsDir).filter(
                    (f) => f.startsWith("appmanifest_") && f.endsWith(".acf")
                );
            } catch {
                continue;
            }

            for (const file of files) {
                try {
                    const content = readFileSync(join(appsDir, file), "utf-8");
                    const d = parseVdfFlat(content);

                    const stateFlags = parseInt(d["stateflags"] ?? "0", 10);
                    if (!(stateFlags & 4)) continue;

                    const appId = d["appid"];
                    if (!appId || seenAppIds.has(appId)) continue;
                    seenAppIds.add(appId);

                    const installDir = join(appsDir, "common", d["installdir"] ?? "");
                    const executablePath = findBestExe(installDir);

                    games.push({
                        appId,
                        name: d["name"] ?? `App ${appId}`,
                        installDir,
                        executablePath,
                        launchConfig: { type: "steam" },
                        sizeOnDisk: parseInt(d["sizeondisk"] ?? "0", 10),
                        source: "steam",
                    });
                } catch { }
            }
        }
    }

    return games.sort((a, b) => a.name.localeCompare(b.name));
}

function findEpicManifestDirs(): string[] {
    const dirs: string[] = [];
    if (process.platform === "win32") {
        const programData = process.env["PROGRAMDATA"] ?? "C:\\ProgramData";
        dirs.push(join(programData, "Epic", "EpicGamesLauncher", "Data", "Manifests"));
    } else if (process.platform === "darwin") {
        dirs.push(join(homedir(), "Library", "Application Support",
            "Epic", "EpicGamesLauncher", "Data", "Manifests"));
    }
    return dirs.filter((d) => existsSync(d));
}

function scanEpicGames(): ScannedGame[] {
    const games: ScannedGame[] = [];
    const seen = new Set<string>();

    for (const dir of findEpicManifestDirs()) {
        let files: string[];
        try {
            files = readdirSync(dir).filter((f) => f.endsWith(".item"));
        } catch { continue; }

        for (const file of files) {
            try {
                const m = JSON.parse(readFileSync(join(dir, file), "utf-8"));

                if (!m.bIsApplication) continue;
                if (Array.isArray(m.AppCategories) && !m.AppCategories.includes("games")) continue;
                if (!m.LaunchExecutable) continue;
                if (m.MainGameAppName && m.MainGameAppName !== m.AppName) continue;

                const appName: string = m.AppName;
                if (!appName || seen.has(appName)) continue;
                seen.add(appName);

                const installDir: string = m.InstallLocation ?? "";
                const executablePath =
                    installDir && m.LaunchExecutable ? join(installDir, m.LaunchExecutable) : "";

                games.push({
                    appId: appName,
                    name: m.DisplayName ?? appName,
                    installDir,
                    executablePath,
                    launchConfig: { type: "epic", epicAppName: appName },
                    sizeOnDisk: typeof m.InstallSize === "number" ? m.InstallSize : 0,
                    source: "epic",
                });
            } catch { }
        }
    }
    return games;
}

function runCommand(cmd: string): Promise<string> {
    return new Promise((resolve) => {
        exec(cmd, { windowsHide: true, maxBuffer: 1024 * 1024 * 8 }, (err, stdout) => {
            resolve(err ? "" : stdout);
        });
    });
}

async function scanGogGamesWindows(): Promise<ScannedGame[]> {
    const games: ScannedGame[] = [];
    const seen = new Set<string>();
    const roots = [
        "HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games",
        "HKLM\\SOFTWARE\\GOG.com\\Games",
    ];

    for (const root of roots) {
        const listing = await runCommand(`reg query "${root}"`);
        const subkeys = listing
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => /\\Games\\\d+$/i.test(l));

        for (const key of subkeys) {
            const out = await runCommand(`reg query "${key}"`);
            const values: Record<string, string> = {};
            for (const line of out.split(/\r?\n/)) {
                const match = line.match(/^\s+(\S+)\s+REG_\w+\s+(.*)$/);
                if (match) values[match[1].toLowerCase()] = match[2].trim();
            }

            const gameId = values["gameid"] ?? key.split("\\").pop() ?? "";
            if (!gameId || seen.has(gameId)) continue;
            seen.add(gameId);

            const installDir = values["path"] ?? "";
            let exePath = values["exe"] ?? "";
            if (!exePath && installDir && values["exefile"]) {
                exePath = join(installDir, values["exefile"]);
            }
            if (!exePath) continue;

            games.push({
                appId: `gog-${gameId}`,
                name: values["gamename"] ?? `GOG ${gameId}`,
                installDir,
                executablePath: exePath,
                launchConfig: { type: "gog", exePath, workingDir: values["workingdir"] || installDir },
                sizeOnDisk: 0,
                source: "gog",
            });
        }
    }
    return games;
}

function scanGogGamesMac(): ScannedGame[] {
    const games: ScannedGame[] = [];
    const seen = new Set<string>();

    const searchDirs = [
        "/Applications",
        join(homedir(), "Applications"),
    ].filter((d) => existsSync(d));

    for (const dir of searchDirs) {
        let entries: string[];
        try {
            entries = readdirSync(dir).filter((f) => f.endsWith(".app"));
        } catch { continue; }

        for (const appName of entries) {
            const bundlePath = join(dir, appName);
            const resourcesDir = join(bundlePath, "Contents", "Resources");

            let infoFile: string | undefined;
            try {
                infoFile = readdirSync(resourcesDir).find(
                    (f) => f.startsWith("goggame-") && f.endsWith(".info")
                );
            } catch { continue; }
            if (!infoFile) continue;

            try {
                const info = JSON.parse(readFileSync(join(resourcesDir, infoFile), "utf-8"));
                const gameId: string = info.gameId ?? info.rootGameId ?? infoFile.slice(8, -5);
                if (!gameId || seen.has(gameId)) continue;
                seen.add(gameId);

                const binaryName = appName.replace(/\.app$/i, "");
                const executablePath = join(bundlePath, "Contents", "MacOS", binaryName);

                games.push({
                    appId: `gog-${gameId}`,
                    name: info.name ?? binaryName,
                    installDir: bundlePath,
                    executablePath,
                    launchConfig: { type: "gog", exePath: bundlePath, workingDir: bundlePath },
                    sizeOnDisk: 0,
                    source: "gog",
                });
            } catch { }
        }
    }

    return games;
}

async function scanGogGames(): Promise<ScannedGame[]> {
    if (process.platform === "win32") return scanGogGamesWindows();
    if (process.platform === "darwin") return scanGogGamesMac();
    return []; // todo: linux
}

const KEY_MAP: Record<string, Key> = {
    Enter: Key.Enter, NumpadEnter: Key.Enter, Space: Key.Space,
    Backspace: Key.Backspace, Tab: Key.Tab, Escape: Key.Escape,
    Delete: Key.Delete, Insert: Key.Insert,

    ShiftLeft: Key.LeftShift, ShiftRight: Key.RightShift,
    ControlLeft: Key.LeftControl, ControlRight: Key.RightControl,
    AltLeft: Key.LeftAlt, AltRight: Key.RightAlt,
    MetaLeft: Key.LeftSuper, MetaRight: Key.RightSuper, CapsLock: Key.CapsLock,

    ArrowUp: Key.Up, ArrowDown: Key.Down, ArrowLeft: Key.Left, ArrowRight: Key.Right,
    Home: Key.Home, End: Key.End, PageUp: Key.PageUp, PageDown: Key.PageDown,

    Backquote: Key.Grave, Minus: Key.Minus, Equal: Key.Equal,
    BracketLeft: Key.LeftBracket, BracketRight: Key.RightBracket, Backslash: Key.Backslash,
    Semicolon: Key.Semicolon, Quote: Key.Quote, Comma: Key.Comma,
    Period: Key.Period, Slash: Key.Slash,

    NumpadAdd: Key.Add, NumpadSubtract: Key.Subtract, NumpadMultiply: Key.Multiply,
    NumpadDivide: Key.Divide, NumpadDecimal: Key.Decimal,

    NumLock: Key.NumLock, ScrollLock: Key.ScrollLock, Pause: Key.Pause, PrintScreen: Key.Print,
};

function mapKey(code: string): Key | undefined {
    if (/^Key[A-Z]$/.test(code)) return Key[code.slice(3) as keyof typeof Key];       // KeyW -> W
    if (/^Digit[0-9]$/.test(code)) return Key[`Num${code.slice(5)}` as keyof typeof Key];   // Digit1 -> Num1
    if (/^Numpad[0-9]$/.test(code)) return Key[`NumPad${code.slice(6)}` as keyof typeof Key]; // Numpad1 -> NumPad1
    if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return Key[code as keyof typeof Key];   // F1..F24
    return KEY_MAP[code];
}

let tray: Tray | null = null;

function showMainWindow(): void {
    if (!mainWindow) { createWindow(); return; }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
}

function createTray(): void {
    if (tray) return;
    try {
        const iconPath = join(__dirname, "../../build/icon.png");
        let image = nativeImage.createFromPath(iconPath);
        if (!image.isEmpty()) image = image.resize({ width: 16, height: 16 });
        tray = new Tray(image);
        tray.setToolTip("Relay");
        tray.setContextMenu(Menu.buildFromTemplate([
            { label: "Open Relay", click: showMainWindow },
            { type: "separator" },
            { label: "Quit Relay", click: () => app.quit() },
        ]));
        tray.on("click", showMainWindow);
        tray.on("double-click", showMainWindow);
    } catch (e) {
        console.error("[relay] failed to create tray:", e);
    }
}

ipcMain.handle("get-mode", () => getConfig()?.mode ?? null);
ipcMain.handle("set-mode", (_, mode: "host" | "client") => saveConfig(mode));

ipcMain.handle("get-host-config", () => {
    const config = getConfig() as any;
    if (!config?.hostId) return null;
    return { hostId: config.hostId, code: config.code };
});

ipcMain.handle("register-host", async () => {
    const res = await fetch("https://relayapi.sahildash.dev/hosts/register", { method: "POST" });
    const data = await res.json() as { hostId: string; code: string };
    const config = getConfig() ?? { mode: "host" as const };
    writeFileSync(configPath, JSON.stringify({ ...config, ...data }));
    return data;
});

ipcMain.handle("scan-games", async () => {
    const [steam, epic, gog] = await Promise.all([
        Promise.resolve(scanSteamGames()),
        Promise.resolve(scanEpicGames()),
        scanGogGames(),
    ]);
    return [...steam, ...epic, ...gog].sort((a, b) => a.name.localeCompare(b.name));
});

ipcMain.handle("get-saved-games", () => {
    const config = getConfig() as any;
    return config?.games ?? null;
});

ipcMain.handle("save-games", async (_, games: unknown) => {
    const config = (getConfig() as any) ?? { mode: "host" };
    writeFileSync(configPath, JSON.stringify({ ...config, games }));
    if (config.hostId) {
        fetch(`https://relayapi.sahildash.dev/hosts/${config.hostId}/library`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ games }),
        }).catch(() => { });
    }
});

ipcMain.handle("push-library", async () => {
    const config = getConfig() as any;
    if (!config?.hostId || !config?.games) return;
    await fetch(`https://relayapi.sahildash.dev/hosts/${config.hostId}/library`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ games: config.games }),
    }).catch(() => { });
});

ipcMain.handle("get-host-library", async (_, hostId: string) => {
    const res = await fetch(`https://relayapi.sahildash.dev/hosts/${hostId}/library`);
    if (!res.ok) return null;
    return res.json();
});

ipcMain.handle("validate-code", async (_, code: string) => {
    const res = await fetch("https://relayapi.sahildash.dev/codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({})) as any;
        return { valid: false, reason: data.reason };
    }
    return res.json();
});

ipcMain.handle("get-client-config", () => {
    const config = getConfig() as any;
    if (!config?.clientId) return null;
    return {
        clientId: config.clientId,
        hostId: config.hostId,
        hostCode: config.hostCode,
        displayName: config.displayName,
    };
});

ipcMain.handle("save-client-config", (_, data: {
    clientId: string; hostId: string; hostCode: string; displayName: string;
}) => {
    const config = (getConfig() as any) ?? { mode: "client" };
    writeFileSync(configPath, JSON.stringify({ ...config, ...data }));
});

ipcMain.handle("get-hostname", () => hostname());

ipcMain.handle("quit-app", () => app.quit());

ipcMain.handle("get-devices", async () => {
    const config = getConfig() as any;
    if (!config?.hostId) return [];
    const res = await fetch(`https://relayapi.sahildash.dev/hosts/${config.hostId}/devices`);
    return res.json();
});

ipcMain.handle("rename-device", async (_, deviceId: string, name: string) => {
    const res = await fetch(`https://relayapi.sahildash.dev/devices/${deviceId}/name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });
    return res.json();
});

ipcMain.handle("revoke-device", async (_, deviceId: string) => {
    const res = await fetch(`https://relayapi.sahildash.dev/devices/${deviceId}`, { method: "DELETE" });
    return res.json();
});

ipcMain.handle("regenerate-code", async () => {
    const config = getConfig() as any;
    if (!config?.hostId) return null;
    const res = await fetch(`https://relayapi.sahildash.dev/hosts/${config.hostId}/regenerate-code`, { method: "POST" });
    const data = await res.json() as { code: string };
    writeFileSync(configPath, JSON.stringify({ ...config, code: data.code }));
    return data.code;
});

ipcMain.handle("get-startup-settings", () => {
    const config = getConfig() as any;
    return {
        launchOnLogin: app.getLoginItemSettings().openAtLogin,
        startMinimized: config?.startMinimized ?? false,
    };
});

ipcMain.handle("set-startup-settings", (_, settings: { launchOnLogin?: boolean; startMinimized?: boolean }) => {
    if (settings.launchOnLogin !== undefined) {
        app.setLoginItemSettings({ openAtLogin: settings.launchOnLogin });
    }
    if (settings.startMinimized !== undefined) {
        const config = (getConfig() as any) ?? {};
        writeFileSync(configPath, JSON.stringify({ ...config, startMinimized: settings.startMinimized }));
    }
});

ipcMain.handle("get-version", () => app.getVersion());

ipcMain.handle("launch-game", async (_, game: {
    appId: string; source: string; installDir: string; launchConfig: LaunchConfig;
}) => {
    const lc = game.launchConfig;
    if (lc.type === "steam") {
        shell.openExternal(`steam://rungameid/${game.appId}`);
    } else if (lc.type === "epic") {
        shell.openExternal(`com.epicgames.launcher://apps/${lc.epicAppName}?action=launch&silent=true`);
    } else if ((lc.type === "gog" || lc.type === "exe") && lc.exePath) {
        if (process.platform === "darwin" && lc.exePath.endsWith(".app")) {
            spawn("open", [lc.exePath], { detached: true, stdio: "ignore" }).unref();
        } else {
            spawn(lc.exePath, [], {
                detached: true, stdio: "ignore",
                cwd: lc.workingDir || game.installDir,
            }).unref();
        }
    }
});

ipcMain.handle("get-desktop-sources", async () => {
    const sources = await desktopCapturer.getSources({
        types: ["screen", "window"],
        thumbnailSize: { width: 1, height: 1 },
        fetchWindowIcons: false
    });
    return sources.map(s => ({ id: s.id, name: s.name }));
});

ipcMain.handle("is-game-running", (_, game: { name: string; executablePath?: string; launchConfig?: { exePath?: string } }) => {
    return new Promise<boolean>((resolve) => {
        const exePath = game.executablePath || game.launchConfig?.exePath || "";
        const exeName = exePath ? exePath.split(/[\\/]/).pop() ?? "" : "";
        const name = (game.name ?? "").toLowerCase();

        const runExec = (cmd: string) =>
            new Promise<string>((res) => exec(cmd, (err, stdout) => res(err ? "" : stdout)));

        (async () => {
            if (process.platform === "win32") {
                if (exeName) {
                    const out = await runExec(`tasklist /FI "IMAGENAME eq ${exeName}" /NH`);
                    if (out.toLowerCase().includes(exeName.toLowerCase())) return resolve(true);
                }
                const all = await runExec("tasklist /NH");
                return resolve(!!name && all.toLowerCase().includes(name));
            }
            const needle = (exeName ? exeName.replace(/\.exe$/i, "") : game.name) || "";
            if (!needle) return resolve(false);
            const out = await runExec(`pgrep -if ${JSON.stringify(needle)}`);
            return resolve(out.trim() !== "");
        })();
    });
});

ipcMain.handle("simulate-input", async (_, event) => {
    try {
        if (event.type === "mousemove") {
            const display = screen.getPrimaryDisplay();
            const x = Math.round(event.x * display.size.width);
            const y = Math.round(event.y * display.size.height);
            await mouse.setPosition(new Point(x, y));
        } else if (event.type === "mousedown") {
            await mouse.pressButton(Button[event.button as keyof typeof Button]);
        } else if (event.type === "mouseup") {
            await mouse.releaseButton(Button[event.button as keyof typeof Button]);
        } else if (event.type === "wheel") {
            const dy = Math.round(event.deltaY / 100);
            const dx = Math.round(event.deltaX / 100);
            if (dy > 0) await mouse.scrollDown(dy);
            else if (dy < 0) await mouse.scrollUp(-dy);
            if (dx > 0) await mouse.scrollRight(dx);
            else if (dx < 0) await mouse.scrollLeft(-dx);
        } else if (event.type === "keydown") {
            const key = mapKey(event.key);
            if (key !== undefined) await keyboard.pressKey(key);
        } else if (event.type === "keyup") {
            const key = mapKey(event.key);
            if (key !== undefined) await keyboard.releaseKey(key);
        }
    } catch (e) {
        console.error("[relay] input simulation failed:", e);
    }
});

ipcMain.handle("update-game-last-played", (_, appId: string) => {
    const config = getConfig() as any;
    if (!config?.games) return;

    const game = config.games.find((g: any) => g.appId === appId);
    if (game) {
        game.lastPlayed = new Date().toISOString();
        writeFileSync(configPath, JSON.stringify(config));

        if (config.hostId) {
            fetch(`https://relayapi.sahildash.dev/hosts/${config.hostId}/library`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ games: config.games }),
            }).catch(() => { });
        }
    }
});

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        show: false,
        autoHideMenuBar: true,
        backgroundColor: "#07101f",
        icon: join(__dirname, "../../build/icon.png"),
        webPreferences: {
            preload: join(__dirname, "../preload/index.js"),
            sandbox: false,
            backgroundThrottling: false,
        },
    });

    mainWindow.on("ready-to-show", () => {
        const startMinimized = (getConfig() as any)?.startMinimized ?? false;
        if (!(startMinimized && tray)) mainWindow!.show();
    });

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: "deny" };
    });

    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
        mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    } else {
        mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
    }
}

app.commandLine.appendSwitch("enable-features", [
    "MacLoopbackAudioForScreenShare",
    "PlatformHEVCDecoderSupport"
].join(","));
app.commandLine.appendSwitch("disable-features", "WebRtcHideLocalIpsWithMdns");
app.commandLine.appendSwitch("max-gum-fps", "60");
app.commandLine.appendSwitch("ignore-gpu-blocklist");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.commandLine.appendSwitch("force-fieldtrials", "WebRTC-FrameDropper/Disabled/");

app.whenReady().then(() => {
    electronApp.setAppUserModelId("com.relay");

    session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
        desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width: 1, height: 1 } }).then((sources) => {
            if (sources.length > 0) {
                callback({ video: sources[0], audio: "loopback" });
            } else {
                callback({});
            }
        });
    });

    app.on("browser-window-created", (_, window) => {
        optimizer.watchWindowShortcuts(window);
    });

    createTray();
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});