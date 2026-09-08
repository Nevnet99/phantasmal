import { contextBridge, ipcRenderer } from "electron";
import { VAULT_CHANNELS, type VaultApi, type VaultStatus } from "../src/shared/vault";

const vault: VaultApi = {
	getStatus: () => ipcRenderer.invoke(VAULT_CHANNELS.getStatus) as Promise<VaultStatus>,
	chooseFolder: () => ipcRenderer.invoke(VAULT_CHANNELS.chooseFolder) as Promise<VaultStatus>,
	openExistingVault: () =>
		ipcRenderer.invoke(VAULT_CHANNELS.openExistingVault) as Promise<VaultStatus>,
	useDefaultLocation: () =>
		ipcRenderer.invoke(VAULT_CHANNELS.useDefaultLocation) as Promise<VaultStatus>,
	revealInFolder: () => ipcRenderer.invoke(VAULT_CHANNELS.revealInFolder) as Promise<boolean>,
};

contextBridge.exposeInMainWorld("phantasmal", {
	platform: process.platform,
	vault,
});
