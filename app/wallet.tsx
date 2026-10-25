import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { useWallet, useWithdraw } from '@/api/hooks';
import type { WalletEntry } from '@/api/types';
import { Button, Card, Header, Screen, Skeleton, StateView, Text } from '@/components';
import { toast } from '@/store/toast';
import { color, size, space } from '@/theme';
import { formatChatTime, formatPrice } from '@/utils/format';

const ENTRY_LABEL: Record<WalletEntry['type'], string> = {
  card_payment: 'Пополнение картой',
  booking_payment: 'Оплата брони',
  booking_refund: 'Возврат',
  wallet_withdrawal: 'Вывод на карту',
  adjustment: 'Корректировка',
};

function EntryRow({ entry }: { entry: WalletEntry }) {
  const plus = entry.amount > 0;
  return (
    <View style={styles.entry}>
      <View style={styles.grow}>
        <Text variant="bodyStrong">{ENTRY_LABEL[entry.type]}</Text>
        <Text variant="small" color="muted" numberOfLines={1}>
          {entry.description} · {formatChatTime(entry.created_at)}
        </Text>
      </View>
      <Text variant="bodyStrong" color={plus ? 'success' : 'ink'}>
        {plus ? '+' : '−'}
        {formatPrice(Math.abs(entry.amount))}
      </Text>
    </View>
  );
}

export default function WalletScreen() {
  const wallet = useWallet();
  const withdraw = useWithdraw();
  const balance = wallet.data?.balance ?? 0;

  const confirmWithdraw = () =>
    Alert.alert(
      'Вернуть на карту?',
      `${formatPrice(balance)} уйдут возвратом на карту, с которой вы платили.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Вернуть',
          onPress: () =>
            withdraw.mutate(balance, {
              onSuccess: () => toast('Возврат отправлен, придёт в течение 1–3 дней'),
              onError: (e) => toast(errorMessage(e)),
            }),
        },
      ],
    );

  const header = (
    <View style={styles.header}>
      <Header />
      <Text variant="h1">Кошелёк</Text>
      <Card style={styles.balance}>
        <Text variant="overline" color="muted">
          Баланс
        </Text>
        {wallet.isPending ? (
          <Skeleton height={size.touch} width="50%" />
        ) : (
          <Text variant="h1">{formatPrice(balance)}</Text>
        )}
        <Text variant="caption" color="muted">
          Сюда приходят возвраты за отменённые брони. Ими можно оплатить следующий выезд или вернуть
          на карту.
        </Text>
        <Button
          title="Вернуть на карту"
          variant="dark"
          disabled={balance <= 0}
          loading={withdraw.isPending}
          onPress={confirmWithdraw}
        />
      </Card>
      <Text variant="title" style={styles.section}>
        История
      </Text>
    </View>
  );

  return (
    <Screen padded={false}>
      <FlatList
        data={wallet.data?.entries ?? []}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <EntryRow entry={item} />}
        ListHeaderComponent={header}
        ItemSeparatorComponent={Divider}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          wallet.isError ? (
            <StateView status="error" error={wallet.error} onRetry={() => void wallet.refetch()} />
          ) : wallet.isPending ? undefined : (
            <StateView status="empty" title="Операций пока нет" />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={wallet.isRefetching}
            onRefresh={() => void wallet.refetch()}
            tintColor={color.muted}
          />
        }
      />
    </Screen>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: space.screen, paddingBottom: space.xxl },
  header: { gap: space.md, paddingBottom: space.sm },
  balance: { gap: space.sm },
  section: { marginTop: space.sm },
  entry: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  grow: { flex: 1 },
  divider: { height: size.hairline, backgroundColor: color.border },
});
