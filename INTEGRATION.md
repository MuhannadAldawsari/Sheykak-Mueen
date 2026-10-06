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

Add these tokens to the palette and map them in both themes (`useTheme()`):

| Theme key | Dark | Light |
|---|---|---|
| `mueen` | `#63D48D` | `#18894B` |
| `mueenTint` | `rgba(99,212,141,0.08)` | `rgba(24,137,75,0.08)` |
| `mueenHighlight` | `rgba(99,212,141,0.20)` | `rgba(24,137,75,0.16)` |
| `mueenBorder` | `rgba(99,212,141,0.50)` | `rgba(24,137,75,0.45)` |
| `mueenTile` | `#16372E` | `#DCF1E3` |
| `mueenChip` | `rgba(255,255,255,0.08)` | `rgba(16,47,43,0.07)` |
| `mueenChipActive` | `#0E2A21` | `#E4F5EA` |

Source badges (same in both themes): Quran `#255A4C`, Dorar `#C9A84C`, Shamela `#5AA9D6`, other `#6B807E`.

## 4. i18n, query keys, cache

- Register the `mueen` namespace (`src/locales/{ar,en}/mueen.json`) in the i18n resources, both languages.
- Query key: `qk.mueen.draft(questionId, scopeKey)` and `qk.mueen.draftAll(questionId)`.
- Cache time: `STALE_TIME.mueenDraft = Infinity` (a draft is a one-off generation; only *regenerate* refreshes it).

## 5. Chat screen

- Call `useMueen({ questionId, draftingEnabled, question, messages, userId, currentUserName, avatarUrl, updateMessagesCache, closeActions })`, with `draftingEnabled = isScholar && questionIsActive && !isDirectChat`.
- Wrap the message list in `<MueenProvider value={mueen.context}>`, and wrap each row and the question card in `<MueenRow message={item}>`.
- Render the slots it returns: `mueen.header` in place of the chat header while selecting, `mueen.chip` above the composer, `mueen.footer` in place of the composer while selecting, and `mueen.overlays` at the end.
- Long-press menu: put `mueen.menuActionFor(contextMessage)` first in the actions. `MessageAction` gets two optional fields, `iconNode` (custom glyph) and `tone: "mueen"` (green label).

## 6. Message rendering and previews

- Message bubble: render `<MueenAnswerContent message isMine />` when `message_type === "mueen"`, with a slightly wider bubble (max width ~86%).
- Reply quotes: use `mueenPreviewText(content) ?? content`.
- Copy action: allow `mueen` messages and copy `mueenPlainText(content)`.
- Inbox previews (conversation lists and the inbox cache): use `formatMueenAnswerPreview(content)` for `mueen` messages.

## 7. Bottom sheet

The draft sheet scrolls vertically, so it needs swipe-down-to-dismiss turned off. Add an optional `dragToDismiss` prop (default `true`) to the shared bottom sheet and disable the pan gesture when it is `false`.

## 8. Mu'een service

- The Supabase Edge Function `mueen-draft` must be deployed with its secrets (`MUEEN_API_URL`, `MUEEN_API_KEY`); the app calls it with `supabase.functions.invoke`.
- `EXPO_PUBLIC_MUEEN_MOCK=1` switches back to the sample answer (UI work without the service).
- The chip drafts automatically when a scholar opens a question that needs an answer, so every such open runs the model once (about 30-60 s). Keep that in mind for the model provider's quota.

## Checks

`tsc --noEmit`, `jest`, and the i18n parity check (`ar` and `en` must have the same keys, including all six Arabic plural forms).
