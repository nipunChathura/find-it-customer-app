
const DEFAULT_API_BASE = 'http://192.168.8.160:9090/find-it/api';

export const FIND_IT_API_BASE =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FIND_IT_API_BASE) ||
  DEFAULT_API_BASE;
