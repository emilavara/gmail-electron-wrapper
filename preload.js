const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("windowControls", {
	minimize: () => ipcRenderer.send("window:minimize"),
	maximizeToggle: () => ipcRenderer.send("window:maximize-toggle"),
	close: () => ipcRenderer.send("window:close"),
	isMaximized: () => ipcRenderer.invoke("window:is-maximized"),
	notify: (payload) => ipcRenderer.send("gmail:notify", payload),
	getSystemThemeMode: () => ipcRenderer.invoke("theme:get-system-mode"),
	onThemeUpdated: (callback) => {
		if (typeof callback !== "function") {
			return () => {};
		}

		const listener = (_event, mode) => {
			callback(mode);
		};

		ipcRenderer.on("theme:updated", listener);
		return () => ipcRenderer.removeListener("theme:updated", listener);
	},
});
