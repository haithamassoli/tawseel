import { useAuthActions } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import * as React from 'react';

import {
  ActivityIndicator,
  FocusAwareStatusBar,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { SettingsContainer } from '@/features/settings/components/settings-container';
import { SettingsItem } from '@/features/settings/components/settings-item';
import { translate } from '@/lib/i18n';
import { api } from '../../../convex/_generated/api';

export function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.getCurrentUser);

  const onLogout = React.useCallback(async () => {
    await signOut();
    router.replace('/login');
  }, [signOut, router]);

  if (user === undefined) {
    return (
      <>
        <FocusAwareStatusBar />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </>
    );
  }

  const ratingLabel
    = user?.ratingCount && user.ratingCount > 0
      ? translate('profile.rating_value', {
          avg: (user.ratingAvg ?? 0).toFixed(1),
          count: user.ratingCount,
        })
      : translate('profile.no_ratings');

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView>
        <View className="flex-1 px-4 pt-16">
          <Text className="text-xl font-bold" tx="profile.title" />

          <SettingsContainer title="profile.account">
            <SettingsItem text="profile.name" value={user?.name ?? '-'} />
            <SettingsItem text="profile.phone" value={user?.phone ?? '-'} />
            <SettingsItem text="profile.rating" value={ratingLabel} />
          </SettingsContainer>

          {user?.vehicle
            ? (
                <SettingsContainer title="profile.vehicle">
                  <SettingsItem text="profile.vehicle_make" value={user.vehicle.make ?? '-'} />
                  <SettingsItem text="profile.vehicle_color" value={user.vehicle.color ?? '-'} />
                  <SettingsItem text="profile.vehicle_plate" value={user.vehicle.plate ?? '-'} />
                </SettingsContainer>
              )
            : null}

          <View className="my-8">
            <SettingsContainer>
              <SettingsItem text="profile.logout" onPress={onLogout} />
            </SettingsContainer>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
