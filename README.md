# iPod nano (5th generation)

A production-ready iPhone and Android app that recreates the 5th-generation iPod nano: Click Wheel, menus, Now Playing, Cover Flow, and playback of music, videos, and photos from a storage folder you choose.

## What it does

Point the app at the **top-level folder of a storage volume** (phone storage, SD card, USB OTG, or a copied iPod/disk library). It recursively finds audio, video, photos, and notes, then organizes them the way the nano did.

Main menu:

- **Music** — Cover Flow, Playlists, Artists, Albums, Songs, Podcasts, Genres, Composers, Audiobooks, Search
- **Videos** — Movies, TV Shows, Music Videos, Video Podcasts, Camera Videos
- **Photos** — Photo Library and albums by folder
- **Radio** — FM-style tuner over internet radio streams
- **Extras** — Clock, Brick, Notes, Voice Memos, Pedometer, Stopwatch
- **Settings** — About, Library, Shuffle, Repeat, EQ, backlight, brightness, clicker, finish color
- **Shuffle Songs** — plays the whole music library at random

The Click Wheel scrolls lists, the center button selects, **MENU** goes back (hold for the main menu), and the outer buttons skip and play/pause. A HOLD switch on the top edge disables the wheel.

## Load your library

1. After the Apple boot screen, open **Settings → Library**.
2. Choose **Computer Folder** to pick a folder on the machine running `npm start`. A native folder dialog opens on that computer; the phone then streams music, videos, and photos over the local network.
3. Or choose **Phone Folder** and pick a folder on the device (internal storage, SD card, USB OTG).
4. Or choose **Device Library** to import from the system media library.

The scanner:

- Walks nested folders (Music/Artist/Album, Movies, DCIM, `iPod_Control/Music/F00`, and similar)
- Reads ID3 tags (title, artist, album, genre, track, lyrics, artwork)
- Uses `cover.jpg` / `folder.jpg` in a folder when tags have no art
- Classifies podcasts, audiobooks, TV episodes (`S01E02`), and camera videos by path
- Caches the catalog so the next launch is instant

## Run it

```bash
npm install
npm start
```

That starts Expo and a local media server on port **3847**. Scan the QR code with Expo Go. The phone and the computer must be on the same Wi‑Fi.

To pick a folder from the terminal instead of the in-app menu:

```bash
npm run media -- /path/to/Music
```

On WSL2 the phone often cannot reach the Linux VM IP. Use your Windows LAN address:

```bash
EXPO_PUBLIC_MEDIA_HOST=192.168.1.50 npm start
```

You can also set `"extra": { "mediaHost": "192.168.1.50" }` in `app.json`. Phone folder and device library still work if the computer server is unreachable.

Folder access on the phone, background audio, and lock-screen controls are complete in a **development or production build**:

```bash
npx expo prebuild
npx expo run:ios
npx expo run:android
```

Or with EAS:

```bash
npm install -g eas-cli
eas build --platform ios
eas build --platform android --profile preview
```

## Controls

| Control | Action |
| --- | --- |
| Drag around the wheel | Scroll / change volume on Now Playing / tune radio |
| Center button | Select. On Now Playing, cycle scrubber, shuffle, rating, lyrics |
| Hold center | Start Genius, add to On-The-Go, browse album |
| MENU | Previous screen |
| Hold MENU | Main menu |
| ▶❚❚ | Play / pause |
| \|<< >>\| | Previous / next track (or station / photo) |
| HOLD switch | Disable the Click Wheel |
| Shake | Skip to another song (Settings → Playback → Shake) |
| Rotate | Cover Flow (Settings → General → Rotate) |

## Notes

- Radio uses public SomaFM streams presented as an FM tuner. Phones do not have a real FM chip.
- Computer Folder streams from the build machine. Keep `npm start` running. The last folder is remembered in `.media-root`.
- iOS folder access is granted per session; pick the folder again after a restart, or use Device Library.
- Android Storage Access Framework keeps folder permission across launches.
- Background playback and lock-screen metadata need a native build (`expo-audio` lock screen + `UIBackgroundModes` / foreground service).

## Stack

Expo SDK 54 (Expo Go 54), React Native 0.81, TypeScript, Zustand, expo-audio, expo-video, expo-file-system, expo-media-library.
