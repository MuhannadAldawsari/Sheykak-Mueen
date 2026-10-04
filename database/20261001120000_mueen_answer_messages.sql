-- ============================================================
-- Mu'een (معين الداعية) answers: allow message_type = 'mueen'
-- A 'mueen' message is a scholar's reviewed, AI-drafted answer where each
-- paragraph carries its sources (Quran / Hadith / books). Its `content`
-- holds a JSON payload: {"v":1,"draftId":...,"paragraphs":[{text,sources}]}.
-- Only scholars can send it.
-- ============================================================

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_message_type_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_message_type_check CHECK (
    message_type = ANY (ARRAY['text'::text, 'audio'::text, 'image'::text, 'file'::text, 'call'::text, 'mueen'::text])
  );

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_mueen_sender_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_mueen_sender_check CHECK (
    message_type IS DISTINCT FROM 'mueen' OR sender_type = 'scholar'
  );
