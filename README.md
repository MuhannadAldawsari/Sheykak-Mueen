# Sheykak-Mueen — معين الداعية

Mu'een (معين الداعية, "the preacher's helper") is the AI answer assistant in the Sheykak scholar chat. For an asker's question it drafts an answer in which **every paragraph carries its sources** (Quran, hadith, tafsir, books). The scholar reviews, edits and sends it; the asker receives the answer with tappable sources.

This repo holds the Mu'een feature module extracted from the Sheykak mobile app (React Native / Expo). It is a drop-in module, **not a standalone app**: the code imports shared modules of the app (theme, i18n, UI primitives, chat), which are not included here.

**Status:** v2 design ("Mu'een — AI Draft Flow v2"), connected to the Mu'een service through the Supabase Edge Function `mueen-draft` (source in [`supabase/functions/mueen-draft`](supabase/functions/mueen-draft/index.ts)). A draft is generated only when the scholar asks for one.

## The flow

| # | Screen | What it does |
|---|---|---|
| 01 | Chat · Mu'een button | A floating «استعن بمُعين» button over the chat. Nothing is drafted until it is tapped; after a dismissed draft it shrinks to an icon that reopens it. |
| 02 | Long-press | «للرد مع مُعين» as the first action on the asker's text messages. |
| 03 | Select messages | Pick the messages to answer (the asker's and the scholar's own text), or draft from the whole conversation. |
| 06-07 | Draft sheet | Editable paragraphs, each with its source pill; the newest selected asker message as a quote; regenerate (asks first when there are edits); review checkbox. Drag the top bar down to close. |
| 13-20 | Draft states | Loading skeleton, offline / failed with retry, no sources («كتابة الجواب بنفسي»), new asker message banner, edits kept after dismissing. |
| 08 / 25 | Sources sheet | Source cards in the order the text cites them, numbered (1), (2)… to match the text; Quran cards show the ayah and keep their reference. |
| 09-12 | Sent answer | One bubble with the source pills under each paragraph, for both the scholar and the asker; a quoted reply shows «أنت» on the asker's side. |

"Send" stays disabled until the scholar ticks «راجعتُ المسودة ومراجعها وأعتمد محتواها.»

## What's here

```
src/features/mueen/              types, payload codec, citation numbering, state helpers,
                                 live + mock services, hooks, components, tests
src/locales/{ar,en}/             mueen.json strings (namespace "mueen")
assets/images/mueen/             the Mu'een icon (quill + spark, SVG, uses currentColor)
supabase/functions/mueen-draft/  the Edge Function between the app and the Mu'een API
database/                        migration that allows message_type = 'mueen' (scholars only)
INTEGRATION.md                   the small edits needed in the rest of the app
```

## Connecting the accounts

sheykh account/
sheykh account /
email: testislamic@gmail.com ///
Password: shaker876_


Normal user account/
Normal user account /
email: test12@gmail.com ///
password: shaker876_


## Connecting the model

The UI only talks to one interface, `MueenService` in [`src/features/mueen/types.ts`](src/features/mueen/types.ts):

```ts
generateDraft(request: MueenDraftRequest): Promise<MueenDraft>
```

- **Request:** `questionId`, the question (title, description), the text messages of the conversation (each `{ id, text, fromAsker }`), and the scope: `{ kind: "all" }` or `{ kind: "selected", messageIds }`.
- **Response:** `status` (`ok` | `no_sources`), `textMessageCount`, and `paragraphs`, each `{ id, text, sources[] }`. A source has a `kind` (`quran` | `hadith` | `tafsir` | `aqeedah` | `dawah` | `book` | `other`), a `collection`, and optionally `reference`, `quote`, `attribution`, `grade` (`sahih` | `hasan` | `daif`) and `url`. Old payloads with `dorar` / `shamela` still decode (as `hadith` / `book`).

[`api/index.ts`](src/features/mueen/api/index.ts) exports the live client, [`api/live-service.ts`](src/features/mueen/api/live-service.ts). It calls the Edge Function `mueen-draft` with the scholar's session; the function checks the caller is an active scholar assigned to the question and forwards the request to the Mu'een API with the API key (a Supabase secret, never shipped in the app). A draft takes about 30-60 seconds.

- Errors arrive as `MueenDraftError` with `kind` `offline` or `failed`; the sheet shows the matching state with a retry.
- A `401` (an access token that expired while the app was idle) refreshes the session once and retries.
- When a draft arrives, [`citations.ts`](src/features/mueen/citations.ts) turns the API's inline markers such as «الصلاة (الصلاة)» or «(حديث)» into numbers «(1)», orders each paragraph's sources by first citation, and leaves Quran references like «(النساء: 43)» as written.

The mock in [`api/mock-service.ts`](src/features/mueen/api/mock-service.ts) returns the sample answer from the design (used by its tests).

## Message format

A sent answer is a normal chat message with `message_type = 'mueen'`. Its `content` is JSON:

```json
{ "v": 1, "draftId": "…", "paragraphs": [ { "id": "p1", "text": "… (1)", "sources": [ { "id": "…", "kind": "hadith", "collection": "…", "grade": "sahih" } ] } ] }
```

Only scholars can send it (enforced by a database check). Inbox previews, reply quotes and *Copy* use the first paragraph or the plain text, never the raw JSON.

## Integrating

See [INTEGRATION.md](INTEGRATION.md).

## Tests

`src/features/mueen/__tests__/` (Jest): the payload codec, citation numbering, the state helpers, the mock service and the live client. They run inside the app's `jest-expo` setup.

## License

None specified.
