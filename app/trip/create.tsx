import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Controller,
  useController,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldPath,
} from 'react-hook-form';
import { BackHandler, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { z } from 'zod';

import { errorMessage, isApiError } from '@/api/errors';
import { useAddVehicle, useCreateTrip, useDirections, useMe, useMyVehicles } from '@/api/hooks';
import type { CreateTripBody, TripType, Vehicle, VehicleType } from '@/api/types';
import {
  Button,
  Card,
  Chip,
  DateField,
  FieldError,
  FieldGroup,
  Footer,
  Header,
  Icon,
  IconButton,
  Screen,
  Segmented,
  Stepper,
  Switch,
  Text,
  TextField,
  type IconName,
} from '@/components';
import { toast } from '@/store/toast';
import {
  BRING_OPTIONS,
  FREE_CANCEL_OPTIONS,
  INCLUDED_OPTIONS,
  LATE_REFUND_OPTIONS,
  TAG_OPTIONS,
  useTripDraft,
  type TripDraft,
} from '@/store/tripDraft';
import { color, opacity, radius, size, space, text } from '@/theme';
import { rublesToKopecks } from '@/utils/format';
import { TAG_LABEL, vehicleLabel } from '@/utils/trip';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_TOUR_SEATS = 60;
/** Самозанятый и частный водитель — до 8 пассажирских мест (лицензия на перевозку). */
const MAX_CAR_SEATS = 8;
const BOOKING_CLOSES_BEFORE_MS = 3_600_000;

const schema = z
  .object({
    type: z.enum(['tour', 'carpool', 'company']),
    organizerId: z.string().nullable(),
    directionId: z
      .string()
      .nullable()
      .refine((v) => Boolean(v), 'Выберите направление'),
    title: z.string().trim().min(3, 'Назовите выезд'),
    pickupTitle: z.string().trim().min(1, 'Укажите, где сбор'),
    pickupAddress: z.string(),
    departureAt: z
      .string()
      .refine((v) => new Date(v).getTime() > Date.now(), 'Дата и время уже прошли'),
    returnTime: z.string().regex(TIME, 'Время в формате ЧЧ:ММ'),
    seats: z.number().int().min(1).max(MAX_TOUR_SEATS),
    vehicleId: z.string().nullable(),
    paymentMode: z.enum(['online', 'offline']),
    requiresConfirmation: z.boolean(),
    priceRub: z.string().regex(/^\d*$/, 'Только цифры'),
    program: z.array(
      z.object({
        time: z.string().regex(TIME, 'Время в формате ЧЧ:ММ'),
        title: z.string().trim().min(1, 'Опишите пункт'),
      }),
    ),
    tags: z.array(z.string()),
    included: z.array(z.string()),
    whatToBring: z.array(z.string()),
    freeCancelHours: z.number(),
    lateRefundPercent: z.number(),
    insurance: z.boolean(),
    description: z.string(),
  })
  .refine((v) => v.type !== 'carpool' || v.vehicleId !== null, {
    path: ['vehicleId'],
    message: 'Для попутки нужна машина',
  })
  .refine((v) => v.type !== 'tour' || v.organizerId !== null, {
    path: ['organizerId'],
    message: 'Выберите организатора',
  }) satisfies z.ZodType<TripDraft>;

type Form = z.infer<typeof schema>;

const STEP_ONE: FieldPath<Form>[] = [
  'type',
  'organizerId',
  'directionId',
  'title',
  'pickupTitle',
  'departureAt',
  'returnTime',
  'seats',
  'vehicleId',
];

/** Поля ошибок сервера (как в CreateTripBody) → поля формы. */
const SERVER_FIELDS: Record<string, FieldPath<Form>> = {
  direction_id: 'directionId',
  title: 'title',
  departure_at: 'departureAt',
  return_at: 'returnTime',
  seats_total: 'seats',
  vehicle_id: 'vehicleId',
  organizer_id: 'organizerId',
  price: 'priceRub',
  pickup_points: 'pickupTitle',
  program: 'program',
};

function toBody(v: Form): CreateTripBody {
  const departure = new Date(v.departureAt);
  const [h = 0, m = 0] = v.returnTime.split(':').map(Number);
  const ret = new Date(departure);
  ret.setHours(h, m, 0, 0);
  if (ret <= departure) ret.setDate(ret.getDate() + 1);
  const tour = v.type === 'tour';
  return {
    type: v.type,
    organizer_id: tour ? v.organizerId : null,
    vehicle_id: v.type === 'carpool' ? v.vehicleId : null,
    direction_id: v.directionId,
    title: v.title.trim(),
    description: v.description.trim() || null,
    tags: v.tags,
    departure_at: departure.toISOString(),
    return_at: ret.toISOString(),
    booking_closes_at: new Date(departure.getTime() - BOOKING_CLOSES_BEFORE_MS).toISOString(),
    seats_total: v.seats,
    price: rublesToKopecks(Number(v.priceRub || 0)),
    // Через платформу платят только за туры: у частного водителя нет статуса для приёма оплаты.
    payment_mode: tour ? v.paymentMode : 'offline',
    requires_confirmation: v.requiresConfirmation,
    free_cancel_hours: v.freeCancelHours,
    late_cancel_refund_percent: tour ? v.lateRefundPercent : 0,
    insurance_included: tour && v.insurance,
    included: tour ? v.included : [],
    what_to_bring: v.whatToBring,
    program: v.program.map((p) => ({ starts_at: p.time, title: p.title.trim() })),
    pickup_points: [
      {
        title: v.pickupTitle.trim(),
        address: v.pickupAddress.trim() || null,
        pickup_at: departure.toISOString(),
      },
    ],
  };
}

function toggle(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
}

/** «0630» → «06:30» при вводе времени с цифровой клавиатуры. */
function maskTime(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}

function timeOf(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function ErrorText({ message }: { message?: string }) {
  return message ? <FieldError message={message} /> : null;
}

// --- Шаг 1 ---

const TYPES: { value: TripType; title: string; hint: string; icon: IconName }[] = [
  { value: 'carpool', title: 'Попутка', hint: 'своя машина, делим бензин', icon: 'car' },
  { value: 'tour', title: 'Тур с гидом', hint: 'для ИП и самозанятых', icon: 'route' },
  { value: 'company', title: 'Компания', hint: 'скоро', icon: 'users' },
];

function TypePicker({ control, canTour }: { control: Control<Form>; canTour: boolean }) {
  const { field } = useController({ control, name: 'type' });
  return (
    <View style={styles.types} accessibilityRole="radiogroup">
      {TYPES.map((t) => {
        const active = field.value === t.value;
        const disabled = t.value === 'company' || (t.value === 'tour' && !canTour);
        return (
          <Pressable
            key={t.value}
            onPress={() =>
              disabled
                ? toast(
                    t.value === 'tour'
                      ? 'Туры публикуют сотрудники организатора с правом «Выезды»'
                      : 'Поиск компании появится в следующей версии',
                  )
                : field.onChange(t.value)
            }
            accessibilityRole="radio"
            accessibilityState={{ checked: active, disabled }}
            accessibilityLabel={`${t.title}, ${t.hint}`}
            style={[styles.type, active && styles.typeActive, disabled && styles.dimmed]}
          >
            <Icon name={t.icon} color={active ? 'white' : 'ink'} />
            <Text variant="captionStrong" color={active ? 'white' : 'ink'}>
              {t.title}
            </Text>
            <Text variant="small" color={active ? 'white' : 'muted'}>
              {t.hint}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DirectionPicker({ control }: { control: Control<Form> }) {
  const directions = useDirections({});
  const { field, fieldState } = useController({ control, name: 'directionId' });
  const title = useController({ control, name: 'title' });
  const type = useWatch({ control, name: 'type' });
  return (
    <View style={styles.gapSm}>
      <Text variant="captionStrong" color="muted">
        Куда
      </Text>
      <View style={styles.chips}>
        {(directions.data ?? []).map((d) => (
          <Chip
            key={d.id}
            label={d.name}
            active={field.value === d.id}
            onPress={() => {
              field.onChange(d.id);
              // Название по умолчанию, пока пользователь не придумал своё.
              const current = title.field.value.trim();
              if (!current || current.startsWith('Попутка на ')) {
                const name = d.name.split(' (')[0] ?? d.name;
                title.field.onChange(type === 'carpool' ? `Попутка на ${name}` : name);
              }
            }}
          />
        ))}
      </View>
      <ErrorText message={fieldState.error?.message} />
    </View>
  );
}

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'car', label: 'Легковая' },
  { value: 'offroad', label: 'Внедорожник' },
  { value: 'minivan', label: 'Минивэн' },
];

function AddVehicleForm({ onAdded }: { onAdded: (v: Vehicle) => void }) {
  const add = useAddVehicle();
  const [v, setV] = useState({
    type: 'car' as VehicleType,
    brand: '',
    model: '',
    color: '',
    plate: '',
    seats: 3,
  });
  const valid = !!(v.brand.trim() && v.model.trim() && v.plate.trim());
  return (
    <Card style={styles.gapSm}>
      <Text variant="bodyStrong">Новая машина</Text>
      <View style={styles.chips}>
        {VEHICLE_TYPES.map((t) => (
          <Chip
            key={t.value}
            label={t.label}
            active={v.type === t.value}
            onPress={() => setV({ ...v, type: t.value })}
          />
        ))}
      </View>
      <View style={styles.pair}>
        <TextField
          label="Марка"
          placeholder="Toyota"
          value={v.brand}
          onChangeText={(brand) => setV({ ...v, brand })}
          style={styles.grow}
        />
        <TextField
          label="Модель"
          placeholder="Camry"
          value={v.model}
          onChangeText={(model) => setV({ ...v, model })}
          style={styles.grow}
        />
      </View>
      <View style={styles.pair}>
        <TextField
          label="Цвет"
          placeholder="белый"
          value={v.color}
          onChangeText={(c) => setV({ ...v, color: c })}
          style={styles.grow}
        />
        <TextField
          label="Госномер"
          placeholder="А123ВС07"
          autoCapitalize="characters"
          value={v.plate}
          onChangeText={(plate) => setV({ ...v, plate })}
          style={styles.grow}
        />
      </View>
      <Stepper
        label="Пассажирских мест"
        hint="без водителя"
        value={v.seats}
        min={1}
        max={MAX_CAR_SEATS}
        onChange={(seats) => setV({ ...v, seats })}
      />
      <Button
        title="Добавить машину"
        variant="dark"
        disabled={!valid}
        loading={add.isPending}
        onPress={() =>
          add.mutate(
            {
              type: v.type,
              brand: v.brand.trim(),
              model: v.model.trim(),
              color: v.color.trim() || null,
              plate_number: v.plate.trim().toUpperCase(),
              passenger_seats: v.seats,
            },
            { onSuccess: onAdded, onError: (e) => toast(errorMessage(e)) },
          )
        }
      />
    </Card>
  );
}

function VehiclePicker({ control, vehicles }: { control: Control<Form>; vehicles: Vehicle[] }) {
  const { field, fieldState } = useController({ control, name: 'vehicleId' });
  const seats = useController({ control, name: 'seats' });
  const [adding, setAdding] = useState(false);

  const pick = (v: Vehicle) => {
    field.onChange(v.id);
    if (seats.field.value > v.passenger_seats) seats.field.onChange(v.passenger_seats);
  };

  return (
    <View style={styles.gapSm}>
      <Text variant="captionStrong" color="muted">
        Машина
      </Text>
      {vehicles.map((v) => {
        const active = field.value === v.id;
        return (
          <Pressable
            key={v.id}
            onPress={() => pick(v)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            style={[styles.vehicle, active && styles.vehicleActive]}
          >
            <Icon name="car" color={active ? 'accent' : 'muted'} />
            <View style={styles.grow}>
              <Text variant="bodyStrong">{vehicleLabel(v)}</Text>
              <Text variant="small" color="muted">
                {[v.color, v.plate_number, `${v.passenger_seats} пасс. мест`]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            {active && <Icon name="check" color="accent" />}
          </Pressable>
        );
      })}
      {adding ? (
        <AddVehicleForm
          onAdded={(v) => {
            setAdding(false);
            pick(v);
          }}
        />
      ) : (
        <Chip label="+ Добавить машину" dashed onPress={() => setAdding(true)} />
      )}
      <ErrorText message={fieldState.error?.message} />
    </View>
  );
}

function StepOne({ control }: { control: Control<Form> }) {
  const me = useMe();
  const type = useWatch({ control, name: 'type' });
  const vehicleId = useWatch({ control, name: 'vehicleId' });
  const vehicles = useMyVehicles(type === 'carpool');
  const tourOrganizers = (me.data?.organizers ?? []).filter((m) =>
    m.permissions.includes('trips.manage'),
  );
  const vehicle = vehicles.data?.find((v) => v.id === vehicleId);
  const maxSeats =
    type === 'carpool' ? (vehicle?.passenger_seats ?? MAX_CAR_SEATS) : MAX_TOUR_SEATS;

  return (
    <View style={styles.step}>
      <Text variant="h1">Собираем выезд в горы</Text>
      <TypePicker control={control} canTour={tourOrganizers.length > 0} />

      {type === 'tour' && (
        <Controller
          control={control}
          name="organizerId"
          render={({ field, fieldState }) => (
            <View style={styles.gapSm}>
              <Text variant="captionStrong" color="muted">
                От организатора
              </Text>
              <View style={styles.chips}>
                {tourOrganizers.map((m) => (
                  <Chip
                    key={m.organizer.id}
                    label={m.organizer.display_name}
                    active={field.value === m.organizer.id}
                    onPress={() => field.onChange(m.organizer.id)}
                  />
                ))}
              </View>
              <ErrorText message={fieldState.error?.message} />
            </View>
          )}
        />
      )}

      <DirectionPicker control={control} />

      <Controller
        control={control}
        name="title"
        render={({ field, fieldState }) => (
          <TextField
            label="Название"
            placeholder="Попутка на Эльбрус"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />

      <FieldGroup>
        <Controller
          control={control}
          name="pickupTitle"
          render={({ field, fieldState }) => (
            <View>
              <TextField
                bare
                label="Где сбор"
                placeholder="Нальчик, ТЦ «Галерея»"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
              {fieldState.error?.message && <FieldError message={fieldState.error.message} inset />}
            </View>
          )}
        />
        <Controller
          control={control}
          name="pickupAddress"
          render={({ field }) => (
            <TextField
              bare
              label="Адрес (необязательно)"
              placeholder="пр. Ленина, 2"
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />
      </FieldGroup>

      <Controller
        control={control}
        name="departureAt"
        render={({ field, fieldState }) => {
          const value = new Date(field.value);
          const setPart = (next: Date, part: 'date' | 'time') => {
            const d = new Date(value);
            if (part === 'date') d.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
            else d.setHours(next.getHours(), next.getMinutes(), 0, 0);
            field.onChange(d.toISOString());
          };
          return (
            <View style={styles.gapSm}>
              <DateField
                label="Дата"
                mode="date"
                value={value}
                minimumDate={new Date()}
                onChange={(d) => setPart(d, 'date')}
              />
              <View style={styles.pair}>
                <DateField
                  label="Выезд"
                  mode="time"
                  value={value}
                  onChange={(d) => setPart(d, 'time')}
                  style={styles.grow}
                />
                <Controller
                  control={control}
                  name="returnTime"
                  render={({ field: ret }) => {
                    const [h = 0, m = 0] = ret.value.split(':').map(Number);
                    const d = new Date();
                    d.setHours(h, m, 0, 0);
                    return (
                      <DateField
                        label="Возвращение"
                        mode="time"
                        value={d}
                        onChange={(next) => ret.onChange(timeOf(next))}
                        style={styles.grow}
                      />
                    );
                  }}
                />
              </View>
              <ErrorText message={fieldState.error?.message} />
            </View>
          );
        }}
      />

      {type === 'carpool' && <VehiclePicker control={control} vehicles={vehicles.data ?? []} />}

      <Controller
        control={control}
        name="seats"
        render={({ field, fieldState }) => (
          <View>
            <Stepper
              label="Свободных мест"
              hint={
                type === 'carpool'
                  ? vehicle
                    ? `в машине ${vehicle.passenger_seats} пассажирских`
                    : 'сначала выберите машину'
                  : 'в минивэне или автобусе'
              }
              value={Math.min(field.value, maxSeats)}
              min={1}
              max={maxSeats}
              onChange={field.onChange}
            />
            <ErrorText message={fieldState.error?.message} />
          </View>
        )}
      />

      <Controller
        control={control}
        name="requiresConfirmation"
        render={({ field }) => (
          <Switch
            label="Подтверждать брони вручную"
            hint="иначе место бронируется сразу"
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
    </View>
  );
}

// --- Шаг 2 ---

function ChipsField({
  control,
  name,
  label,
  options,
  format = (o) => o,
  allowCustom,
}: {
  control: Control<Form>;
  name: 'included' | 'whatToBring' | 'tags';
  label: string;
  options: string[];
  format?: (option: string) => string;
  allowCustom?: boolean;
}) {
  const [custom, setCustom] = useState<string | null>(null);
  const { field } = useController({ control, name });
  const all = [...options, ...field.value.filter((v) => !options.includes(v))];
  const addCustom = () => {
    const value = custom?.trim();
    if (value && !field.value.includes(value)) field.onChange([...field.value, value]);
    setCustom(null);
  };
  return (
    <View style={styles.gapSm}>
      <Text variant="captionStrong" color="muted">
        {label}
      </Text>
      <View style={styles.chips}>
        {all.map((item) => (
          <Chip
            key={item}
            label={format(item)}
            active={field.value.includes(item)}
            onPress={() => field.onChange(toggle(field.value, item))}
          />
        ))}
        {allowCustom && custom === null && (
          <Chip label="+ своё" dashed onPress={() => setCustom('')} />
        )}
      </View>
      {custom !== null && (
        <TextField
          label="Своё"
          placeholder="Например, термос"
          value={custom}
          onChangeText={setCustom}
          onSubmitEditing={addCustom}
          onBlur={addCustom}
          returnKeyType="done"
          autoFocus
        />
      )}
    </View>
  );
}

function NumberChips({
  control,
  name,
  label,
  options,
  suffix,
}: {
  control: Control<Form>;
  name: 'freeCancelHours' | 'lateRefundPercent';
  label: string;
  options: number[];
  suffix: string;
}) {
  const { field } = useController({ control, name });
  return (
    <View style={styles.gapSm}>
      <Text variant="captionStrong" color="muted">
        {label}
      </Text>
      <View style={styles.chips}>
        {options.map((o) => (
          <Chip
            key={o}
            label={`${o} ${suffix}`}
            active={field.value === o}
            onPress={() => field.onChange(o)}
          />
        ))}
      </View>
    </View>
  );
}

function ProgramEditor({ control }: { control: Control<Form> }) {
  const program = useFieldArray({ control, name: 'program' });
  return (
    <Card style={styles.gapSm}>
      <Text variant="captionStrong" color="muted">
        Программа
      </Text>
      {program.fields.map((item, index) => (
        <View key={item.id}>
          <View style={styles.programRow}>
            <Controller
              control={control}
              name={`program.${index}.time`}
              render={({ field, fieldState }) => (
                <TextInput
                  value={field.value}
                  onChangeText={(v) => field.onChange(maskTime(v))}
                  onBlur={field.onBlur}
                  placeholder="00:00"
                  placeholderTextColor={color.muted}
                  keyboardType="number-pad"
                  maxLength={5}
                  accessibilityLabel={`Время пункта ${index + 1}`}
                  style={[styles.timeInput, !!fieldState.error && styles.inputError]}
                />
              )}
            />
            <Controller
              control={control}
              name={`program.${index}.title`}
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Что происходит"
                  placeholderTextColor={color.muted}
                  accessibilityLabel={`Описание пункта ${index + 1}`}
                  style={styles.titleInput}
                />
              )}
            />
            <IconButton
              icon="close"
              variant="soft"
              accessibilityLabel={`Удалить пункт ${index + 1}`}
              onPress={() => program.remove(index)}
              style={styles.remove}
            />
          </View>
          <Controller
            control={control}
            name={`program.${index}`}
            render={({ fieldState }) => {
              const e = fieldState.error as
                { time?: { message?: string }; title?: { message?: string } } | undefined;
              return <ErrorText message={e?.time?.message ?? e?.title?.message} />;
            }}
          />
        </View>
      ))}
      <Pressable
        onPress={() => program.append({ time: '', title: '' })}
        accessibilityRole="button"
        style={styles.addRow}
      >
        <Text variant="captionStrong" color="accent">
          + Добавить пункт
        </Text>
      </Pressable>
    </Card>
  );
}

function StepTwo({ control }: { control: Control<Form> }) {
  const type = useWatch({ control, name: 'type' });
  const paymentMode = useWatch({ control, name: 'paymentMode' });
  const tour = type === 'tour';
  return (
    <View style={styles.step}>
      <Text variant="h1">Цена и условия</Text>

      {tour && (
        <Controller
          control={control}
          name="paymentMode"
          render={({ field }) => (
            <View style={styles.gapSm}>
              <Segmented
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: 'online', label: 'Оплата в приложении' },
                  { value: 'offline', label: 'Оплата на месте' },
                ]}
              />
              <Text variant="small" color="muted">
                {field.value === 'online'
                  ? 'Деньги у платформы до скана QR на посадке, потом — на ваш баланс за вычетом комиссии.'
                  : 'Участники платят вам напрямую, приложение ведёт брони и явку по QR.'}
              </Text>
            </View>
          )}
        />
      )}

      <Controller
        control={control}
        name="priceRub"
        render={({ field, fieldState }) => (
          <TextField
            label={tour ? 'Цена за место, ₽' : 'Доля бензина с человека, ₽'}
            placeholder="0"
            keyboardType="number-pad"
            value={field.value}
            onChangeText={(v) => field.onChange(v.replace(/\D/g, ''))}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
          />
        )}
      />
      {!tour && (
        <Text variant="small" color="muted">
          Попутки бесплатны для водителя: без комиссии, деньги за бензин — наличными или переводом.
        </Text>
      )}

      <ProgramEditor control={control} />

      <ChipsField
        control={control}
        name="tags"
        label="Метки для ленты"
        options={TAG_OPTIONS}
        format={(t) => TAG_LABEL[t] ?? t}
      />
      {tour && (
        <ChipsField
          control={control}
          name="included"
          label="В цену входит"
          options={INCLUDED_OPTIONS}
          allowCustom
        />
      )}
      <ChipsField
        control={control}
        name="whatToBring"
        label="Что взять с собой"
        options={BRING_OPTIONS}
        allowCustom
      />

      {tour && (
        <Controller
          control={control}
          name="insurance"
          render={({ field }) => (
            <Switch
              label="Страховка включена"
              hint="участники застрахованы на время выезда"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      )}

      <NumberChips
        control={control}
        name="freeCancelHours"
        label="Бесплатная отмена не позже чем за"
        options={FREE_CANCEL_OPTIONS}
        suffix="ч"
      />
      {tour && paymentMode === 'online' && (
        <NumberChips
          control={control}
          name="lateRefundPercent"
          label="Возврат при поздней отмене"
          options={LATE_REFUND_OPTIONS}
          suffix="%"
        />
      )}

      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <TextField
            label="Описание"
            placeholder="Что увидим, какой темп, что важно знать"
            multiline
            value={field.value}
            onChangeText={field.onChange}
          />
        )}
      />
    </View>
  );
}

// --- Экран ---

export default function CreateTripScreen() {
  const updateDraft = useTripDraft((s) => s.update);
  const resetDraft = useTripDraft((s) => s.reset);
  const [initialDraft] = useState(() => useTripDraft.getState().draft);
  const [step, setStep] = useState<1 | 2>(1);
  const create = useCreateTrip();

  const { control, handleSubmit, trigger, setError } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: initialDraft,
    mode: 'onTouched',
  });

  // Черновик в Zustand: ввод не теряется при переходе между шагами и закрытии экрана.
  const values = useWatch({ control });
  useEffect(() => {
    updateDraft(values as Partial<TripDraft>);
  }, [values, updateDraft]);

  useEffect(() => {
    if (step !== 2) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setStep(1);
      return true;
    });
    return () => sub.remove();
  }, [step]);

  const next = async () => {
    if (await trigger(STEP_ONE, { shouldFocus: true })) setStep(2);
  };

  const publish = handleSubmit(
    (v) =>
      create.mutate(toBody(v), {
        onSuccess: (trip) => {
          resetDraft();
          toast('Выезд опубликован');
          router.replace({ pathname: '/trip/[id]', params: { id: trip.id } });
        },
        onError: (e) => {
          if (isApiError(e) && Object.keys(e.fields).length > 0) {
            let backToFirst = false;
            for (const [key, message] of Object.entries(e.fields)) {
              const name = SERVER_FIELDS[key];
              if (!name) continue;
              setError(name, { type: 'server', message });
              if (STEP_ONE.includes(name)) backToFirst = true;
            }
            if (backToFirst) setStep(1);
            return;
          }
          toast(errorMessage(e));
        },
      }),
    (errors) => {
      if (STEP_ONE.some((f) => f in errors)) setStep(1);
    },
  );

  return (
    <Screen
      scroll
      keyboard
      footer={
        <Footer>
          {step === 1 ? (
            <Button
              title="Дальше: цена и условия"
              variant="dark"
              onPress={() => void next()}
              style={styles.grow}
            />
          ) : (
            <Button
              title="Опубликовать выезд"
              loading={create.isPending}
              onPress={() => void publish()}
              style={styles.grow}
            />
          )}
        </Footer>
      }
    >
      <Header
        icon={step === 1 ? 'close' : 'back'}
        onBack={step === 1 ? () => router.back() : () => setStep(1)}
        right={
          <Text variant="captionStrong" color="muted">
            Шаг {step} из 2
          </Text>
        }
      />
      {step === 1 ? <StepOne control={control} /> : <StepTwo control={control} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { gap: space.md, paddingBottom: space.lg },
  grow: { flex: 1 },
  gapSm: { gap: space.sm },
  pair: { flexDirection: 'row', gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  types: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  type: {
    flex: 1,
    backgroundColor: color.surface,
    borderRadius: radius.field,
    padding: space.md,
    gap: space.xs,
    minHeight: size.thumb * 2,
  },
  typeActive: { backgroundColor: color.accent },
  dimmed: { opacity: opacity.disabled },
  vehicle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: color.surface,
    borderRadius: radius.field,
    borderWidth: size.focusBorder,
    borderColor: color.surface,
    padding: space.md,
  },
  vehicleActive: { borderColor: color.accent },
  programRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  timeInput: {
    ...text.bodyStrong,
    color: color.ink,
    backgroundColor: color.bg,
    borderRadius: radius.badge,
    borderWidth: size.border,
    borderColor: color.bg,
    minHeight: size.touch,
    minWidth: size.thumb + space.lg,
    paddingHorizontal: space.sm,
    textAlign: 'center',
  },
  inputError: { borderColor: color.danger },
  titleInput: { ...text.body, flex: 1, color: color.ink, minHeight: size.touch },
  remove: { width: size.touch - space.sm, height: size.touch - space.sm },
  addRow: {
    minHeight: size.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.icon,
    borderWidth: size.border,
    borderStyle: 'dashed',
    borderColor: color.border,
    marginTop: space.xs,
  },
});
