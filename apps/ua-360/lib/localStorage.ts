import { GenerateIPResponse } from './types';

const STORAGE_KEY = 'ua-360-ip-assets';

export function saveAssetsToLocalStorage(result: GenerateIPResponse): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch (error) {
    console.error('Failed to save assets to localStorage:', error);
  }
}

export function loadAssetsFromLocalStorage(): GenerateIPResponse | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as GenerateIPResponse;
    }
  } catch (error) {
    console.error('Failed to load assets from localStorage:', error);
  }
  return null;
}

export function clearAssetsFromLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear assets from localStorage:', error);
  }
}

export function hasAssets(): boolean {
  return loadAssetsFromLocalStorage() !== null;
}

