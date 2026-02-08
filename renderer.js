const minimizeButton = document.getElementById("minimize");
const maximizeButton = document.getElementById("maximize");
const closeButton = document.getElementById("close");
const gmailWebview = document.getElementById("gmail");

function applyTheme(mode) {
	document.documentElement.dataset.theme = mode === "dark" ? "dark" : "light";
}

function updateMaximizeButton() {
	if (!maximizeButton) {
		return;
	}

	window.windowControls.isMaximized().then((isMaximized) => {
		maximizeButton.textContent = isMaximized ? "❐" : "+";
	});
}

if (minimizeButton) {
	minimizeButton.addEventListener("click", () => {
		window.windowControls.minimize();
	});
}

if (maximizeButton) {
	maximizeButton.addEventListener("click", () => {
		window.windowControls.maximizeToggle();
		setTimeout(updateMaximizeButton, 50);
	});
}

if (closeButton) {
	closeButton.addEventListener("click", () => {
		window.windowControls.close();
	});
}

gmailWebview.addEventListener("dom-ready", () => {
	const title = gmailWebview.getTitle() || "Gmail";
	document.title = title;
});

gmailWebview.addEventListener("page-title-updated", (event) => {
	const title = event.title || "Gmail";
	document.title = title;
});

gmailWebview.addEventListener("ipc-message", (event) => {
	if (event.channel !== "gmail-notification" || !event.args[0]) {
		return;
	}

	window.windowControls.notify(event.args[0]);
});

window.windowControls.getSystemThemeMode().then(applyTheme).catch(() => {
	applyTheme("light");
});

window.windowControls.onThemeUpdated((mode) => {
	applyTheme(mode);
});

window.addEventListener("resize", updateMaximizeButton);
updateMaximizeButton();
