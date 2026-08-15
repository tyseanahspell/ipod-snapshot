import type { Library } from '../types';
import type { ScanProgress } from './scanner';

export async function scanMediaLibrary(_onProgress?: (p: ScanProgress) => void): Promise<Library> {
  throw new Error('Device library is only available on iPhone and Android.');
}
