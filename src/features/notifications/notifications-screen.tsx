import type { FunctionReturnType } from 'convex/server';
import type { GovernorateSlug } from '@/lib/constants/governorates';
import { FlashList } from '@shopify/flash-list';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';

import * as React from 'react';
import {
  ActivityIndicator,
  FocusAwareStatusBar,
  Pressable,
  Text,
  View,
} from '@/components/ui';
import { getGovernorateLabel } from '@/lib/constants/governorates';
import { translate } from '@/lib/i18n';
import { api } from '../../../convex/_generated/api';

type NotificationItem = FunctionReturnType<
  typeof api.notifications.myNotifications
>[number];

export function NotificationsScreen() {
  const items = useQuery(api.notifications.myNotifications);
  const markAllRead = useMutation(api.notifications.markAllRead);

  // Mark everything read as soon as the screen opens.
  React.useEffect(() => {
    markAllRead({}).catch(() => {});
  }, [markAllRead]);

  const renderItem = React.useCallback(
    ({ item }: { item: NotificationItem }) => <NotificationRow item={item} />,
    [],
  );

  if (items === undefined) {
    return (
      <>
        <FocusAwareStatusBar />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </>
    );
  }

  return (
    <View className="flex-1">
      <FocusAwareStatusBar />
      <Text
        className="p-4 text-2xl font-bold"
        tx="trips.notifications.title"
      />
      {items.length === 0
        ? (
            <View className="flex-1 items-center justify-center p-8">
              <Text
                className="text-center text-gray-500"
                tx="trips.notifications.empty"
              />
            </View>
          )
        : (
            <FlashList
              data={items}
              renderItem={renderItem}
              keyExtractor={item => `notification-${item._id}`}
            />
          )}
    </View>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const router = useRouter();
  const title = translate(`trips.notifications.type_${item.type}`);
  // Backend returns route govs as plain strings; they are always valid slugs.
  const subtitle = item.route
    ? `${getGovernorateLabel(item.route.originGov as GovernorateSlug)} → ${getGovernorateLabel(item.route.destGov as GovernorateSlug)}`
    : null;

  const onPress = React.useCallback(() => {
    if (item.tripId) {
      router.push(`/trip/${item.tripId}`);
    }
    else if (item.requestId) {
      router.push(`/request/${item.requestId}`);
    }
  }, [item.tripId, item.requestId, router]);

  return (
    <Pressable
      onPress={onPress}
      className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700"
    >
      <View className="flex-row items-center gap-2">
        <Text className={item.read ? 'text-base' : 'text-base font-bold'}>
          {title}
        </Text>
        {!item.read
          ? <View className="size-2 rounded-full bg-primary-600" />
          : null}
      </View>
      {subtitle
        ? (
            <Text className="mt-1 text-gray-600 dark:text-neutral-400">
              {subtitle}
            </Text>
          )
        : null}
    </Pressable>
  );
}
