# FORTISSIMO Desktop

FORTISSIMO Desktop is a minimal Windows Electron shell around the production FORTISSIMO web app.

## Architectural rule

FORTISSIMO Web remains the source of truth. The Desktop shell must not duplicate Vibe Roulette, authentication, music logic, datasets, S.K.Y. Keys, or cloud state. Native Windows capabilities are exposed only through a narrow preload bridge.

## Phase 4 capabilities

- Loads the production FORTISSIMO app over HTTPS (`https://fortegym.vercel.app/`).
- Uses the persistent Electron partition `persist:fortissimo-main` for the Desktop profile.
- Reuses the existing FORTISSIMO login/cloud account flow and “Mantener sesión iniciada” behavior.
- Exposes only `window.fortissimoDesktop` to the web renderer.
- Reports `persistent-session`, `midi-stage` and `midi-drag` capabilities.
- Preserves Phase 3 staging: exactly two MIDI files, Foundation + Texture, are validated before any disk access.
- Validates the renderer origin, stage ownership, stage age, safe filenames, payload size and Standard MIDI File structure.
- Creates temporary `.mid` files only under the app-controlled Windows temp path `FORTISSIMO/midi-drag/<renderer-id>`.
- The remote web renderer never receives filesystem APIs and cannot choose a Windows path.
- Calls Electron `webContents.startDrag({ files, icon })` only for the current validated stage.
- Uses Electron 44 multi-file drag so Foundation + Texture can travel together into a DAW.
- Removes temporary drag material when a new stage replaces it, the renderer closes, or the app quits.
- Keeps Node.js integration disabled, context isolation enabled and renderer sandboxing enabled.
- Never launches Ableton, scans DAW folders, spawns processes or controls the DAW directly.

## Vibe Roulette UX

Inside the installed Windows app, the Desktop-only module prepares the current Song Starter MIDI pair silently whenever the Vibe Roulette arrangement changes. Once the exact current performance is staged, the control becomes draggable:

`↗ Drag 2 MIDI → DAW`

Dragging it invokes the native Windows file drag. There is no Downloads-folder step. The underlying MIDI source remains the existing Song Starter exporter, so pitch, velocity, duration, Human Pianist finger microtiming and A/A′ placement continue to come from the same musical engine.

The normal web app does not load this native drag module because it only activates when the Electron bridge reports the `midi-drag` capability.

## Windows package

Electron Forge + Squirrel.Windows produce an unsigned installer named:

`FORTISSIMO-Setup.exe`

No code-signing certificate is required for this internal build. Windows SmartScreen may therefore show an unrecognized-publisher warning.

The GitHub Desktop workflow validates the security contracts on Linux and then builds the actual Windows installer on `windows-latest`. Successful push builds upload a `FORTISSIMO-Windows-Phase4` artifact containing the setup executable and Squirrel update files.

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
npm run make
```
