import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ANDROID_CHANNEL_ID = 'default';

function getProjectId(): string | undefined {
  return (
    Constants?.expoConfig?.extra?.eas?.projectId
    ?? (Constants as any)?.easConfig?.projectId
  );
}

/**
 * Requests push permission, configures the Android channel, and returns the
 * Expo push token. Returns null if unavailable (simulator, denied permission,
 * Expo Go on Android, or a network error).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Configure the Android channel first (required before requesting a token on Android 13+).
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // Push tokens only work on physical devices.
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    // Without an EAS projectId getExpoPushTokenAsync throws; bail gracefully.
    return null;
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  }
  catch {
    // Network error / Expo Go limitation — caller may retry later.
    return null;
  }
}
