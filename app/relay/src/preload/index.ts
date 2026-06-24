import { contextBridge, ipcRenderer } from "electron";

if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld("relay", {
            getMode: () => ipcRenderer.invoke("get-mode"),
            setMode: (mode: "host" | "client") => ipcRenderer.invoke("set-mode", mode),
        });
    } catch (error) {
        console.error(error);
    }
} else {
    (window as any).relay = {
        getMode: () => ipcRenderer.invoke("get-mode"),
        setMode: (mode: "host" | "client") => ipcRenderer.invoke("set-mode", mode),
    };
}