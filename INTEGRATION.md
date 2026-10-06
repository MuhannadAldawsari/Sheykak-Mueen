# Integrating Mu'een into the Sheykak app

Besides copying the files in this repo, Mu'een needs a few small edits in the rest of the app. Only the edits are described here; the app's own code is not part of this repo.

## 1. Database

Apply [`database/20261001120000_mueen_answer_messages.sql`](database/20261001120000_mueen_answer_messages.sql). It allows `message_type = 'mueen'` on `public.messages` and adds a check so only `sender_type = 'scholar'` can send it. It only widens an existing rule and leaves existing rows untouched.

Push notifications: add a `mueen` case to `getMessagePreview` (edge functions, `_shared/send-push.ts`) so a notification shows the first paragraph instead of raw JSON:

```ts
case "mueen":
  return getMueenAnswerPreview(content);

function getMueenAnswerPreview(content: string | null): string {
  try {
    const payload = JSON.parse(content ?? "");
    const first = payload?.paragraphs?.[0]?.text;
    if (typeof first === "string" && first.trim()) return truncate(first.trim(), 100);
  } catch {
    // fall through
  }
  return "جواب موثّق بالمراجع 📖";
}
```

## 2. Types

Add `"mueen"` to the `message_type` union in the shared message types (`Message.message_type`, `reply_to_message_type`) and in the `sendMessage` API parameter.

## 3. Colors

Add these tokens to the palette and map them in both themes (`useTheme()`). Dark is the designed theme; light reuses the app's light surfaces.

| Theme key | Dark | Light |
|---|---|---|
| `mueen` | brand `#0CD886` | `#18894B` |
| `mueenContainer` | `#04271D` | `#DCF1E3` |
| `mueenTile` | `#16372E` | `#DCF1E3` |
| `mueenSheet` | `#0C2122` | light surface |
| `mueenField` | `#08191A` | light background alt |
| `mueenLine` / `mueenLineStrong` | `#233737` / `#324242` | light border / border strong |
| `mueenMuted` / `mueenDim` | `#B8C7C5` / `#8A9E9C` | light text muted / dim |
| `mueenDisabledBg` / `mueenDisabledText` | `#182121` / `#6F7F7E` | light surface highlight / text dim |
| `mueenBanner` | `#0E2A21` | `#E4F5EA` |
| `mueenChip` | `rgba(255,255,255,0.08)` | `rgba(16,47,43,0.07)` |
| `mueenChipActive` | `#0E2A21` | `#E4F5EA` |
| `mueenSoftFill` | `rgba(255,255,255,0.05)` | `rgba(16,47,43,0.05)` |
| `mueenHighlight` | `rgba(12,216,134,0.20)` | `rgba(24,137,75,0.16)` |

Palette-only (same in both themes): `mueenCheckOff` `#5E746D`, `mueenGlow` `rgba(12,216,134,0.25)`, `mueenWarnTint` `rgba(245,158,11,0.12)`, `mueenNeutralTint` `rgba(138,158,156,0.12)`, `mueenSourceInk` `#050F0F`.

Source badges: Quran `#255A4C`, hadith `#C9A84C`, book `#5AA9D6`, tafsir `#A78BFA`, aqeedah `#F0A5D8`, dawah `#F2A65A`, other `#6B807E`.

## 4. i18n, query keys, cache

- Register the `mueen` namespace (`src/locales/{ar,en}/mueen.json`) in the i18n resources, both languages.
- Query key: `qk.mueen.draft(questionId, scopeKey)` and `qk.mueen.draftAll(questionId)`.
- Cache time: `STALE_TIME.mueenDraft = Infinity` (a draft is a one-off generation; only *regenerate* refreshes it).

## 5. Chat screen

- Call `useMueen({ questionId, draftingEnabled, question, messages, partner, userId, currentUserName, avatarUrl, updateMessagesCache, closeActions, focusComposer })`, with `draftingEnabled = isScholar && questionIsActive && !isDirectChat`. `partner` is the asker (name, avatar, status) for the selection header; `focusComposer` focuses the chat input («كتابة الجواب بنفسي»).
- Wrap the message list in `<MueenProvider value={mueen.context}>`, and wrap each row and the question card in `<MueenRow message={item}>`.
- Render the slots it returns: `mueen.header` in place of the chat header while selecting, `mueen.chip` inside the list's container (it floats over the list's bottom corner), `mueen.footer` in place of the composer while selecting, and `mueen.overlays` at the end. While `mueen.chip` is shown, give the inverted list a ~56px `ListHeaderComponent` so the newest message can scroll clear of the button.
- Long-press menu: put `mueen.menuActionFor(contextMessage)` first in the actions. `MessageAction` gets two optional fields, `iconNode` (custom glyph) and `tone: "mueen"` (green label).

## 6. Message rendering and previews

- Message bubble: render `<MueenAnswerContent message isMine />` when `message_type === "mueen"`, with a slightly wider bubble (max width ~86%).
- Reply quotes: use `mueenPreviewText(content) ?? content`.
- Copy action: allow `mueen` messages and copy `mueenPlainText(content)`.
- Inbox previews (conversation lists and the inbox cache): use `formatMueenAnswerPreview(content)` for `mueen` messages.

## 7. Shared components

- **Bottom sheet:** the shared `BottomSheetModal` gets three optional props: `dragToDismiss` (`true` | `false` | `"handle"`; `"handle"` drags only from the top bar, so the scrolling draft can still be swiped away), `surfaceColor`, and `overlay` (rendered above the sheet inside its modal, for dialogs and toasts).
- **Toasts:** two toast types, `check` and `alert` (a pill toast), registered in the root toast config, plus a `ModalToast` host that the sources sheet passes as `overlay` so its toasts show above the modal.

## 8. Mu'een service

- Deploy [`supabase/functions/mueen-draft`](supabase/functions/mueen-draft/index.ts) with the secrets `MUEEN_API_URL` and `MUEEN_API_KEY`, and **with `--no-verify-jwt`** (`[functions.mueen-draft] verify_jwt = false` in `config.toml`). Projects that sign sessions with asymmetric (ES256) keys fail the gateway's legacy JWT check; the function verifies the caller with Supabase Auth itself.
- Request timeout: if the app's Supabase client aborts requests after a fixed time, give `/functions/v1/mueen-draft` about 155 s (a draft takes 30-60 s; the function waits up to 140 s for the API).
- Drafts run on request only (the scholar taps the button or picks messages), so the model runs once per request, not on every chat open.

## Checks

`tsc --noEmit`, `jest`, and the i18n parity check (`ar` and `en` must have the same keys, including all six Arabic plural forms).
