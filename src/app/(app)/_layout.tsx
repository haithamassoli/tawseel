import { useConvexAuth } from 'convex/react';
import { Link, Redirect, Tabs } from 'expo-router';
import * as React from 'react';

import { Pressable, Text } from '@/components/ui';
import {
  Feed as FeedIcon,
  Settings as SettingsIcon,
  Style as StyleIcon,
} from '@/components/ui/icons';
import { useIsFirstTime } from '@/lib/hooks';
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
            title: 'Feed',
            tabBarIcon: ({ color }) => <FeedIcon color={color} />,
            headerRight: () => <CreateNewPostLink />,
            tabBarButtonTestID: 'feed-tab',
          }}
        />

        <Tabs.Screen
          name="style"
          options={{
            title: 'Style',
            headerShown: false,
            tabBarIcon: ({ color }) => <StyleIcon color={color} />,
            tabBarButtonTestID: 'style-tab',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            headerShown: false,
            tabBarIcon: ({ color }) => <SettingsIcon color={color} />,
            tabBarButtonTestID: 'settings-tab',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            headerShown: false,
            tabBarIcon: ({ color }) => <SettingsIcon color={color} />,
            tabBarButtonTestID: 'profile-tab',
          }}
        />
      </Tabs>
    </>
  );
}

function CreateNewPostLink() {
  return (
    <Link href="/feed/add-post" asChild>
      <Pressable>
        <Text className="px-3 text-primary-300">Create</Text>
      </Pressable>
    </Link>
  );
}
