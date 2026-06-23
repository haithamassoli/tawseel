import type { FunctionReturnType } from 'convex/server';
import type { api } from '../../../../convex/_generated/api';
import { useRouter } from 'expo-router';
import i18n from 'i18next';

import * as React from 'react';
import { Pressable, Text, View } from '@/components/ui';
import { ArrowRight } from '@/components/ui/icons';
import { getGovernorateLabel } from '@/lib/constants/governorates';
import { translate } from '@/lib/i18n';

// One item from the searchTrips query result ({ ...trip, driver }). Derived from
// the generated API so it always matches the backend's return shape.
type Props = FunctionReturnType<typeof api.trips.searchTrips>[number];

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

export function TripCard(trip: Props) {
  const router = useRouter();
  const driver = trip.driver;
  const hasRatings = !!driver && driver.ratingCount > 0;
  const ratingLabel = hasRatings
    ? translate('profile.rating_value', {
        avg: driver.ratingAvg.toFixed(1),
        count: driver.ratingCount,
      })
    : translate('trips.card.no_ratings');

  return (
    <Pressable
      testID={`trip-card-${trip._id}`}
      onPress={() => router.push(`/trip/${trip._id}`)}
    >
      <View className="m-2 rounded-xl border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
        {/* Route — ArrowRight auto-flips for RTL internally. */}
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-semibold">
            {getGovernorateLabel(trip.originGov)}
          </Text>
          <ArrowRight />
          <Text className="text-lg font-semibold">
            {getGovernorateLabel(trip.destGov)}
          </Text>
        </View>

        {/* Depart time */}
        <Text className="mt-1 text-gray-600 dark:text-neutral-400">
          {formatDepart(trip.departAt)}
        </Text>

        {/* Price + seats */}
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="font-semibold text-primary-600">
            {translate('trips.card.price', { price: trip.pricePerSeat })}
          </Text>
          <Text className="text-gray-600 dark:text-neutral-400">
            {translate('trips.card.seats', {
              available: trip.seatsAvailable,
              total: trip.seatsTotal,
            })}
          </Text>
        </View>

        {/* Driver */}
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-gray-700 dark:text-neutral-300">
            {driver?.name ?? translate('trips.card.driver_unknown')}
          </Text>
          <Text className="text-gray-600 dark:text-neutral-400">
            {hasRatings ? `★ ${ratingLabel}` : ratingLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
