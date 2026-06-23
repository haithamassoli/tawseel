import type { TokenStorage } from '@convex-dev/auth/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Token storage adapter for ConvexAuthProvider backed by expo-secure-store.
 *
 * Implements the `TokenStorage` interface from `@convex-dev/auth/react`
 * (getItem / setItem / removeItem). expo-secure-store persists values in the
 * iOS Keychain / Android Keystore so the Convex auth + refresh tokens are
 * stored encrypted at rest (this is the reason we do NOT reuse the MMKV
 * `storage` helper in src/lib/storage.ts for auth tokens).
 *
 * NOTE on the ~2KB SecureStore value-size limit: this is the basic wrapper
 * recommended by the official Convex Auth React Native docs. Convex Auth JWT
 * + refresh tokens normally fit well under 2KB. If you ever exceed it
 * SecureStore will warn/throw on Android; switch to a chunked wrapper at that
 * point (split the value across `${key}.0`, `${key}.1`, ... with a count key).
 */
const nativeSecureStorage: TokenStorage = {
  getItem: SecureStore.getItemAsync,
  setItem: (key, value) =>
    SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    }),
  removeItem: SecureStore.deleteItemAsync,
};

/**
 * Pass this to <ConvexAuthProvider storage={secureStorage}>.
 *
 * On web (Platform.OS === 'web') we return `undefined` so ConvexAuthProvider
 * falls back to localStorage, matching the official guidance. SecureStore is
 * native-only.
 */
export const secureStorage: TokenStorage | undefined
  = Platform.OS === 'android' || Platform.OS === 'ios'
    ? nativeSecureStorage
    : undefined;
