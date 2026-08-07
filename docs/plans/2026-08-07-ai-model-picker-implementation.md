# AI Model Picker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace free-text `/set_ai_model` with an OpenRouter most-popular inline keyboard (10 per page) plus manual entry.

**Architecture:** Fetch `GET /api/v1/models?sort=most-popular` on command, build paginated InlineKeyboard with short callback data (`mdl:{i}`, `mdlpage:{n}`, `mdlmanual`), save selected model id into existing `user_settings.aiModel`. On API failure, fall back to text entry.

**Tech Stack:** Bun, grammy, @grammyjs/conversations, OpenRouter HTTP API, bun:test

**Design:** `docs/plans/2026-08-07-ai-model-picker-design.md`

**Workspace:** Implement on `main` (user requested; no worktree).

---

### Task 1: Fetch popular OpenRouter models

**Files:**
- Create: `src/ai/openrouter-models.ts`
- Test: `src/ai/openrouter-models.test.ts`

**Step 1: Write failing tests** for:
- Parses `{ data: [{ id, name, architecture?: { input_modalities } }] }` into `{ id, name }[]`
- Filters to models that accept `text` input (missing modalities → keep)
- Propagates fetch errors / empty list as throw or empty (match chosen API)

**Step 2: Implement `fetchPopularModels(apiKey?: string | null)`** calling
`https://openrouter.ai/api/v1/models?sort=most-popular` with optional `Authorization: Bearer …`.

**Step 3: Tests pass. Commit.**

---

### Task 2: Model picker keyboard helper

**Files:**
- Create: `src/conversation/model-keyboard.ts`
- Test: `src/conversation/model-keyboard.test.ts`

**Step 1: Failing tests** for page 0 / middle / last:
- 10 model buttons with truncated labels
- callback `mdl:{absoluteIndex}`
- «Ещё» → `mdlpage:{n+1}` when more pages
- «Назад» → `mdlpage:{n-1}` when page > 0
- «Ввести вручную» → `mdlmanual`
- Export helpers: `parseModelCallback`, `PAGE_SIZE = 10`, `truncateLabel`

**Step 2: Implement. Tests pass. Commit.**

---

### Task 3: Rewrite `setAiModel` conversation

**Files:**
- Modify: `src/conversation/settings.conversation.ts`
- Keep: `src/index.ts` command wiring (same conversation name)

**Behavior:**
1. Load user + optional API key
2. `fetchPopularModels` → on fail/empty: error reply + manual text path
3. Reply with keyboard page 0; loop on callback/text
4. `mdl:{i}` → upsert `aiModel`, confirm, exit
5. `mdlpage:{n}` → edit reply markup
6. `mdlmanual` / fail path → existing text/`0` reset via shared helper

**Step: Manual smoke via bot later. Commit.**

---

### Task 4: Polish

- Truncate button labels ~45 chars
- Russian UI strings matching design
- Run `bun test` + biome format
- Final commit if needed
