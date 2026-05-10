const config = await fetch('/config.json').then(r => r.json());

export const APP_STAGE = config.appStage;
export const APP_VERSION = `0.1.0_${new Date().toISOString().replace(/[-T:Z.]/g, '').slice(0, 8)}.${import.meta.env.VITE_APP_VERSION || '0'}`;
export const API_BASE_URL = config.apiEndpoint;
export const COGNITO_USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID;
export const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID;