# AI Model Picker Design

## Goal

Replace free-text `/set_ai_model` with an inline-keyboard picker of OpenRouter’s most popular models (paginated by 10), plus a manual-entry fallback.

## Decisions

| Topic | Choice |
|-------|--------|
| Command | Replace existing `/set_ai_model` (option A) |
| Ranking | OpenRouter `GET /api/v1/models?sort=most-popular` |
| Pagination | 10 models per page; «Ещё» / «Назад» edit the same message |
| Manual entry | Separate button → same text/`0`-reset flow as today |
| Fetch strategy | Live request on each command; on failure → error + manual entry |
| Storage | Unchanged: `user_settings_table.aiModel` |

## UX flow

1. User runs `/set_ai_model`.
2. Bot fetches popular models from OpenRouter.
3. Bot replies: «Выбери модель» + inline keyboard:
   - up to 10 model buttons (display name, truncated ~40–50 chars);
   - «Ещё» if more pages exist;
   - «Назад» from page 2+;
   - «Ввести вручную».
4. Model tap → upsert `aiModel` with full model `id` → confirm and exit.
5. «Ещё» / «Назад» → `editMessageReplyMarkup` for the new page; keep waiting.
6. «Ввести вручную» → prompt for text; `0` clears to `null` (runtime default).

## Architecture

### New: `src/ai/openrouter-models.ts`

- `fetchPopularModels(apiKey?: string | null): Promise<{ id: string; name: string }[]>`
- Calls `https://openrouter.ai/api/v1/models?sort=most-popular`
- Prefer user’s OpenRouter key if set; otherwise unauthenticated public list
- Filter to models whose input modalities include `text`
- Return ordered list as received (already popularity-sorted)

### Keyboard helper

- `buildModelKeyboard(models, page, pageSize = 10): InlineKeyboard`
- Callback data (short, ≤64 bytes):
  - `mdl:{index}` — absolute index in the fetched list
  - `mdlpage:{n}` — show page `n`
  - `mdlmanual` — switch to text entry

### Rewrite: `setAiModel` conversation

1. Load user (for optional API key).
2. `fetchPopularModels(...)`.
3. On failure/empty → reply error and fall through to manual text entry.
4. Reply with keyboard (page 0); hold `models` in conversation locals.
5. Loop on `waitFor` callback/text until model saved or manual path completes.
6. Stale/out-of-range callbacks → `answerCallbackQuery` «Выбор устарел…» and continue or exit cleanly.

No schema or env changes. Chat completion still uses `aiModel || DEFAULT_AI_MODEL`.

## Error handling

| Case | Behavior |
|------|----------|
| OpenRouter down / empty list | Error message + manual entry |
| No user API key | Still try public `/models` |
| Stale callback / bad index | Callback answer with retry hint |
| Long display names | Truncate on button; confirm shows full `id` |
| Concurrent `/set_ai_model` | Existing conversation restart behavior |

## Testing

- Unit: keyboard pagination (page bounds, callback payloads, «Ещё»/«Назад» visibility).
- Unit: API response parsing / text-modality filter (mocked fetch).
- Manual: Telegram `/set_ai_model` — pick, paginate, manual, reset with `0`.

## Out of scope

- Caching / scheduled refresh
- Hardcoded fallback catalog
- Filtering by price, context, or tools
- Changing how chords streaming uses the selected model
