import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { USE_MOCKS } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { useMockScanCodes, useScanTicket } from '@/api/hooks';
import type { ScanResult } from '@/api/types';
import { Button, Card, Header, Icon, Screen, Text, TextField } from '@/components';
import { color, radius, size, space } from '@/theme';
import { formatPrice } from '@/utils/format';

/** Повторный скан того же QR в кадре игнорируем, пока не прошла пауза. */
const RESCAN_PAUSE_MS = 2500;

type Outcome = { ok: true; result: ScanResult } | { ok: false; message: string };

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const scan = useScanTicket();
  const codes = useMockScanCodes();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [manual, setManual] = useState('');
  const last = useRef<{ code: string; at: number } | null>(null);

  const submit = (code: string) => {
    const now = Date.now();
    if (scan.isPending) return;
    if (last.current && last.current.code === code && now - last.current.at < RESCAN_PAUSE_MS)
      return;
    last.current = { code, at: now };
    scan.mutate(code, {
      onSuccess: (result) => setOutcome({ ok: true, result }),
      onError: (e) => setOutcome({ ok: false, message: errorMessage(e) }),
    });
  };

  return (
    <Screen scroll keyboard contentStyle={styles.content}>
      <Header />
      <Text variant="h1">Посадка</Text>
      <Text variant="caption" color="muted">
        Наведите камеру на QR-билет участника. Повторно один билет отсканировать нельзя.
      </Text>

      <View style={styles.camera}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => submit(data)}
          />
        ) : (
          <View style={styles.noCamera}>
            <Icon name="qr" color="white" size={size.touch} />
            <Text variant="body" color="white" align="center">
              Нужен доступ к камере, чтобы сканировать билеты
            </Text>
            <Button title="Разрешить камеру" onPress={() => void requestPermission()} />
          </View>
        )}
        <View pointerEvents="none" style={styles.frame} />
      </View>

      {outcome && (
        <Card style={[styles.outcome, outcome.ok ? styles.ok : styles.fail]}>
          <Icon name={outcome.ok ? 'check' : 'alert'} color={outcome.ok ? 'success' : 'danger'} />
          <View style={styles.grow}>
            {outcome.ok ? (
              <>
                <Text variant="bodyStrong" color="success">
                  Посадка подтверждена
                </Text>
                <Text variant="body">{outcome.result.holder_name}</Text>
                <Text variant="small" color="muted">
                  {outcome.result.trip_title} · бронь {outcome.result.booking_code}
                </Text>
                {outcome.result.released_amount > 0 && (
                  <Text variant="small" color="muted">
                    Организатору переведено {formatPrice(outcome.result.released_amount)}
                  </Text>
                )}
              </>
            ) : (
              <Text variant="bodyStrong" color="danger">
                {outcome.message}
              </Text>
            )}
          </View>
        </Card>
      )}

      <TextField
        label="Код билета вручную"
        placeholder="32 символа под QR"
        autoCapitalize="none"
        autoCorrect={false}
        value={manual}
        onChangeText={setManual}
        onSubmitEditing={() => manual.trim() && submit(manual.trim())}
      />
      <Button
        title="Проверить код"
        variant="dark"
        loading={scan.isPending}
        disabled={!manual.trim()}
        onPress={() => submit(manual.trim())}
      />

      {USE_MOCKS && (codes.data?.length ?? 0) > 0 && (
        <Card style={styles.gapSm}>
          <Text variant="overline" color="muted">
            Тестовые билеты (только в моках)
          </Text>
          {codes.data!.slice(0, 6).map((c) => (
            <Pressable
              key={c.code}
              onPress={() => submit(c.code)}
              accessibilityRole="button"
              style={styles.mockRow}
            >
              <Text variant="captionStrong">{c.holder_name}</Text>
              <Text variant="small" color="muted" numberOfLines={1}>
                {c.trip_title} · {c.code.slice(0, 8)}…
              </Text>
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md },
  camera: {
    height: size.coverHero,
    borderRadius: radius.large,
    overflow: 'hidden',
    backgroundColor: color.ink,
  },
  noCamera: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xl,
  },
  frame: {
    position: 'absolute',
    top: space.xxxl,
    bottom: space.xxxl,
    left: space.xxxl * 2,
    right: space.xxxl * 2,
    borderWidth: size.focusBorder,
    borderColor: color.white,
    borderRadius: radius.card,
  },
  outcome: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  ok: { backgroundColor: color.successBg },
  fail: { backgroundColor: color.dangerBg },
  grow: { flex: 1, gap: space.xxs },
  gapSm: { gap: space.sm },
  mockRow: { minHeight: size.touch, justifyContent: 'center' },
});
