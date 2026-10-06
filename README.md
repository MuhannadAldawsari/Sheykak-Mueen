# Sheykak-Mueen — معين الداعية

Mu'een (معين الداعية, "the preacher's helper") is the AI answer assistant in the Sheykak scholar chat. For an asker's question it drafts an answer in which **every paragraph carries its sources** (Quran, hadith, books). The scholar reviews, edits and sends it; the asker receives the answer with tappable sources.

This repo holds the Mu'een feature module extracted from the Sheykak mobile app (React Native / Expo). It is a drop-in module, **not a standalone app**: the code imports shared modules of the app (theme, i18n, UI primitives, chat), which are not included here.

**Status:** the UI is complete and connected to the Mu'een service through a Supabase Edge Function (`mueen-draft`). Set `EXPO_PUBLIC_MUEEN_MOCK=1` to use the offline sample answer instead.

## The flow (7 screens)

| # | Screen | What it does |
|---|---|---|
| 01 | Chat · draft chip | A pill above the composer ("draft from N trusted sources"). A caption under the asker's voice/image messages says Mu'een can't analyze them yet. |
| 02 | Long-press | A green first action, "select to reply via Mu'een", on the asker's text messages. |
| 03 | Select messages | Pick which of the asker's messages to answer, or draft from the whole conversation. |
| 04 | Draft · whole conversation | The draft sheet: editable paragraphs, each with its source chips; regenerate; review checkbox. |
| 05 | Draft · selected messages | The same sheet scoped to the picked messages. |
| 06 | Asker · answer | What the asker sees: one bubble, source chips after each paragraph. |
| 07 | Citations sheet | Tap a chip to see the quote, where it comes from, the hadith grade and a link. |

"Send" stays disabled until the scholar ticks *"I reviewed the answer and its sources, and take responsibility for what is sent in my name."*

## What's here

```
src/features/mueen/     types, payload codec, live + mock services, hooks, components, tests
src/locales/{ar,en}/    mueen.json strings (namespace "mueen")
assets/images/mueen/    the Mu'een book icon (SVG, uses currentColor)
database/               migration that allows message_type = 'mueen' (scholars only)
INTEGRATION.md          the small edits needed in the rest of the app
```
## Connecting the accounts

sheykh account
email: testislamic@gmail.com
Password: shaker876_


Normal user account
email: test12@gmail.com
password: shaker876_


## Connecting the model

The UI only talks to one interface, `MueenService` in [`src/features/mueen/types.ts`](src/features/mueen/types.ts):

```ts
generateDraft(request: MueenDraftRequest): Promise<MueenDraft>
```

- **Request:** the question (title, description), the text messages of the conversation (oldest first, each flagged `fromAsker`), and the scope: the whole conversation or a list of picked message ids.
- **Response:** `paragraphs`, each `{ id, text, sources[] }`. A source has a `kind` (`quran` | `dorar` | `shamela` | `other`), a `collection` name, and optionally `reference`, `quote`, `attribution`, `grade` (`sahih` | `hasan` | `daif`) and `url`.

[`api/index.ts`](src/features/mueen/api/index.ts) exports the live client in [`api/http-service.ts`](src/features/mueen/api/http-service.ts): it calls the Supabase Edge Function `mueen-draft` with the scholar's session, and the function (which holds the Mu'een API key, never shipped in the app) forwards the request to the Mu'een API's `POST /mueen/draft`. A draft takes about 30-60 seconds. Errors arrive as `MueenDraftError` with a `code` (`unauthorized`, `forbidden`, `no_input`, `timeout`, `network`, `unavailable`); only `network` is retried.

The live service also sends optional fields the mock does not: `status` (`ok` · `unverified` · `abstain` · `refer`), `level` (`A`-`D`), `notice` (an Arabic note for the scholar), `reviewPoints`, and `translation` on a source. The sheet uses them for:

- **No draft** (`abstain` / `refer`, empty `paragraphs`): the sheet says Mu'een did not draft an answer and shows the notice; the chip says so too. Send stays disabled.
- **Review banner** (`unverified`, or `level: "D"` for a personal case drafted from general evidence only): the notice is shown above the paragraphs.
- **Translations:** the citations sheet shows a source's approved translation under the quote, and sent answers keep it.

Hadith from HadeethEnc arrive as `kind: "other"` with a `grade`; Shamela books as `kind: "shamela"`.

The mock in [`api/mock-service.ts`](src/features/mueen/api/mock-service.ts) still returns the sample answer from the design.

## Message format

A sent answer is a normal chat message with `message_type = 'mueen'`. Its `content` is JSON:

```json
{ "v": 1, "draftId": "…", "paragraphs": [ { "id": "p1", "text": "…", "sources": [ { "id": "…", "kind": "quran", "collection": "القرآن", "reference": "مريم 30" } ] } ] }
```

Only scholars can send it (enforced by a database check). Inbox previews, reply quotes and *Copy* use the first paragraph or the plain text, never the raw JSON.

## Integrating

See [INTEGRATION.md](INTEGRATION.md).

## Tests

`src/features/mueen/__tests__/` (Jest): the payload codec, the mock service and the live client (error mapping). They run inside the app's `jest-expo` setup.

## License

None specified.
