# gmail-electron-wrapper

a minimal electron desktop wrapper for gmail. built as result of my hatred for browser tabs.

## all it does

- loads `https://mail.google.com` inside an electron `webview`.
- uses a custom frameless window shell.
- supports desktop notifications
    - enable them in your gmail settings
    - allow notifications on your desktop
    - to avoid duplicate notification sounds, set the gmail notification sound to silent and let the system handle it, or do it vice versa idgaf

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

this is an unofficial wrapper and is not affiliated with Google (please don't sue me)
