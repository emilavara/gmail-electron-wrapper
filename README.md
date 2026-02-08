# gmail-electron-wrapper

a minimal electron desktop wrapper for Gmail. built as result of my hatred for browser tabs.

## all it does

- loads `https://mail.google.com` inside an electron `webview`.
- uses a custom frameless window shell.
- supports desktop notifications
    - enable them in your Gmail settings
    - allow notifications on your desktop
    - to avoid duplicate notification sounds, set the Gmail notification sound to silent and let the system handle it

## run

```bash
npm install
npm start
```

## build

```bash
npm run dist:mac || npm run dist:win || npm run dist:linux
```

## boring legal disclaimer

this is an unofficial wrapper and is not affiliated with Google.
