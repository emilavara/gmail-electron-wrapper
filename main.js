const path = require("path");
const fs = require("fs");
const {
	app,
	BrowserWindow,
	dialog,
	ipcMain,
	Menu,
	Notification,
	nativeTheme,
	session,
	shell,
} = require("electron");

let mainWindow;
const assetsDir = path.join(__dirname, "assets");
const webviewPreloadPath = path.join(__dirname, "webview-preload.js");
const gmailPartition = "persist:gmail-wrapper";

function firstExistingPath(candidates) {
	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) {
			return candidate;
		}
	}

	return null;
}

const dockIconPath = firstExistingPath([
	path.join(assetsDir, "icon.png"),
	path.join(assetsDir, "icon.icns"),
]);

const windowIconPath = firstExistingPath(
	process.platform === "win32"
		? [path.join(assetsDir, "icon.ico"), path.join(assetsDir, "icon.png")]
		: [path.join(assetsDir, "icon.png")],
);

const notificationIconPath = firstExistingPath([
	path.join(assetsDir, "notification.png"),
	path.join(assetsDir, "icon.png"),
]);

function getSystemThemeMode() {
	return nativeTheme.shouldUseDarkColors ? "dark" : "light";
}

function getWindowBackgroundColor() {
	return getSystemThemeMode() === "dark" ? "#111111" : "#f1f3f5";
}

const webviewCss = `
.gb_rd {
	flex-direction: row-reverse !important;
	padding-left: 25px !important;
	padding-right: 0 !important;
	justify-content: space-between !important;
}

.gb_jd, .zo, .r4vW1e {
	display: none !important;
}
`;

app.setName("Gmail");

if (process.platform === "darwin") {
	app.setAboutPanelOptions({
		applicationName: "Gmail",
		applicationVersion: app.getVersion(),
		copyright: "©2026 Google - Wrapped by @emilavara",
	});
}

function showNativeNotification(payload = {}) {
	const title =
		typeof payload.title === "string" && payload.title.trim().length > 0
			? payload.title.trim()
			: "Gmail";
	const body = typeof payload.body === "string" ? payload.body : "";

	const notificationOptions = {
		title,
		body,
		silent: Boolean(payload.silent),
	};

	// macOS already shows the app icon; adding icon can create a duplicate icon effect.
	if (process.platform !== "darwin" && notificationIconPath) {
		notificationOptions.icon = notificationIconPath;
	}

	const notification = new Notification(notificationOptions);

	notification.on("click", () => {
		if (!mainWindow) {
			return;
		}

		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}

		mainWindow.show();
		mainWindow.focus();
	});

	notification.show();
}

async function purgeAllAccountsAndReset() {
	const result = await dialog.showMessageBox(mainWindow, {
		type: "warning",
		buttons: ["Cancel", "Purge And Restart"],
		defaultId: 0,
		cancelId: 0,
		title: "Purge App Data",
		message: "Purge all Gmail accounts and reset app data?",
		detail:
			"This will clear cookies, cache, storage, and authentication data for this app. The app will restart.",
	});

	if (result.response !== 1) {
		return;
	}

	try {
		const gmailSession = session.fromPartition(gmailPartition);
		await gmailSession.clearStorageData();
		await gmailSession.clearAuthCache();
		await gmailSession.clearCache();
		gmailSession.flushStorageData();

		app.relaunch();
		app.exit(0);
	} catch (error) {
		await dialog.showMessageBox(mainWindow, {
			type: "error",
			title: "Reset Failed",
			message: "Could not purge app data.",
			detail: error instanceof Error ? error.message : String(error),
		});
	}
}

function createApplicationMenu() {
	const isMac = process.platform === "darwin";
	const template = [
		...(isMac
			? [
					{
						label: app.name,
						submenu: [
							{ role: "about" },
							{ type: "separator" },
							{ role: "services" },
							{ type: "separator" },
							{ role: "hide" },
							{ role: "hideOthers" },
							{ role: "unhide" },
							{ type: "separator" },
							{ role: "quit" },
						],
					},
			  ]
			: []),
		{ role: "fileMenu" },
		{ role: "editMenu" },
		{ role: "viewMenu" },
		{ role: "windowMenu" },
		{
			role: "help",
			submenu: [
				{
					label: "Purge All Accounts And Reset App",
					click: () => {
						purgeAllAccountsAndReset().catch(() => {});
					},
				},
			],
		},
	];

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}

function createWindow() {
	mainWindow = new BrowserWindow({
		title: "Gmail",
		width: 1280,
		height: 800,
		minWidth: 900,
		minHeight: 600,
		autoHideMenuBar: true,
		frame: false,
		titleBarStyle: "hidden",
		backgroundColor: getWindowBackgroundColor(),
		...(windowIconPath ? { icon: windowIconPath } : {}),
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			webviewTag: true,
			preload: path.join(__dirname, "preload.js"),
		},
	});

	mainWindow.webContents.on(
		"will-attach-webview",
		(_event, webPreferences) => {
			webPreferences.preload = webviewPreloadPath;
			webPreferences.nodeIntegration = false;
			webPreferences.contextIsolation = false;
			webPreferences.sandbox = false;
		},
	);

	mainWindow.loadFile("index.html");

	mainWindow.webContents.on("did-finish-load", () => {
		mainWindow?.webContents.send("theme:updated", getSystemThemeMode());
	});
}

app.whenReady().then(() => {
	nativeTheme.themeSource = "system";
	createApplicationMenu();

	if (process.platform === "darwin" && dockIconPath) {
		app.dock.setIcon(dockIconPath);
	}

	const gmailSession = session.fromPartition(gmailPartition);

	gmailSession.setPermissionRequestHandler(
		(_webContents, permission, callback) => {
			callback(permission !== "notifications");
		},
	);

	gmailSession.setPermissionCheckHandler((_webContents, permission) => {
		return permission !== "notifications";
	});

	app.on("web-contents-created", (_event, contents) => {
		if (contents.getType() !== "webview") {
			return;
		}

		contents.on("did-finish-load", () => {
			if (!webviewCss) {
				return;
			}

			contents.insertCSS(webviewCss).catch(() => {});
		});

		contents.setWindowOpenHandler(({ url }) => {
			if (url.startsWith("http://") || url.startsWith("https://")) {
				contents.loadURL(url).catch(() => {});
				return { action: "deny" };
			}

			shell.openExternal(url).catch(() => {});
			return { action: "deny" };
		});
	});

	ipcMain.on("window:minimize", () => {
		mainWindow?.minimize();
	});

	ipcMain.on("window:maximize-toggle", () => {
		if (!mainWindow) {
			return;
		}

		if (mainWindow.isMaximized()) {
			mainWindow.unmaximize();
			return;
		}

		mainWindow.maximize();
	});

	ipcMain.on("window:close", () => {
		mainWindow?.close();
	});

	ipcMain.handle("window:is-maximized", () => {
		return mainWindow?.isMaximized() ?? false;
	});

	ipcMain.handle("theme:get-system-mode", () => {
		return getSystemThemeMode();
	});

	ipcMain.on("gmail:notify", (_event, payload) => {
		showNativeNotification(payload);
	});

	nativeTheme.on("updated", () => {
		if (!mainWindow) {
			return;
		}

		mainWindow.setBackgroundColor(getWindowBackgroundColor());
		mainWindow.webContents.send("theme:updated", getSystemThemeMode());
	});

	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
