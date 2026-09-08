import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("phantasmal", {
	platform: process.platform,
});
