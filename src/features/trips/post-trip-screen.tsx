/* eslint-disable max-lines-per-function */
import { useForm } from '@tanstack/react-form';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { showMessage } from 'react-native-flash-message';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as z from 'zod';

import {
  Button,
  Input,
  ScrollView,
  Select,
  showErrorMessage,
  Text,
  View,
} from '@/components/ui';
import { getFieldError } from '@/components/ui/form-utils';
import { getGovernorateOptions } from '@/lib/constants/governorates';
import { translate } from '@/lib/i18n';
import { api } from '../../../convex/_generated/api';
import { DateTimeField } from './components/datetime-field';

const schema = z
  .object({
    originGov: z.string().min(1, translate('trips.validation.origin_required')),
    destGov: z.string().min(1, translate('trips.validation.dest_required')),
    departAt: z
      .date({ message: translate('trips.validation.depart_required') })
      .refine(d => d.getTime() > Date.now(), {
        message: translate('trips.validation.depart_future'),
      }),
    originArea: z.string().max(120).optional().or(z.literal('')),
    destArea: z.string().max(120).optional().or(z.literal('')),
    stops: z.string().max(300).optional().or(z.literal('')),
    seatsTotal: z
      .string()
      .min(1, translate('trips.validation.seats_required'))
      .refine((s) => {
        const n = Number(s);
        return Number.isInteger(n) && n > 0;
      }, { message: translate('trips.validation.seats_positive') }),
    pricePerSeat: z
      .string()
      .min(1, translate('trips.validation.price_required'))
      .refine((s) => {
        const n = Number(s);
        return Number.isFinite(n) && n >= 0;
      }, { message: translate('trips.validation.price_nonneg') }),
    bookingMode: z.enum(['instant', 'approve']),
    note: z.string().max(500).optional().or(z.literal('')),
  })
  .refine(v => v.originGov !== v.destGov, {
    message: translate('trips.validation.same_route'),
    path: ['destGov'],
  });

type PostTripValues = {
  originGov: string;
  destGov: string;
  departAt: Date | undefined;
  originArea: string;
  destArea: string;
  stops: string;
  seatsTotal: string;
  pricePerSeat: string;
  bookingMode: 'instant' | 'approve';
  note: string;
};

export function PostTripScreen() {
  const router = useRouter();
  const createTrip = useMutation(api.trips.createTrip);
  const govOptions = React.useMemo(() => getGovernorateOptions(), []);
  const bookingOptions = React.useMemo(
    () => [
      { label: translate('trips.bookingMode.instant'), value: 'instant' },
      { label: translate('trips.bookingMode.approve'), value: 'approve' },
    ],
    [],
  );

  const form = useForm({
    defaultValues: {
      originGov: '',
      destGov: '',
      departAt: undefined,
      originArea: '',
      destArea: '',
      stops: '',
      seatsTotal: '',
      pricePerSeat: '',
      bookingMode: 'instant',
      note: '',
    } as PostTripValues,
    validators: {
      onChange: schema as any,
    },
    onSubmit: async ({ value }) => {
      try {
        const stops = value.stops
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        await createTrip({
          originGov: value.originGov as any,
          destGov: value.destGov as any,
          departAt: (value.departAt as Date).getTime(),
          originArea: value.originArea.trim() || undefined,
          destArea: value.destArea.trim() || undefined,
          stops: stops.length ? stops : undefined,
          seatsTotal: Number(value.seatsTotal),
          pricePerSeat: Number(value.pricePerSeat),
          bookingMode: value.bookingMode,
          note: value.note.trim() || undefined,
        });
        showMessage({
          message: translate('trips.post.success'),
          type: 'success',
        });
        router.replace('/');
      }
      catch {
        showErrorMessage(translate('trips.post.submit_error'));
      }
    },
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="p-4">
          <Text className="mb-4 text-2xl font-bold" tx="trips.post.title" />

          <form.Field
            name="originGov"
            children={field => (
              <Select
                testID="post-origin"
                label={translate('trips.post.origin')}
                placeholder={translate('trips.post.origin_placeholder')}
                value={field.state.value}
                options={govOptions}
                onSelect={v => field.handleChange(String(v))}
                error={getFieldError(field)}
              />
            )}
          />

          <form.Field
            name="destGov"
            children={field => (
              <Select
                testID="post-dest"
                label={translate('trips.post.destination')}
                placeholder={translate('trips.post.destination_placeholder')}
                value={field.state.value}
                options={govOptions}
                onSelect={v => field.handleChange(String(v))}
                error={getFieldError(field)}
              />
            )}
          />

          <form.Field
            name="departAt"
            children={field => (
              <DateTimeField
                testID="post-depart"
                label={translate('trips.post.depart_at')}
                placeholder={translate('trips.post.depart_placeholder')}
                mode="datetime"
                minimumDate={new Date()}
                value={field.state.value}
                onChange={d => field.handleChange(d)}
                error={getFieldError(field)}
              />
            )}
          />

          <form.Field
            name="originArea"
            children={field => (
              <Input
                testID="post-origin-area"
                label={translate('trips.post.origin_area')}
                placeholder={translate('trips.post.origin_area_placeholder')}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={field.handleChange}
                error={getFieldError(field)}
              />
            )}
          />

          <form.Field
            name="destArea"
            children={field => (
              <Input
                testID="post-dest-area"
                label={translate('trips.post.dest_area')}
                placeholder={translate('trips.post.dest_area_placeholder')}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={field.handleChange}
                error={getFieldError(field)}
              />
            )}
          />

          <form.Field
            name="stops"
            children={field => (
              <Input
                testID="post-stops"
                label={translate('trips.post.stops')}
                placeholder={translate('trips.post.stops_placeholder')}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={field.handleChange}
                error={getFieldError(field)}
              />
            )}
          />

          <form.Field
            name="seatsTotal"
            children={field => (
              <Input
                testID="post-seats"
                label={translate('trips.post.seats_total')}
                placeholder={translate('trips.post.seats_placeholder')}
                keyboardType="number-pad"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={field.handleChange}
                error={getFieldError(field)}
              />
            )}
          />

          <form.Field
            name="pricePerSeat"
            children={field => (
              <Input
                testID="post-price"
                label={translate('trips.post.price_per_seat')}
                placeholder={translate('trips.post.price_placeholder')}
                keyboardType="numeric"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={field.handleChange}
                error={getFieldError(field)}
              />
            )}
          />

          <form.Field
            name="bookingMode"
            children={field => (
              <Select
                testID="post-booking-mode"
                label={translate('trips.post.booking_mode')}
                value={field.state.value}
                options={bookingOptions}
                onSelect={v => field.handleChange(v as 'instant' | 'approve')}
                error={getFieldError(field)}
              />
            )}
          />

          <form.Field
            name="note"
            children={field => (
              <Input
                testID="post-note"
                label={translate('trips.post.note')}
                placeholder={translate('trips.post.note_placeholder')}
                multiline
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={field.handleChange}
                error={getFieldError(field)}
              />
            )}
          />

          <form.Subscribe
            selector={state => [state.isSubmitting]}
            children={([isSubmitting]) => (
              <Button
                testID="post-submit"
                label={translate('trips.post.submit')}
                onPress={form.handleSubmit}
                loading={isSubmitting}
              />
            )}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
