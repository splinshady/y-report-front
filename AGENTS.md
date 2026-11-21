# y-report frontend

Репозиторий клиента. Сервер — соседняя папка `../backend` со своим git. Общие факты, порядок работы и границы — в `../AGENTS.md`.

## Стек

- TypeScript, React, Vite, TanStack Router, TanStack Query, Zod, Tailwind CSS
- pnpm
- Тексты интерфейса: русский
- Имена в коде: английские

## Код

- `src/main.tsx` — вход Vite
- `src/routes/` — маршруты TanStack Router
- `src/features/<область>/` — экран, компоненты, zod-схемы и запросы одной области
- `src/components/` — общие компоненты
- `src/lib/` — queryClient и общий клиентский код

Области: `team`, `schedule`, `shift-report`.

## Тесты

Vitest и React Testing Library. Файлы `*.test.ts` и `*.test.tsx` лежат рядом с кодом.

## API

Клиент ходит в JSON REST `/api` сервера. Общего пакета типов нет: zod-схема запроса живёт здесь, такая же схема — в `backend/`.

Меняешь вызов сервера — в том же плане меняется маршрут в `../backend`. Сначала прочитай `../backend/AGENTS.md`.
