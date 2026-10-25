import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';

import { errorMessage, isApiError } from '@/api/errors';
import { useSendSms, useVerifyCode } from '@/api/hooks';
import { Button, FieldError, Footer, Header, Screen, Text } from '@/components';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { color, radius, size, space } from '@/theme';
import { maskPhone } from '@/utils/format';

const CODE_LENGTH = 4;
const RESEND_SECONDS = 60;

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return { left, restart: () => setLeft(seconds) };
}

export default function CodeScreen() {
  const { phone = '' } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(true);
  const inputRef = useRef<TextInputInstance>(null);
  const verify = useVerifyCode();
  const resend = useSendSms();
  const setTokens = useAuth((s) => s.setTokens);
  const { left, restart } = useCountdown(RESEND_SECONDS);

  const submit = (value = code) => {
    if (value.length !== CODE_LENGTH || verify.isPending) return;
    verify.mutate(
      { phone, code: value },
      {
        // После сохранения токенов Stack.Protected сам переключит на вкладки.
        onSuccess: (tokens) => void setTokens(tokens),
        onError: () => setCode(''),
      },
    );
  };

  const onChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) submit(digits);
  };

  const onResend = () =>
    resend.mutate(phone, {
      onSuccess: () => {
        restart();
        toast('Отправили новый код');
      },
      onError: (e) => toast(errorMessage(e)),
    });

  const error = verify.error
    ? isApiError(verify.error) && verify.error.fields.code
      ? verify.error.fields.code
      : errorMessage(verify.error)
    : undefined;

  return (
    <Screen
      keyboard
      footer={
        <Footer>
          <Button
            title="Войти"
            onPress={() => submit()}
            disabled={code.length !== CODE_LENGTH}
            loading={verify.isPending}
            style={styles.grow}
          />
        </Footer>
      }
    >
      <Header />
      <Text variant="h1">Введи код из SMS</Text>
      <Text variant="caption" color="muted" style={styles.sub}>
        Отправили на {maskPhone(phone)} ·{' '}
        <Text
          variant="captionStrong"
          color="accent"
          onPress={() => router.back()}
          accessibilityRole="link"
        >
          изменить
        </Text>
      </Text>

      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={styles.cells}
        accessibilityLabel={`Код из SMS, введено ${code.length} из ${CODE_LENGTH}`}
      >
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const active = focused && i === Math.min(code.length, CODE_LENGTH - 1);
          return (
            <View
              key={i}
              style={[styles.cell, active && styles.cellActive, !!error && styles.cellError]}
            >
              <Text variant="code">{code[i] ?? ''}</Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={CODE_LENGTH}
        autoFocus
        style={styles.hidden}
      />
      {error && <FieldError message={error} />}

      {left > 0 ? (
        <Text variant="caption" color="muted" style={styles.resend}>
          Отправить ещё раз через{' '}
          <Text variant="captionStrong">0:{String(left).padStart(2, '0')}</Text>
        </Text>
      ) : (
        <Pressable
          onPress={onResend}
          disabled={resend.isPending}
          accessibilityRole="button"
          style={styles.resendButton}
        >
          <Text variant="captionStrong" color="accent">
            Отправить код ещё раз
          </Text>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { marginTop: space.sm },
  cells: { flexDirection: 'row', gap: space.md, marginTop: space.xxl },
  cell: {
    width: size.codeCell,
    height: size.codeCell,
    borderRadius: radius.field,
    backgroundColor: color.surface,
    borderWidth: size.focusBorder,
    borderColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: { borderColor: color.accent },
  cellError: { borderColor: color.danger },
  hidden: { position: 'absolute', opacity: 0, width: size.hairline, height: size.hairline },
  resend: { marginTop: space.xl },
  resendButton: { marginTop: space.md, minHeight: size.touch, justifyContent: 'center' },
  grow: { flex: 1 },
});
