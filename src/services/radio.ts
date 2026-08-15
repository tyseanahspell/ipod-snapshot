export interface RadioStation {
  id: string;
  name: string;
  city: string;
  frequency: number;
  genre: string;
  uri: string;
}

export const STATIONS: RadioStation[] = [
  {
    id: 'groove',
    name: 'Groove Salad',
    city: 'San Francisco',
    frequency: 87.9,
    genre: 'Ambient',
    uri: 'https://ice4.somafm.com/groovesalad-128-mp3',
  },
  {
    id: 'drone',
    name: 'Drone Zone',
    city: 'San Francisco',
    frequency: 90.3,
    genre: 'Drone',
    uri: 'https://ice4.somafm.com/dronezone-128-mp3',
  },
  {
    id: 'indie',
    name: 'Indie Pop Rocks',
    city: 'San Francisco',
    frequency: 93.1,
    genre: 'Indie',
    uri: 'https://ice4.somafm.com/indiepop-128-mp3',
  },
  {
    id: 'secret',
    name: 'Secret Agent',
    city: 'San Francisco',
    frequency: 96.5,
    genre: 'Lounge',
    uri: 'https://ice4.somafm.com/secretagent-128-mp3',
  },
  {
    id: 'defcon',
    name: 'DEF CON Radio',
    city: 'Las Vegas',
    frequency: 99.7,
    genre: 'Electronic',
    uri: 'https://ice4.somafm.com/defcon-128-mp3',
  },
  {
    id: 'metal',
    name: 'Metal Detector',
    city: 'San Francisco',
    frequency: 102.1,
    genre: 'Metal',
    uri: 'https://ice4.somafm.com/metal-128-mp3',
  },
  {
    id: 'folk',
    name: 'Folk Forward',
    city: 'San Francisco',
    frequency: 104.5,
    genre: 'Folk',
    uri: 'https://ice4.somafm.com/folkfwd-128-mp3',
  },
  {
    id: 'boot',
    name: 'Boot Liquor',
    city: 'Nashville',
    frequency: 107.3,
    genre: 'Americana',
    uri: 'https://ice4.somafm.com/bootliquor-128-mp3',
  },
];

export function nearestStation(freq: number): RadioStation | undefined {
  return [...STATIONS].sort((a, b) => Math.abs(a.frequency - freq) - Math.abs(b.frequency - freq))[0];
}

export function isTuned(freq: number, station: RadioStation): boolean {
  return Math.abs(freq - station.frequency) < 0.12;
}
