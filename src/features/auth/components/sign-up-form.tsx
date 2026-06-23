import { useForm } from '@tanstack/react-form';

import { Link } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as z from 'zod';

import { Button, Input, Text, View } from '@/components/ui';
import { getFieldError } from '@/components/ui/form-utils';
import { translate } from '@/lib/i18n';

// Lenient Jordan mobile format, e.g. 0791234567 / +962791234567 / 791234567
const PHONE_REGEX = /^(\+?962|0)?7[789]\d{7}$/;

const schema = z.object({
  name: z
    .string({ message: translate('auth.name_required') })
    .min(1, translate('auth.name_required'))
    .min(2, translate('auth.name_min')),
  phone: z
    .string({ message: translate('auth.phone_required') })
    .min(1, translate('auth.phone_required'))
    .regex(PHONE_REGEX, translate('auth.phone_invalid')),
  password: z
    .string({ message: translate('auth.password_required') })
    .min(1, translate('auth.password_required'))
    .min(8, translate('auth.password_min')),
});

export type SignUpFormType = z.infer<typeof schema>;

export type SignUpFormProps = {
  onSubmit?: (data: SignUpFormType) => void;
  loading?: boolean;
};

export function SignUpForm({
  onSubmit = () => {},
  loading = false,
}: SignUpFormProps) {
  const form = useForm({
    defaultValues: {
      name: '',
      phone: '',
      password: '',
    },
    validators: {
      onChange: schema as any,
    },
    onSubmit: async ({ value }) => {
      onSubmit(value);
    },
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={10}
    >
      <View className="flex-1 justify-center p-4">
        <View className="items-center justify-center">
          <Text
            testID="form-title"
            className="pb-6 text-center text-4xl font-bold"
            tx="auth.sign_up_title"
          />
          <Text
            className="mb-6 max-w-xs text-center text-gray-500"
            tx="auth.sign_up_subtitle"
          />
        </View>

        <form.Field
          name="name"
          children={field => (
            <Input
              testID="name-input"
              label={translate('auth.name')}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChangeText={field.handleChange}
              error={getFieldError(field)}
            />
          )}
        />

        <form.Field
          name="phone"
          children={field => (
            <Input
              testID="phone-input"
              label={translate('auth.phone')}
              placeholder="07XXXXXXXX"
              keyboardType="phone-pad"
              autoCapitalize="none"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChangeText={field.handleChange}
              error={getFieldError(field)}
            />
          )}
        />

        <form.Field
          name="password"
          children={field => (
            <Input
              testID="password-input"
              label={translate('auth.password')}
              placeholder="********"
              secureTextEntry
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
              testID="signup-button"
              label={translate('auth.sign_up_button')}
              onPress={form.handleSubmit}
              loading={isSubmitting || loading}
            />
          )}
        />

        <View className="mt-4 flex-row items-center justify-center">
          <Text className="text-gray-500" tx="auth.have_account" />
          <Link href="/login" asChild>
            <Text testID="go-to-login" className="font-semibold text-primary-600">
              {' '}
              {translate('auth.sign_in_button')}
            </Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
