import { contextBridge, ipcRenderer } from "electron";
import {
	SETTINGS_CHANNELS,
	type AppPrefs,
	type SettingsApi,
	type UiDensity,
	type UiTheme,
} from "../src/shared/prefs";
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

const settings: SettingsApi = {
	getPrefs: () => ipcRenderer.invoke(SETTINGS_CHANNELS.getPrefs) as Promise<AppPrefs>,
	setUiDensity: (density: UiDensity) =>
		ipcRenderer.invoke(SETTINGS_CHANNELS.setUiDensity, density) as Promise<AppPrefs>,
	setUiTheme: (theme: UiTheme) =>
		ipcRenderer.invoke(SETTINGS_CHANNELS.setUiTheme, theme) as Promise<AppPrefs>,
};

contextBridge.exposeInMainWorld("phantasmal", {
	platform: process.platform,
	vault,
	settings,
});
