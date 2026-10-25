import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { errorMessage } from '@/api/errors';
import { useSendSms } from '@/api/hooks';
import { Button, MountainCover, Screen, Text, TextField } from '@/components';
import { size, space } from '@/theme';
import { formatPhoneInput, phoneDigits } from '@/utils/format';

const PHONE_LENGTH = 10;

export default function PhoneScreen() {
  const insets = useSafeAreaInsets();
  const [digits, setDigits] = useState('');
  const sendSms = useSendSms();
  const complete = digits.length === PHONE_LENGTH;

  const submit = () => {
    if (!complete) return;
    const phone = `+7${digits}`;
    sendSms.mutate(phone, {
      onSuccess: () => router.push({ pathname: '/code', params: { phone } }),
    });
  };

  return (
    <Screen scroll padded={false} edges={[]} keyboard>
      <MountainCover
        cover="elbrus"
        variant="hero"
        style={[styles.cover, { paddingTop: insets.top + space.lg }]}
      >
        <Text variant="h3" style={styles.logo}>
          вместе
        </Text>
      </MountainCover>

      <View style={styles.content}>
        <Text variant="h1">В горы — своей компанией</Text>
        <Text variant="body" color="muted">
          Туры с гидом, попутки и люди, с которыми можно поехать на выходные.
        </Text>

        <TextField
          label="Номер телефона"
          prefix="+7"
          placeholder="900 000-00-00"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          value={formatPhoneInput(digits)}
          onChangeText={(v) => setDigits(phoneDigits(v))}
          onSubmitEditing={submit}
          error={sendSms.error ? errorMessage(sendSms.error) : undefined}
          style={styles.field}
        />

        <Button
          title="Получить код"
          onPress={submit}
          disabled={!complete}
          loading={sendSms.isPending}
        />

        <Text variant="small" color="muted" align="center" style={styles.terms}>
          Продолжая, ты соглашаешься с{' '}
          <Text variant="small" color="accent" style={styles.link}>
            условиями
          </Text>{' '}
          и{' '}
          <Text variant="small" color="accent" style={styles.link}>
            политикой конфиденциальности
          </Text>
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { height: size.coverHero, paddingHorizontal: space.screen },
  logo: { marginTop: space.sm },
  content: { padding: space.screen, gap: space.md },
  field: { marginTop: space.md },
  terms: { marginTop: space.sm },
  link: { textDecorationLine: 'underline' },
});
