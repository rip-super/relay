import { contextBridge, ipcRenderer } from "electron";

if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld("relay", {
            platform: process.platform,
            getMode: () => ipcRenderer.invoke("get-mode"),
            setMode: (mode: "host" | "client") => ipcRenderer.invoke("set-mode", mode),
            getHostConfig: () => ipcRenderer.invoke("get-host-config"),
            registerHost: () => ipcRenderer.invoke("register-host"),
            scanGames: () => ipcRenderer.invoke("scan-games"),
            getSavedGames: () => ipcRenderer.invoke("get-saved-games"),
            saveGames: (games: any[]) => ipcRenderer.invoke("save-games", games),
            quitApp: () => ipcRenderer.invoke("quit-app"),
            getDevices: () => ipcRenderer.invoke("get-devices"),
            renameDevice: (id: string, name: string) => ipcRenderer.invoke("rename-device", id, name),
            revokeDevice: (id: string) => ipcRenderer.invoke("revoke-device", id),
            regenerateCode: () => ipcRenderer.invoke("regenerate-code"),
            getStartupSettings: () => ipcRenderer.invoke("get-startup-settings"),
            setStartupSettings: (s: object) => ipcRenderer.invoke("set-startup-settings", s),
            getVersion: () => ipcRenderer.invoke("get-version"),
            pushLibrary: () => ipcRenderer.invoke("push-library"),
            getHostLibrary: (hostId: string) => ipcRenderer.invoke("get-host-library", hostId),
            validateCode: (code: string) => ipcRenderer.invoke("validate-code", code),
            getClientConfig: () => ipcRenderer.invoke("get-client-config"),
            saveClientConfig: (d: object) => ipcRenderer.invoke("save-client-config", d),
            getHostname: () => ipcRenderer.invoke("get-hostname"),
            launchGame: (game: object) => ipcRenderer.invoke("launch-game", game),
            getDesktopSources: () => ipcRenderer.invoke("get-desktop-sources"),
            simulateInput: (event: any) => ipcRenderer.invoke("simulate-input", event),
            isGameRunning: (game: any) => ipcRenderer.invoke("is-game-running", game),
        });
    } catch (error) {
        console.error(error);
    }
} else {
    (window as any).relay = {
        platform: process.platform,
        getMode: () => ipcRenderer.invoke("get-mode"),
        setMode: (mode: "host" | "client") => ipcRenderer.invoke("set-mode", mode),
        getHostConfig: () => ipcRenderer.invoke("get-host-config"),
        registerHost: () => ipcRenderer.invoke("register-host"),
        scanGames: () => ipcRenderer.invoke("scan-games"),
        getSavedGames: () => ipcRenderer.invoke("get-saved-games"),
        saveGames: (games: any[]) => ipcRenderer.invoke("save-games", games),
        quitApp: () => ipcRenderer.invoke("quit-app"),
        getDevices: () => ipcRenderer.invoke("get-devices"),
        renameDevice: (id: string, name: string) => ipcRenderer.invoke("rename-device", id, name),
        revokeDevice: (id: string) => ipcRenderer.invoke("revoke-device", id),
        regenerateCode: () => ipcRenderer.invoke("regenerate-code"),
        getStartupSettings: () => ipcRenderer.invoke("get-startup-settings"),
        setStartupSettings: (s: object) => ipcRenderer.invoke("set-startup-settings", s),
        getVersion: () => ipcRenderer.invoke("get-version"),
        pushLibrary: () => ipcRenderer.invoke("push-library"),
        getHostLibrary: (hostId: string) => ipcRenderer.invoke("get-host-library", hostId),
        validateCode: (code: string) => ipcRenderer.invoke("validate-code", code),
        getClientConfig: () => ipcRenderer.invoke("get-client-config"),
        saveClientConfig: (d: object) => ipcRenderer.invoke("save-client-config", d),
        getHostname: () => ipcRenderer.invoke("get-hostname"),
        launchGame: (game: object) => ipcRenderer.invoke("launch-game", game),
        getDesktopSources: () => ipcRenderer.invoke("get-desktop-sources"),
        simulateInput: (event: any) => ipcRenderer.invoke("simulate-input", event),
        isGameRunning: (game: any) => ipcRenderer.invoke("is-game-running", game),
    };
}