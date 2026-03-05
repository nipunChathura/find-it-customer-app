/**
 * Find It API base URL – must match where your backend is running.
 *
 * Set EXPO_PUBLIC_FIND_IT_API_BASE in .env to override (no restart needed for Expo):
 *   EXPO_PUBLIC_FIND_IT_API_BASE=http://192.168.1.10:9090/find-it/api
 *
 * By device:
 * - Android emulator: 10.0.2.2 = your PC's localhost → http://10.0.2.2:9090/find-it/api
 * - iOS simulator: use localhost → http://localhost:9090/find-it/api
 * - Physical device (phone/tablet): use your PC's LAN IP → http://YOUR_PC_IP:9090/find-it/api
 *   (Find YOUR_PC_IP: Windows: ipconfig → IPv4 | Mac: ifconfig en0)
 */
const DEFAULT_API_BASE = 'http://192.168.8.160:9090/find-it/api';

export const FIND_IT_API_BASE =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIND_IT_API_BASE) ||
  DEFAULT_API_BASE;
