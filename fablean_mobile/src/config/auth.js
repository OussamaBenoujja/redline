import { Platform } from 'react-native';

const MISSING_CLIENT_ID = 'MISSING_GOOGLE_CLIENT_ID';

const expoClientId = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID || MISSING_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || MISSING_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || MISSING_CLIENT_ID;
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || MISSING_CLIENT_ID;

export const GOOGLE_AUTH_CONFIG = {
  expoClientId,
  iosClientId,
  androidClientId,
  webClientId,
  scopes: ['profile', 'email']
};

export function isGoogleAuthConfigured() {
  const platformClientId = Platform.select({
    android: androidClientId,
    ios: iosClientId,
    web: webClientId,
    default: expoClientId
  });

  return Boolean(platformClientId && platformClientId !== MISSING_CLIENT_ID);
}

export function googleAuthMissingHint() {
  if (Platform.OS === 'android') {
    return 'Set EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID in .env';
  }

  if (Platform.OS === 'ios') {
    return 'Set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID in .env';
  }

  if (Platform.OS === 'web') {
    return 'Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in .env';
  }

  return 'Set EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID in .env';
}
