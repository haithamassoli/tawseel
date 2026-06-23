/* eslint-disable max-lines-per-function */
import type { FunctionReturnType } from 'convex/server';
import { useForm } from '@tanstack/react-form';
import { useMutation } from 'convex/react';
import { Stack } from 'expo-router';
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
import { DateTimeField } from '../trips/components/datetime-field';
import { TripCard } from '../trips/components/trip-card';

const schema = z
  .object({
    originGov: z.string().min(1, translate('trips.validation.origin_required')),
    destGov: z.string().min(1, translate('trips.validation.dest_required')),
    desiredAt: z
      .date({ message: translate('trips.validation.depart_required') })
      .refine(d => d.getTime() > Date.now(), {
        message: translate('trips.validation.depart_future'),
      }),
    seats: z
      .string()
      .min(1, translate('trips.validation.seats_required'))
      .refine((s) => {
        const n = Number(s);
        return Number.isInteger(n) && n > 0;
      }, { message: translate('trips.validation.seats_positive') }),
    originArea: z.string().max(120).optional().or(z.literal('')),
    destArea: z.string().max(120).optional().or(z.literal('')),
    note: z.string().max(500).optional().or(z.literal('')),
  })
  .refine(v => v.originGov !== v.destGov, {
    message: translate('trips.validation.same_route'),
    path: ['destGov'],
  });

type RequestValues = {
  originGov: string;
  destGov: string;
  desiredAt: Date | undefined;
  seats: string;
  originArea: string;
  destArea: string;
  note: string;
};

type Matches = FunctionReturnType<typeof api.requests.createRideRequest>;

export function RequestFormScreen() {
  const createRideRequest = useMutation(api.requests.createRideRequest);
  const govOptions = React.useMemo(() => getGovernorateOptions(), []);
  const [matches, setMatches] = React.useState<Matches | null>(null);

  const form = useForm({
    defaultValues: {
      originGov: '',
      destGov: '',
      desiredAt: undefined,
      seats: '',
      originArea: '',
      destArea: '',
      note: '',
    } as RequestValues,
    validators: {
      onChange: schema as any,
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await createRideRequest({
          originGov: value.originGov as any,
          destGov: value.destGov as any,
          desiredAt: (value.desiredAt as Date).getTime(),
          seats: Number(value.seats),
          originArea: value.originArea.trim() || undefined,
          destArea: value.destArea.trim() || undefined,
          note: value.note.trim() || undefined,
        });
        setMatches(result);
        showMessage({
          message: translate('trips.request.success'),
          type: 'success',
        });
      }
      catch {
        showErrorMessage(translate('trips.request.submit_error'));
      }
    },
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Stack.Screen options={{ title: translate('trips.request.title') }} />
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="p-4">
          <Text className="text-2xl font-bold" tx="trips.request.title" />
          <Text
            className="mb-4 text-gray-600 dark:text-neutral-400"
            tx="trips.request.subtitle"
          />

          <form.Field
            name="originGov"
            children={field => (
              <Select
                testID="request-origin"
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
                testID="request-dest"
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
            name="desiredAt"
            children={field => (
              <DateTimeField
                testID="request-desired"
                label={translate('trips.request.desired_at')}
                placeholder={translate('trips.request.desired_placeholder')}
                mode="datetime"
                minimumDate={new Date()}
                value={field.state.value}
                onChange={d => field.handleChange(d)}
                error={getFieldError(field)}
              />
            )}
          />

          <form.Field
            name="seats"
            children={field => (
              <Input
                testID="request-seats"
                label={translate('trips.request.seats')}
                keyboardType="number-pad"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={field.handleChange}
                error={getFieldError(field)}
              />
            )}
          />

          <form.Field
            name="originArea"
            children={field => (
              <Input
                testID="request-origin-area"
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
                testID="request-dest-area"
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
            name="note"
            children={field => (
              <Input
                testID="request-note"
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
                testID="request-submit"
                label={translate('trips.request.submit')}
                onPress={form.handleSubmit}
                loading={isSubmitting}
              />
            )}
          />

          {matches !== null
            ? (
                <View className="mt-6 gap-2">
                  <Text
                    className="text-xl font-bold"
                    tx="trips.request.matches_title"
                  />
                  {matches.length > 0
                    ? (
                        matches.map(m => <TripCard key={m._id} {...m} />)
                      )
                    : (
                        <Text
                          className="text-gray-500"
                          tx="trips.request.no_matches"
                        />
                      )}
                </View>
              )
            : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
