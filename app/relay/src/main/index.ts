import { app, shell, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";

const configPath = join(app.getPath("userData"), "config.json");

function getConfig(): { mode: "host" | "client" } | null {
    if (!existsSync(configPath)) return null;
    return JSON.parse(readFileSync(configPath, "utf-8"));
}

function saveConfig(mode: "host" | "client"): void {
    writeFileSync(configPath, JSON.stringify({ mode }));
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