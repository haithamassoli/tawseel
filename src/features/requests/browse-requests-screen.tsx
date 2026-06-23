import type { FunctionReturnType } from 'convex/server';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from 'convex/react';
import { Stack } from 'expo-router';
import * as React from 'react';

import {
  ActivityIndicator,
  FocusAwareStatusBar,
  Select,
  Text,
  View,
} from '@/components/ui';
import { getGovernorateOptions } from '@/lib/constants/governorates';
import { translate } from '@/lib/i18n';
import { api } from '../../../convex/_generated/api';
import { DateTimeField } from '../trips/components/datetime-field';
import { RequestCard } from './components/request-card';

type RequestItem = FunctionReturnType<
  typeof api.requests.searchRideRequests
>[number];

function startOfDayMs(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function BrowseRequestsScreen() {
  const options = React.useMemo(() => getGovernorateOptions(), []);
  const [originGov, setOriginGov] = React.useState<string | undefined>(undefined);
  const [destGov, setDestGov] = React.useState<string | undefined>(undefined);
  const [date, setDate] = React.useState<Date | undefined>(undefined);

  const ready = !!originGov && !!destGov;
  const requests = useQuery(
    api.requests.searchRideRequests,
    ready
      ? {
          originGov: originGov as RequestItem['originGov'],
          destGov: destGov as RequestItem['destGov'],
          ...(date ? { date: startOfDayMs(date) } : {}),
        }
      : 'skip',
  );

  const renderItem = React.useCallback(
    ({ item }: { item: RequestItem }) => <RequestCard {...item} />,
    [],
  );

  const isLoading = ready && requests === undefined;
  const isEmpty = ready && Array.isArray(requests) && requests.length === 0;

  return (
    <View className="flex-1">
      <Stack.Screen options={{ title: translate('trips.openRequests.title') }} />
      <FocusAwareStatusBar />
      <View className="p-4">
        <Select
          testID="open-requests-origin"
          label={translate('trips.find.origin')}
          placeholder={translate('trips.find.origin_placeholder')}
          value={originGov}
          options={options}
          onSelect={v => setOriginGov(String(v))}
        />
        <Select
          testID="open-requests-dest"
          label={translate('trips.find.destination')}
          placeholder={translate('trips.find.destination_placeholder')}
          value={destGov}
          options={options}
          onSelect={v => setDestGov(String(v))}
        />
        <DateTimeField
          testID="open-requests-date"
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
                tx="trips.openRequests.select_route"
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
                    tx="trips.openRequests.empty"
                  />
                </View>
              )
            : (
                <FlashList
                  data={requests ?? []}
                  renderItem={renderItem}
                  keyExtractor={item => `request-${item._id}`}
                />
              )}
    </View>
  );
}
