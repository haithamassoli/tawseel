import type { FunctionReturnType } from 'convex/server';
import type { api } from '../../../../convex/_generated/api';
import { useRouter } from 'expo-router';
import i18n from 'i18next';

import * as React from 'react';
import { Pressable, Text, View } from '@/components/ui';
import { ArrowRight } from '@/components/ui/icons';
import { getGovernorateLabel } from '@/lib/constants/governorates';
import { translate } from '@/lib/i18n';

// One item from the searchRideRequests query result ({ ...rideRequest, passenger }).
// Derived from the generated API so it always matches the backend's return shape.
type Props = FunctionReturnType<typeof api.requests.searchRideRequests>[number];

function formatDepart(ms: number): string {
  const locale = i18n.language || 'en';
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ms));
  }
  catch {
    return new Date(ms).toLocaleString();
  }
}

export function RequestCard(item: Props) {
  const router = useRouter();
  const passenger = item.passenger;
  const hasRatings = passenger.ratingCount > 0;
  const ratingLabel = hasRatings
    ? translate('profile.rating_value', {
        avg: passenger.ratingAvg.toFixed(1),
        count: passenger.ratingCount,
      })
    : translate('trips.card.no_ratings');

  return (
    <Pressable
      testID={`request-card-${item._id}`}
      onPress={() => router.push(`/request/${item._id}`)}
    >
      <View className="m-2 rounded-xl border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
        {/* Route — ArrowRight auto-flips for RTL internally. */}
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-semibold">
            {getGovernorateLabel(item.originGov)}
          </Text>
          <ArrowRight />
          <Text className="text-lg font-semibold">
            {getGovernorateLabel(item.destGov)}
          </Text>
        </View>

        {/* Desired time */}
        <Text className="mt-1 text-gray-600 dark:text-neutral-400">
          {formatDepart(item.desiredAt)}
        </Text>

        {/* Seats */}
        <Text className="mt-2 text-gray-600 dark:text-neutral-400">
          {translate('trips.activity.seats_booked', { seats: item.seats })}
        </Text>

        {/* Passenger */}
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-gray-700 dark:text-neutral-300">
            {passenger.name ?? translate('trips.card.driver_unknown')}
          </Text>
          <Text className="text-gray-600 dark:text-neutral-400">
            {hasRatings ? `★ ${ratingLabel}` : ratingLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
