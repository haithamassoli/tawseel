/* eslint-disable max-lines-per-function */
import type { Id } from '../../../convex/_generated/dataModel';
import type { GovernorateSlug } from '@/lib/constants/governorates';
import { useMutation, useQuery } from 'convex/react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import * as React from 'react';
import { showMessage } from 'react-native-flash-message';
import {
  ActivityIndicator,
  Button,
  FocusAwareStatusBar,
  Input,
  Pressable,
  ScrollView,
  showErrorMessage,
  Text,
  View,
} from '@/components/ui';
import { getGovernorateLabel } from '@/lib/constants/governorates';
import { translate } from '@/lib/i18n';
import { api } from '../../../convex/_generated/api';

/**
 * Rate the counterpart of one completed booking. The route param `id` is the
 * `bookingId`. Mirrors request-detail-screen's loading/null guards and
 * runMutation-style error handling. getRateContext is advisory; rateBooking
 * re-verifies everything server-side.
 */
export function RateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const ctx = useQuery(
    api.ratings.getRateContext,
    id ? { bookingId: id as Id<'bookings'> } : 'skip',
  );
  const rate = useMutation(api.ratings.rateBooking);

  const [stars, setStars] = React.useState(0);
  const [comment, setComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = React.useCallback(async () => {
    if (!ctx || stars < 1) {
      return;
    }
    setSubmitting(true);
    try {
      await rate({
        bookingId: id as Id<'bookings'>,
        stars,
        comment: comment.trim() || undefined,
      });
      showMessage({
        message: translate('trips.rate.success'),
        type: 'success',
      });
      router.push('/activity');
    }
    catch {
      showErrorMessage(translate('trips.rate.error'));
    }
    finally {
      setSubmitting(false);
    }
  }, [ctx, stars, comment, rate, id, router]);

  let content: React.ReactNode;

  // useQuery returns undefined while loading (or while skipped). null means the
  // query ran and the user is not a party to the booking (or it does not exist).
  if (ctx === undefined) {
    content = (
      <View className="flex-1 justify-center p-4">
        <ActivityIndicator />
      </View>
    );
  }
  else if (ctx === null) {
    content = (
      <View className="flex-1 justify-center p-4">
        <Text className="text-center text-gray-500">
          {translate('trips.detail.not_found')}
        </Text>
      </View>
    );
  }
  else if (ctx.alreadyRated) {
    content = (
      <View className="flex-1 justify-center p-4">
        <Text className="text-center text-gray-500">
          {translate('trips.rate.already_rated')}
        </Text>
      </View>
    );
  }
  else if (!ctx.canRate) {
    content = (
      <View className="flex-1 justify-center p-4">
        <Text className="text-center text-gray-500">
          {translate('trips.rate.not_available')}
        </Text>
      </View>
    );
  }
  else {
    content = (
      <ScrollView>
        <View className="flex-1 gap-6 p-4">
          <Text className="text-lg font-semibold">
            {getGovernorateLabel(ctx.originGov as GovernorateSlug)}
            {' → '}
            {getGovernorateLabel(ctx.destGov as GovernorateSlug)}
          </Text>

          <Text className="text-base">
            {translate('trips.rate.rating_for', {
              name: ctx.counterpartName ?? '-',
            })}
          </Text>

          <View className="gap-2">
            <Text className="text-xs text-gray-500">
              {translate('trips.rate.stars')}
            </Text>
            <StarPicker value={stars} onChange={setStars} />
          </View>

          <Input
            testID="rate-comment"
            label={translate('trips.rate.comment')}
            placeholder={translate('trips.rate.comment_placeholder')}
            value={comment}
            onChangeText={setComment}
            multiline
          />

          <Button
            testID="rate-submit"
            label={translate('trips.rate.submit')}
            loading={submitting}
            disabled={stars < 1}
            onPress={onSubmit}
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: translate('trips.rate.title') }} />
      <FocusAwareStatusBar />
      {content}
    </>
  );
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {[0, 1, 2, 3, 4].map(index => (
        <Pressable
          key={index}
          testID={`star-${index + 1}`}
          onPress={() => onChange(index + 1)}
        >
          <Text className="text-3xl">{index < value ? '★' : '☆'}</Text>
        </Pressable>
      ))}
    </View>
  );
}
