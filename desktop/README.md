# FORTISSIMO Desktop

Phase 1 creates a minimal Windows Electron shell around the production FORTISSIMO web app.

## Architectural rule

FORTISSIMO Web remains the source of truth. The Desktop shell must not duplicate Vibe Roulette, authentication, music logic, datasets, S.K.Y. Keys, or cloud state. Native Windows capabilities are exposed only through a narrow preload bridge.

## Phase 1 capabilities

- Loads the production FORTISSIMO app over HTTPS (`https://fortegym.vercel.app/`).
- Uses Electron's persistent default session, so Desktop can keep its own remembered FORTISSIMO login.
- Exposes only `window.fortissimoDesktop` to the web app.
- `window.fortissimoDesktop.capabilities` is intentionally empty in Phase 1.
- Keeps Node.js integration disabled.
- Keeps context isolation and renderer sandboxing enabled.
- Blocks `<webview>` attachment.
- Restricts in-app navigation to approved FORTISSIMO origins.
- Sends external HTTP(S)/mailto links to the user's normal browser/mail handler.
- Allows only media and notification permissions requested by an approved FORTISSIMO origin.
- Does not implement MIDI drag-and-drop yet.

## Development

Requirements: Node.js 22+ and npm.

```powershell
cd desktop
npm install
npm start
```

To point the shell at another approved HTTPS FORTISSIMO deployment while testing:

```powershell
$env:FORTISSIMO_APP_URL="https://fortegym.vercel.app/"
npm start
```

To enable DevTools for local testing:

```powershell
$env:FORTISSIMO_DEVTOOLS="1"
npm start
```

## Validation

```powershell
npm test
```

Phase 2/3 will extend the bridge only when a native feature is needed. MIDI generation remains in the existing FORTISSIMO web code; the future Electron bridge will receive generated MIDI bytes and perform the Windows-native file drag.
