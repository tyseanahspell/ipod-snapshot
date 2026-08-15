# iPod nano (5th generation)

A web recreation of the 5th-generation iPod nano: Click Wheel, menus, Now Playing, Cover Flow, and playback of music, videos, and photos from a folder on this computer.

## Run locally

```bash
npm install
npm start
```

Opens the iPod in the browser and starts a media server on port **3847**. After the boot screen, **Settings → Library**:

- **Server Folder** — load the folder served by `npm start` / Docker (`MEDIA_ROOT`)
- **This Computer** — pick a folder in the browser (Chrome / Edge)

## Deploy with Docker

```bash
./scripts/deploy.sh /path/to/Music
```

That builds the web app, serves it at **http://localhost:8080**, and streams the folder you passed in. Change the port with `PORT=9090 ./scripts/deploy.sh /path/to/Music`.

Stop it with `docker compose down`.

## What it does

The scanner walks nested folders (Music/Artist/Album, Movies, DCIM, `iPod_Control/Music/F00`, and similar), reads ID3 tags, uses `cover.jpg` / `folder.jpg` when tags have no art, and classifies podcasts, audiobooks, and TV episodes.

Main menu:

- **Music** — Cover Flow, Playlists, Artists, Albums, Songs, Podcasts, Genres, Composers, Audiobooks, Search
- **Videos** — Movies, TV Shows, Music Videos, Video Podcasts, Camera Videos
- **Photos** — Photo Library and albums by folder
- **Radio** — FM-style tuner over internet radio streams
- **Extras** — Clock, Brick, Notes, Voice Memos, Pedometer, Stopwatch
- **Settings** — About, Library, Shuffle, Repeat, EQ, backlight, brightness, clicker, finish color
- **Shuffle Songs** — plays the whole music library at random

## Controls

| Control | Action |
| --- | --- |
| Drag around the wheel | Scroll / change volume on Now Playing / tune radio |
| Arrow keys or J / K | Scroll |
| Center button or Enter | Select. On Now Playing, cycle scrubber, shuffle, rating, lyrics |
| Hold center | Start Genius, add to On-The-Go, browse album |
| MENU or Esc | Previous screen |
| Hold MENU | Main menu |
| ▶❚❚ or Space | Play / pause |
| ← → | Previous / next track (or station / photo) |
| HOLD switch or H | Disable the Click Wheel |

## Notes

- Radio uses public SomaFM streams presented as an FM tuner.
- **This Computer** keeps files in the browser tab; pick the folder again after a reload.
- **Server Folder** / Docker streams from the mounted directory and survives reloads.

## Stack

Expo SDK 57 (web), React Native Web, TypeScript, Zustand, expo-audio, expo-video. Production is a static export plus a Node media server in Docker.
