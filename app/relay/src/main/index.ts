import { app, shell, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { existsSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { homedir, hostname } from "os";

// todo: epicgames, gog, etc.
interface ScannedGame {
    appId: string;
    name: string;
    installDir: string;
    sizeOnDisk: number;
    source: "steam";
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

                    games.push({
                        appId,
                        name: d["name"] ?? `App ${appId}`,
                        installDir: join(appsDir, "common", d["installdir"] ?? ""),
                        sizeOnDisk: parseInt(d["sizeondisk"] ?? "0", 10),
                        source: "steam",
                    });
                } catch { }
            }
        }
    }

    return games.sort((a, b) => a.name.localeCompare(b.name));
}


ipcMain.handle("get-mode", () => getConfig()?.mode ?? null);
ipcMain.handle("set-mode", (_, mode: "host" | "client") => saveConfig(mode));

ipcMain.handle("get-host-config", () => {
    const config = getConfig() as any;
    if (!config?.hostId) return null;
    return { hostId: config.hostId, code: config.code };
});

ipcMain.handle("register-host", async () => {
    const res = await fetch("http://localhost:6004/hosts/register", { method: "POST" });
    const data = await res.json() as { hostId: string; code: string };
    const config = getConfig() ?? { mode: "host" as const };
    writeFileSync(configPath, JSON.stringify({ ...config, ...data }));
    return data;
});

ipcMain.handle("scan-games", () => scanSteamGames());

ipcMain.handle("get-saved-games", () => {
    const config = getConfig() as any;
    return config?.games ?? null;
});

ipcMain.handle("save-games", async (_, games: unknown) => {
    const config = (getConfig() as any) ?? { mode: "host" };
    writeFileSync(configPath, JSON.stringify({ ...config, games }));
    if (config.hostId) {
        fetch(`http://localhost:6004/hosts/${config.hostId}/library`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ games }),
        }).catch(() => { });
    }
});

ipcMain.handle("push-library", async () => {
    const config = getConfig() as any;
    if (!config?.hostId || !config?.games) return;
    await fetch(`http://localhost:6004/hosts/${config.hostId}/library`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ games: config.games }),
    }).catch(() => { });
});

ipcMain.handle("get-host-library", async (_, hostId: string) => {
    const res = await fetch(`http://localhost:6004/hosts/${hostId}/library`);
    if (!res.ok) return null;
    return res.json();
});

ipcMain.handle("validate-code", async (_, code: string) => {
    const res = await fetch("http://localhost:6004/codes/validate", {
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
    const res = await fetch(`http://localhost:6004/hosts/${config.hostId}/devices`);
    return res.json();
});

ipcMain.handle("rename-device", async (_, deviceId: string, name: string) => {
    const res = await fetch(`http://localhost:6004/devices/${deviceId}/name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });
    return res.json();
});

ipcMain.handle("revoke-device", async (_, deviceId: string) => {
    const res = await fetch(`http://localhost:6004/devices/${deviceId}`, { method: "DELETE" });
    return res.json();
});

ipcMain.handle("regenerate-code", async () => {
    const config = getConfig() as any;
    if (!config?.hostId) return null;
    const res = await fetch(`http://localhost:6004/hosts/${config.hostId}/regenerate-code`, { method: "POST" });
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

function createWindow(): void {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        show: false,
        autoHideMenuBar: true,
        backgroundColor: "#07101f",
        webPreferences: {
            preload: join(__dirname, "../preload/index.js"),
            sandbox: false,
        },
    });

    mainWindow.on("ready-to-show", () => mainWindow.show());

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

app.whenReady().then(() => {
    electronApp.setAppUserModelId("com.relay");

    app.on("browser-window-created", (_, window) => {
        optimizer.watchWindowShortcuts(window);
    });

    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});