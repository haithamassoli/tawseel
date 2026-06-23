import { useConvexAuth } from 'convex/react';
import { Redirect, Tabs } from 'expo-router';
import * as React from 'react';

import {
  Bell as BellIcon,
  Feed as FeedIcon,
  Home as HomeIcon,
  Rate as RateIcon,
  Settings as SettingsIcon,
} from '@/components/ui/icons';
import { useIsFirstTime } from '@/lib/hooks';
import { translate } from '@/lib/i18n';
import { PushTokenSync } from '@/lib/notifications';

export default function TabLayout() {
  const [isFirstTime] = useIsFirstTime();
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isFirstTime) {
    return <Redirect href="/onboarding" />;
  }

  // While Convex restores the session from secure storage, render nothing
  // (the native splash screen is still up until the root layout hides it).
  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <>
      <PushTokenSync />
      <Tabs>
        <Tabs.Screen
          name="index"
          options={{
            title: translate('trips.tabs.find'),
            tabBarIcon: ({ color }) => <HomeIcon color={color} />,
            tabBarButtonTestID: 'find-tab',
          }}
        />
        <Tabs.Screen
          name="post-trip"
          options={{
            title: translate('trips.tabs.post'),
            headerShown: false,
            tabBarIcon: ({ color }) => <FeedIcon color={color} />,
            tabBarButtonTestID: 'post-trip-tab',
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: translate('trips.tabs.activity'),
            headerShown: false,
            tabBarIcon: ({ color }) => <RateIcon color={color} />,
            tabBarButtonTestID: 'activity-tab',
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: translate('trips.tabs.notifications'),
            headerShown: false,
            tabBarIcon: ({ color }) => <BellIcon color={color} />,
            tabBarButtonTestID: 'notifications-tab',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: translate('settings.title'),
            headerShown: false,
            tabBarIcon: ({ color }) => <SettingsIcon color={color} />,
            tabBarButtonTestID: 'settings-tab',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: translate('profile.title'),
            headerShown: false,
            tabBarIcon: ({ color }) => <SettingsIcon color={color} />,
            tabBarButtonTestID: 'profile-tab',
          }}
        />
      </Tabs>
    </>
  );
}
