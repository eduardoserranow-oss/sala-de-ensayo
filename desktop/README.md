# FORTISSIMO Desktop

FORTISSIMO Desktop is a minimal Windows Electron shell around the production FORTISSIMO web app.

## Architectural rule

FORTISSIMO Web remains the source of truth. The Desktop shell must not duplicate Vibe Roulette, authentication, music logic, datasets, S.K.Y. Keys, or cloud state. Native Windows capabilities are exposed only through a narrow preload bridge.

## Phase 2 capabilities

- Loads the production FORTISSIMO app over HTTPS (`https://fortegym.vercel.app/`).
- Uses an explicit persistent Electron partition (`persist:fortissimo-main`) for the FORTISSIMO profile.
- Reuses the existing FORTISSIMO login and cloud account flow; there is no separate Desktop account system.
- Respects the existing “Mantener sesión iniciada” behavior: remembered sessions live in persistent local storage; non-remembered sessions remain session-only.
- Exposes only `window.fortissimoDesktop` to the web app.
- Reports the non-privileged `persistent-session` capability.
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

Phase 3 will add only the next narrow bridge capability needed by the product. MIDI generation remains in the existing FORTISSIMO web code; the future Electron bridge will receive generated MIDI bytes and perform the Windows-native file drag.
