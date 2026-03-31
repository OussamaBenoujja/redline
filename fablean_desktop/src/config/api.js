const DEFAULT_API_BASE_URL = 'http://localhost:4000';

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const configuredApiBase = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).trim();
const configuredSceneApiBase = (import.meta.env.VITE_SCENE_API_BASE_URL || configuredApiBase).trim();
const configuredSocketUrl = (import.meta.env.VITE_SOCKET_URL || configuredApiBase).trim();

export const API_BASE_URL = trimTrailingSlash(configuredApiBase);
export const SCENE_API_BASE_URL = trimTrailingSlash(configuredSceneApiBase);
export const SOCKET_URL = trimTrailingSlash(configuredSocketUrl);
