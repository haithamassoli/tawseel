import type { DateTimePickerChangeEvent } from '@expo/ui/community/datetime-picker';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import i18n from 'i18next';
import * as React from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { CaretDown } from '@/components/ui/icons';

type Mode = 'date' | 'datetime';

type Props = {
  label?: string;
  value?: Date;
  onChange: (date: Date) => void;
  mode?: Mode;
  placeholder?: string;
  error?: string;
  minimumDate?: Date;
  testID?: string;
};

function formatValue(value: Date, mode: Mode): string {
  const locale = i18n.language || 'en';
  const opts: Intl.DateTimeFormatOptions
    = mode === 'datetime'
      ? { dateStyle: 'medium', timeStyle: 'short' }
      : { dateStyle: 'medium' };
  try {
    return new Intl.DateTimeFormat(locale, opts).format(value);
  }
  catch {
    return value.toLocaleString();
  }
}

export function DateTimeField({
  label,
  value,
  onChange,
  mode = 'date',
  placeholder,
  error,
  minimumDate,
  testID,
}: Props) {
  const [show, setShow] = React.useState(false);
  // Android cannot show a combined date+time picker, so we step date -> time.
  const [androidStep, setAndroidStep] = React.useState<'date' | 'time'>('date');
  const [draft, setDraft] = React.useState<Date | undefined>(undefined);

  const open = React.useCallback(() => {
    setAndroidStep('date');
    setDraft(undefined);
    setShow(true);
  }, []);

  const handleDismiss = React.useCallback(() => {
    setShow(false);
    setDraft(undefined);
  }, []);

  const handleValueChange = React.useCallback(
    (_event: DateTimePickerChangeEvent, selected: Date) => {
      if (Platform.OS === 'ios') {
        // iOS shows inline; commit immediately (mode handles date vs datetime).
        onChange(selected);
        return;
      }
      // Android dialog flow.
      if (mode === 'datetime' && androidStep === 'date') {
        setDraft(selected);
        setAndroidStep('time');
        return; // keep showing, now in time step
      }
      let result = selected;
      if (mode === 'datetime' && androidStep === 'time' && draft) {
        result = new Date(draft);
        result.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      }
      onChange(result);
      setShow(false);
      setDraft(undefined);
    },
    [androidStep, draft, mode, onChange],
  );

  const pickerMode
    = Platform.OS === 'ios'
      ? mode
      : mode === 'datetime'
        ? androidStep
        : 'date';

  return (
    <View className="mb-4">
      {label
        ? (
            <Text className="mb-1 text-lg text-neutral-700 dark:text-neutral-100">
              {label}
            </Text>
          )
        : null}
      <Pressable
        testID={testID ? `${testID}-trigger` : undefined}
        onPress={open}
        className={`mt-0 flex-row items-center justify-center rounded-2xl border-[0.5px] p-3 dark:bg-neutral-800 ${error ? 'border-danger-600' : 'border-neutral-300 dark:border-neutral-500'}`}
      >
        <View className="flex-1">
          <Text className={value ? 'dark:text-neutral-100' : 'text-neutral-400'}>
            {value ? formatValue(value, mode) : (placeholder ?? '')}
          </Text>
        </View>
        <CaretDown />
      </Pressable>
      {error
        ? (
            <Text
              testID={testID ? `${testID}-error` : undefined}
              className="text-sm text-danger-400 dark:text-danger-600"
            >
              {error}
            </Text>
          )
        : null}
      {show
        ? (
            <DateTimePicker
              value={value ?? draft ?? new Date()}
              mode={pickerMode}
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={minimumDate}
              onValueChange={handleValueChange}
              onDismiss={handleDismiss}
            />
          )
        : null}
    </View>
  );
}
