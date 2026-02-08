const { ipcRenderer } = require("electron");

function toNotificationPayload(title, options = {}) {
	return {
		title: typeof title === "string" && title.trim().length > 0 ? title.trim() : "Gmail",
		body: typeof options.body === "string" ? options.body : "",
		silent: Boolean(options.silent),
	};
}

function forwardNotification(title, options) {
	ipcRenderer.sendToHost("gmail-notification", toNotificationPayload(title, options));
}

function patchNotifications() {
	if (window.__gmailNotificationPatched) {
		return;
	}

	window.__gmailNotificationPatched = true;

	function NotificationShim(title, options = {}) {
		forwardNotification(title, options);
		this.close = () => {};
	}

	NotificationShim.requestPermission = (callback) => {
		const result = Promise.resolve("granted");
		if (typeof callback === "function") {
			result.then(callback);
		}
		return result;
	};

	Object.defineProperty(NotificationShim, "permission", {
		get() {
			return "granted";
		},
	});

	window.Notification = NotificationShim;

	if (navigator.permissions && typeof navigator.permissions.query === "function") {
		const originalQuery = navigator.permissions.query.bind(navigator.permissions);
		navigator.permissions.query = (descriptor) => {
			if (descriptor && descriptor.name === "notifications") {
				return Promise.resolve({
					state: "granted",
					onchange: null,
					addEventListener() {},
					removeEventListener() {},
					dispatchEvent() {
						return false;
					},
				});
			}

			return originalQuery(descriptor);
		};
	}

	const serviceWorkerProto = window.ServiceWorkerRegistration?.prototype;
	if (serviceWorkerProto && typeof serviceWorkerProto.showNotification === "function") {
		serviceWorkerProto.showNotification = function patchedShowNotification(
			title,
			options = {},
		) {
			forwardNotification(title, options);
			return Promise.resolve();
		};
	}
}

patchNotifications();
setInterval(patchNotifications, 2000);
