/* eslint-disable max-lines-per-function */
import type { Id } from '../../../convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import * as React from 'react';
import { showMessage } from 'react-native-flash-message';
import {
  ActivityIndicator,
  Button,
  FocusAwareStatusBar,
  Input,
  ScrollView,
  showErrorMessage,
  Text,
  View,
} from '@/components/ui';
import { getGovernorateLabel } from '@/lib/constants/governorates';
import { translate, useSelectedLanguage } from '@/lib/i18n';
import { api } from '../../../convex/_generated/api';
import { DateTimeField } from '../trips/components/datetime-field';

/**
 * Detail view for a single ride request with the driver's accept control. The
 * driver sets a price + departure time and accepts; the passenger who created the
 * request sees a read-only notice for their own request.
 */
export function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language } = useSelectedLanguage();
  const locale = language === 'ar' ? 'ar-JO' : 'en-JO';
  const router = useRouter();

  const me = useQuery(api.users.getCurrentUser);
  const acceptRequest = useMutation(api.requests.acceptRequest);

  const request = useQuery(
    api.requests.getRideRequest,
    id ? { requestId: id as Id<'rideRequests'> } : 'skip',
  );

  const [price, setPrice] = React.useState('');
  const [departAt, setDepartAt] = React.useState<Date | undefined>(undefined);
  const [submitting, setSubmitting] = React.useState(false);

  // ponytail: derive the prefilled departure instead of seeding it via a
  // setState-in-effect (banned by lint). The driver's explicit pick wins; until
  // then we show the passenger's desired time. `??` keeps a chosen value sticky.
  const effectiveDepartAt
    = departAt ?? (request ? new Date(request.desiredAt) : undefined);

  const onAccept = React.useCallback(async () => {
    if (!request) {
      return;
    }
    const n = Number(price);
    if (!Number.isFinite(n) || n < 0) {
      showErrorMessage(translate('trips.validation.price_nonneg'));
      return;
    }
    const depart = departAt ?? new Date(request.desiredAt);
    if (depart.getTime() <= Date.now()) {
      showErrorMessage(translate('trips.validation.depart_future'));
      return;
    }
    setSubmitting(true);
    try {
      await acceptRequest({
        requestId: request._id,
        pricePerSeat: n,
        departAt: depart.getTime(),
      });
      showMessage({
        message: translate('trips.accept.success'),
        type: 'success',
      });
      router.push('/activity');
    }
    catch {
      showErrorMessage(translate('trips.accept.error'));
    }
    finally {
      setSubmitting(false);
    }
  }, [request, price, departAt, acceptRequest, router]);

  let content: React.ReactNode;

  // useQuery returns undefined while loading (or while skipped). null means the
  // query ran and the request does not exist.
  if (request === undefined) {
    content = (
      <View className="flex-1 justify-center p-4">
        <ActivityIndicator />
      </View>
    );
  }
  else if (request === null) {
    content = (
      <View className="flex-1 justify-center p-4">
        <Text className="text-center text-gray-500">
          {translate('trips.detail.not_found')}
        </Text>
      </View>
    );
  }
  else {
    const isOwn = !!me && me._id === request.passengerId;

    const desiredDate = new Date(request.desiredAt);
    const desiredText = `${desiredDate.toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })} • ${desiredDate.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const ratingText
      = request.passenger.ratingCount > 0
        ? translate('profile.rating_value', {
            avg: request.passenger.ratingAvg.toFixed(1),
            count: request.passenger.ratingCount,
          })
        : translate('profile.no_ratings');

    content = (
      <ScrollView>
        <View className="flex-1 gap-6 p-4">
          {/* Route */}
          <View className="gap-3">
            <Field
              label={translate('trips.detail.from')}
              value={getGovernorateLabel(request.originGov)}
              sub={request.originArea}
            />
            <Field
              label={translate('trips.detail.to')}
              value={getGovernorateLabel(request.destGov)}
              sub={request.destArea}
            />
          </View>

          {/* Desired time / seats */}
          <View className="gap-3">
            <Field
              label={translate('trips.detail.depart')}
              value={desiredText}
            />
            <Field
              label={translate('trips.detail.seats')}
              value={translate('trips.activity.seats_booked', {
                seats: request.seats,
              })}
            />
          </View>

          {/* Note (optional) */}
          {request.note
            ? (
                <Field
                  label={translate('trips.detail.note')}
                  value={request.note}
                />
              )
            : null}

          {/* Passenger */}
          <View className="gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-700">
            <Text className="text-lg font-bold">
              {translate('trips.accept.passenger')}
            </Text>
            <Field
              label={translate('profile.name')}
              value={request.passenger.name ?? '-'}
            />
            <Field label={translate('trips.detail.rating')} value={ratingText} />
          </View>

          {/* Accept control */}
          {isOwn
            ? (
                <Text className="text-center text-gray-500">
                  {translate('trips.book.own_trip')}
                </Text>
              )
            : request.status !== 'open'
              ? (
                  <Text className="text-center text-gray-500">
                    {translate(`trips.request_status.${request.status}`)}
                  </Text>
                )
              : (
                  <View className="gap-3">
                    <Input
                      testID="accept-price"
                      label={translate('trips.post.price_per_seat')}
                      placeholder={translate('trips.post.price_placeholder')}
                      keyboardType="numeric"
                      value={price}
                      onChangeText={setPrice}
                    />
                    <DateTimeField
                      testID="accept-depart"
                      label={translate('trips.accept.depart')}
                      mode="datetime"
                      minimumDate={new Date()}
                      value={effectiveDepartAt}
                      onChange={setDepartAt}
                    />
                    <Button
                      testID="accept-confirm"
                      label={translate('trips.accept.confirm')}
                      loading={submitting}
                      onPress={onAccept}
                    />
                  </View>
                )}
        </View>
      </ScrollView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: translate('trips.accept.title'),
          headerBackTitle: translate('trips.openRequests.title'),
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
