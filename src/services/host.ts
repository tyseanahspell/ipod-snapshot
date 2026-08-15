import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const MEDIA_PORT = 3847;

function hostFromExpo(): string | null {
  const go = Constants.expoGoConfig as { debuggerHost?: string } | null;
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.linkingUri,
    (Constants as { debuggerHost?: string }).debuggerHost,
    go?.debuggerHost,
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const cleaned = raw.replace(/^\w+:\/\//, '').split('/')[0];
    const host = cleaned.split(':')[0];
    if (host && host !== 'exp.host' && host !== 'u.expo.dev') return host;
  }
  return null;
}

function overrideBase(): string | null {
  const extra = Constants.expoConfig?.extra as { mediaHost?: string } | undefined;
  const raw = extra?.mediaHost || process.env.EXPO_PUBLIC_MEDIA_HOST;
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw.replace(/\/$/, '');
  return `http://${raw}:${MEDIA_PORT}`;
}

export function computerBaseUrl(): string {
  const override = overrideBase();
  if (override) return override;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${MEDIA_PORT}`;
  }
  const host = hostFromExpo();
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:${MEDIA_PORT}`;
  }
  if (Platform.OS === 'android') return `http://10.0.2.2:${MEDIA_PORT}`;
  return `http://127.0.0.1:${MEDIA_PORT}`;
}

export function resolveComputerUri(uri: string, base = computerBaseUrl()): string {
  if (!uri) return uri;
  if (uri.startsWith('file:') || uri.startsWith('content:')) return uri;
  try {
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      const parsed = new URL(uri);
      if (parsed.pathname.startsWith('/media/') || parsed.pathname.startsWith('/art/')) {
        return `${base}${parsed.pathname}${parsed.search}`;
      }
      return uri;
    }
  } catch {
    /* keep original */
  }
  if (uri.startsWith('/')) return `${base}${uri}`;
  return uri;
}

export function localizeLibrary<T extends { songs: { uri: string; artworkUri?: string }[]; videos: { uri: string; artworkUri?: string }[]; photos: { uri: string }[] }>(
  library: T,
): T {
  const base = computerBaseUrl();
  return {
    ...library,
    songs: library.songs.map((s) => ({
      ...s,
      uri: resolveComputerUri(s.uri, base),
      artworkUri: s.artworkUri ? resolveComputerUri(s.artworkUri, base) : undefined,
    })),
    videos: library.videos.map((v) => ({
      ...v,
      uri: resolveComputerUri(v.uri, base),
      artworkUri: v.artworkUri ? resolveComputerUri(v.artworkUri, base) : undefined,
    })),
    photos: library.photos.map((p) => ({
      ...p,
      uri: resolveComputerUri(p.uri, base),
    })),
  };
}
