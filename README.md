# Вместе — мобильное приложение

React Native (Expo SDK 58, TypeScript strict). UI построен по концепции и модели данных из соседнего репозитория `KBR-travel` (`README.md`, `docs/database.md`, `db/schema.sql`): туры от ИП и самозанятых, попутки, оплата через эскроу платформы, QR-билет на каждое место, скан на посадке, кошелёк для возвратов.

## Запуск

```bash
npm install
cp .env.example .env.local      # EXPO_PUBLIC_USE_MOCKS=true — работа без бэкенда
npx expo run:android            # development build (Expo Go не подходит)
npm start                       # Metro для уже установленного dev build
```

Проверки: `npm run typecheck`, `npm run lint`.

### Сборка на Windows

Android Gradle Plugin и NDK не собирают проект из пути с кириллицей и упираются в лимит длины пути (260 символов). Нативную сборку делайте из короткого ASCII-пути, например `D:\v`; Metro можно запускать из любой папки:

```powershell
robocopy . D:\v /MIR /XD "$PWD\android" "$PWD\.git" "$PWD\.expo" D:\v\android
cd D:\v; npx expo run:android --no-bundler   # пересобирать только при изменении нативных зависимостей
cd <папка проекта>; npx expo start --dev-client
```

## Моки

`EXPO_PUBLIC_USE_MOCKS=true` — запросы и WebSocket идут в `src/api/mocks`. Моки повторяют правила БД: удержание мест на 15 минут, оплата кошелёк → эскроу, билет на каждое место, возврат по `free_cancel_hours` / `late_cancel_refund_percent`, окно скана ±12 часов, права ролей организатора.

Тестовый пользователь — Тимур А.: пассажир, водитель своей попутки и гид у «Горы с Азаматом».

| Сценарий | Где проверить |
| --- | --- |
| Онлайн-оплата и QR-билет | любой тур «Эльбрус Гид» → Забронировать → Оплатить |
| Лист ожидания | «Безенги: ледник и альплагерь» (мест нет) |
| Возврат по правилам отмены | Профиль → бронь на Эльбрус → Отменить |
| Подтверждение брони водителем | «Попутка на Чегемские водопады» → Участники |
| Скан билетов на посадке | «Верхняя Балкария» (выезд сегодня) → Сканер → тестовые коды |
| Отзыв после поездки | Профиль → История → «Домбай: Мусса-Ачитара» |
| Неверный SMS-код | код `0000` |

## Контракт API

Модели — `src/api/types.ts`, по таблицам `db/schema.sql`. Цены в API — целые копейки. Эндпоинты, которых нет в ТЗ и которые нужно добавить в `openapi.yaml`:

| Метод | Путь | Зачем |
| --- | --- | --- |
| GET | `/me/chats` | список чатов с последним сообщением и `unread_count` (по `chat_members.last_read_message_id`) |
| GET | `/me/trips`, `/me/vehicles`, `POST /me/vehicles` | мои выезды и машины для попутки |
| GET | `/me/wallet`, `POST /me/wallet/withdraw` | кошелёк и выписка (`account_statement`) |
| GET, POST | `/bookings/{id}`, `/bookings/{id}/pay` | бронь с билетами и `refund_preview`; оплата `card` / `wallet` |
| POST | `/bookings/{id}/review`, `/confirm`, `/decline` | отзыв; решение организатора по брони |
| GET | `/trips/{id}/bookings` | участники выезда для гида и водителя |
| POST | `/tickets/scan` | `scan_ticket()` |
| GET | `/directions`, `/notifications`, `POST /notifications/read` | направления (+ `seasons`, `travel_minutes`, `trips_count`) и уведомления |

Открытые вопросы к бэкенду: в таблице `directions` нет сезона и времени в пути; `device_platform` в БД — только `ios` / `android`, без RuStore.

## Структура

```
app/            маршруты: (auth), (tabs), trip/[id], trip/create, booking/[id], chat/[tripId],
                participants/[tripId], scan, wallet, notifications
src/api/        клиент (токен, refresh на 401), ошибки, хуки TanStack Query, моки
src/ws/         WebSocket чата: переподключение 1→30 с, ping 25 с, статусы сообщений
src/components/ общие компоненты UI
src/theme/      токены: цвета, шрифты, отступы, радиусы, размеры, палитры обложек по slug
src/store/      Zustand: токены, черновик выезда, тосты
src/utils/      даты, цены, склонения, подписи статусов
```
