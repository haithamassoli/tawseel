import type { FunctionReturnType } from 'convex/server';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from 'convex/react';
import * as React from 'react';
import { ActivityIndicator } from 'react-native';

import { FocusAwareStatusBar, Select, Text, View } from '@/components/ui';
import { getGovernorateOptions } from '@/lib/constants/governorates';
import { translate } from '@/lib/i18n';
import { api } from '../../../convex/_generated/api';
import { DateTimeField } from './components/datetime-field';
import { TripCard } from './components/trip-card';

type TripItem = FunctionReturnType<typeof api.trips.searchTrips>[number];

function startOfDayMs(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function FindScreen() {
  const options = React.useMemo(() => getGovernorateOptions(), []);
  const [originGov, setOriginGov] = React.useState<string | undefined>(undefined);
  const [destGov, setDestGov] = React.useState<string | undefined>(undefined);
  const [date, setDate] = React.useState<Date | undefined>(undefined);

  const ready = !!originGov && !!destGov;
  const trips = useQuery(
    api.trips.searchTrips,
    ready
      ? {
          originGov: originGov as TripItem['originGov'],
          destGov: destGov as TripItem['destGov'],
          ...(date ? { date: startOfDayMs(date) } : {}),
        }
      : 'skip',
  );

  const renderItem = React.useCallback(
    ({ item }: { item: TripItem }) => <TripCard {...item} />,
    [],
  );

  const isLoading = ready && trips === undefined;
  const isEmpty = ready && Array.isArray(trips) && trips.length === 0;

  return (
    <View className="flex-1">
      <FocusAwareStatusBar />
      <View className="p-4">
        <Text className="mb-4 text-2xl font-bold" tx="trips.find.title" />
        <Select
          testID="find-origin"
          label={translate('trips.find.origin')}
          placeholder={translate('trips.find.origin_placeholder')}
          value={originGov}
          options={options}
          onSelect={v => setOriginGov(String(v))}
        />
        <Select
          testID="find-dest"
          label={translate('trips.find.destination')}
          placeholder={translate('trips.find.destination_placeholder')}
          value={destGov}
          options={options}
          onSelect={v => setDestGov(String(v))}
        />
        <DateTimeField
          testID="find-date"
          label={translate('trips.find.date')}
          placeholder={translate('trips.find.date_placeholder')}
          mode="date"
          minimumDate={new Date()}
          value={date}
          onChange={setDate}
        />
      </View>

      {!ready
        ? (
            <View className="flex-1 items-center justify-center p-8">
              <Text
                className="text-center text-gray-500"
                tx="trips.find.select_route"
              />
            </View>
          )
        : isLoading
          ? (
              <View className="flex-1 items-center justify-center p-8">
                <ActivityIndicator />
              </View>
            )
          : isEmpty
            ? (
                <View className="flex-1 items-center justify-center p-8">
                  <Text
                    className="text-center text-gray-500"
                    tx="trips.find.empty"
                  />
                </View>
              )
            : (
                <FlashList
                  data={trips ?? []}
                  renderItem={renderItem}
                  keyExtractor={item => `trip-${item._id}`}
                />
              )}
    </View>
  );
}
