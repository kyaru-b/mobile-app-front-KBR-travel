import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, radius, size, space } from '@/theme';
import { formatDateField, formatTimeField } from '@/utils/format';

import { Button } from './Button';
import { FieldError } from './TextField';
import { Text } from './Text';

type Props = {
  label: string;
  mode: 'date' | 'time';
  value: Date;
  onChange: (value: Date) => void;
  minimumDate?: Date;
  error?: string;
  style?: StyleProp<ViewStyle>;
};

/** Поле даты или времени: на Android — системный диалог, на iOS — колесо в шторке. */
export function DateField({ label, mode, value, onChange, minimumDate, error, style }: Props) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const insets = useSafeAreaInsets();
  const display = mode === 'date' ? formatDateField(value) : formatTimeField(value);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode,
        is24Hour: true,
        minimumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(date);
        },
      });
      return;
    }
    setDraft(value);
    setIosOpen(true);
  };

  return (
    <View style={style}>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display}`}
        style={[styles.field, !!error && styles.invalid]}
      >
        <Text variant="small" color="muted">
          {label}
        </Text>
        <Text variant="body">{display}</Text>
      </Pressable>
      {error && <FieldError message={error} />}

      {Platform.OS === 'ios' && (
        <Modal
          visible={iosOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setIosOpen(false)}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => setIosOpen(false)}
            accessibilityLabel="Закрыть"
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
            <DateTimePicker
              value={draft}
              mode={mode}
              display="spinner"
              locale="ru-RU"
              minimumDate={minimumDate}
              onChange={(_, date) => date && setDraft(date)}
            />
            <Button
              title="Готово"
              onPress={() => {
                onChange(draft);
                setIosOpen(false);
              }}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: color.surface,
    borderRadius: radius.field,
    borderWidth: size.border,
    borderColor: color.surface,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.xs,
  },
  invalid: { borderColor: color.danger },
  backdrop: { flex: 1, backgroundColor: color.overlay },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    padding: space.screen,
    gap: space.md,
  },
});
