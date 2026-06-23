/* eslint-disable max-lines-per-function */
import type { Id } from '../../../convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { Stack, useLocalSearchParams } from 'expo-router';

import * as React from 'react';
import {
  ActivityIndicator,
  Button,
  FocusAwareStatusBar,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { getGovernorateLabel } from '@/lib/constants/governorates';
import { translate, useSelectedLanguage } from '@/lib/i18n';
import { api } from '../../../convex/_generated/api';

/**
 * Read-only detail view for a single trip. Booking lives in M3 — here we only
 * surface a disabled "coming soon" placeholder.
 */
export function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language } = useSelectedLanguage();
  const locale = language === 'ar' ? 'ar-JO' : 'en-JO';

  const trip = useQuery(
    api.trips.getTrip,
    id ? { tripId: id as Id<'trips'> } : 'skip',
  );

  let content: React.ReactNode;

  // useQuery returns undefined while loading (or while skipped). null means the
  // query ran and the trip does not exist.
  if (trip === undefined) {
    content = (
      <View className="flex-1 justify-center p-4">
        <ActivityIndicator />
      </View>
    );
  }
  else if (trip === null) {
    content = (
      <View className="flex-1 justify-center p-4">
        <Text className="text-center text-gray-500">
          {translate('trips.detail.not_found')}
        </Text>
      </View>
    );
  }
  else {
    const departDate = new Date(trip.departAt);
    const departText = `${departDate.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })} • ${departDate.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const bookingText
      = trip.bookingMode === 'instant'
        ? translate('trips.detail.booking_instant')
        : translate('trips.detail.booking_approve');

    const ratingText
      = trip.driver.ratingCount > 0
        ? translate('profile.rating_value', {
            avg: trip.driver.ratingAvg.toFixed(1),
            count: trip.driver.ratingCount,
          })
        : translate('profile.no_ratings');

    content = (
      <ScrollView>
        <View className="flex-1 gap-6 p-4">
          {/* Route */}
          <View className="gap-3">
            <Field
              label={translate('trips.detail.from')}
              value={getGovernorateLabel(trip.originGov)}
              sub={trip.originArea}
            />
            <Field
              label={translate('trips.detail.to')}
              value={getGovernorateLabel(trip.destGov)}
              sub={trip.destArea}
            />
          </View>

          {/* Stops (optional) */}
          {trip.stops && trip.stops.length > 0
            ? (
                <Field
                  label={translate('trips.detail.stops')}
                  value={trip.stops.join(' • ')}
                />
              )
            : null}

          {/* Departure / price / seats / booking */}
          <View className="gap-3">
            <Field label={translate('trips.detail.depart')} value={departText} />
            <Field
              label={translate('trips.detail.price')}
              value={translate('trips.detail.price_value', {
                price: trip.pricePerSeat,
              })}
            />
            <Field
              label={translate('trips.detail.seats')}
              value={translate('trips.detail.seats_value', {
                available: trip.seatsAvailable,
                total: trip.seatsTotal,
              })}
            />
            <Field
              label={translate('trips.detail.booking_mode')}
              value={bookingText}
            />
          </View>

          {/* Note (optional) */}
          {trip.note
            ? <Field label={translate('trips.detail.note')} value={trip.note} />
            : null}

          {/* Driver */}
          <View className="gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-700">
            <Text className="text-lg font-bold">
              {translate('trips.detail.driver')}
            </Text>
            <Field
              label={translate('profile.name')}
              value={trip.driver.name ?? '-'}
            />
            <Field label={translate('trips.detail.rating')} value={ratingText} />
            {trip.driver.vehicle
              ? (
                  <>
                    <Field
                      label={translate('profile.vehicle_make')}
                      value={trip.driver.vehicle.make ?? '-'}
                    />
                    <Field
                      label={translate('profile.vehicle_color')}
                      value={trip.driver.vehicle.color ?? '-'}
                    />
                    <Field
                      label={translate('profile.vehicle_plate')}
                      value={trip.driver.vehicle.plate ?? '-'}
                    />
                  </>
                )
              : null}
          </View>

          {/* M3 placeholder — booking not implemented yet. */}
          <Button
            label={translate('trips.detail.book_soon')}
            disabled
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: translate('trips.detail.title'),
          headerBackTitle: translate('trips.tabs.find'),
        }}
      />
      <FocusAwareStatusBar />
      {content}
    </>
  );
}

function Field({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View>
      <Text className="text-xs text-gray-500">{label}</Text>
      <Text className="text-base">{value}</Text>
      {sub ? <Text className="text-sm text-gray-400">{sub}</Text> : null}
    </View>
  );
}
