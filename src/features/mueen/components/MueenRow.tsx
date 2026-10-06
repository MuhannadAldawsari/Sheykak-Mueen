/**
 * Wraps one chat row for Mu'een. Normal mode: adds the "Mu'een can't analyze
 * voice / images yet" caption under the asker's media (Figma v2 · 01).
 * Selection mode (03): text messages — the asker's, the scholar's own (as
 * context) and the question card — get a selection circle; voice, images
 * and everything else are dimmed. Reads MueenContext, so the chat's
 * renderItem stays stable.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/use-theme";
import { useT } from "@/i18n/useT";
import { haptics } from "@/lib/haptics";
import { palette } from "@/constants/palette";
import { radius, space } from "@/constants/layout";
import { typography } from "@/constants/typography";
import { fileNameFromUrl, isImageFile } from "@/shared/utils/file-types";
import type { MessageWithSender } from "@/shared/types/questions";
import { QUESTION_ITEM_ID, useMueenContext } from "../MueenContext";

/** Chat list horizontal padding (chat-screen.styles listContent). */
const LIST_GUTTER = 16;

function unsupportedKind(message: MessageWithSender): "audio" | "image" | "file" | null {
  if (message.is_deleted || message.sender_type !== "user") return null;
  if (message.message_type === "audio") return "audio";
  if (message.message_type !== "file") return null;
  const name = message.file_name ?? fileNameFromUrl(message.media_url ?? "") ?? "";
  return isImageFile(name) ? "image" : "file";
}

/** The asker's own text: where «للرد مع مُعين» is offered (Spec · Message menus). */
export function isAskerText(message: MessageWithSender): boolean {
  return message.sender_type === "user" && message.message_type === "text" && !message.is_deleted;
}

/** Selectable as draft input: any text message (the scholar's own is context). */
export function isMueenSelectable(message: MessageWithSender): boolean {
  return (
    (message.sender_type === "user" || message.sender_type === "scholar") &&
    message.message_type === "text" &&
    !message.is_deleted
  );
}

export function MueenRow({
  message,
  children,
}: {
  /** Omit for the pinned question card. */
  message?: MessageWithSender;
  children: React.ReactNode;
}) {
  const c = useTheme();
  const { t } = useT("mueen");
  const { draftingEnabled, selecting, selectedIds, toggleSelected } = useMueenContext();
  if (!draftingEnabled) return <>{children}</>;

  const unsupported = message ? unsupportedKind(message) : null;
  const caption = unsupported ? (
    <View style={s.caption}>
      <Ionicons name="alert-circle-outline" size={12} color={c.mueenDim} />
      <Text style={[s.captionText, { color: c.mueenDim }]}>{t(`unsupported.${unsupported}`)}</Text>
    </View>
  ) : null;

  if (!selecting) {
    return (
      <>
        {children}
        {caption}
      </>
    );
  }

  const id = message ? message.id : QUESTION_ITEM_ID;
  const selectable = message ? isMueenSelectable(message) : true;
  const fromAsker = !message || message.sender_type === "user";
  const selected = selectable && selectedIds.has(id);

  return (
    <Pressable
      disabled={!selectable}
      onPress={() => {
        haptics.select();
        toggleSelected(id);
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: !selectable }}
      style={s.row}
    >
      {selectable ? (
        <View
          style={[
            s.check,
            selected ? { backgroundColor: c.mueen, borderWidth: 0 } : { borderColor: palette.mueenCheckOff },
          ]}
        >
          {selected ? <Ionicons name="checkmark" size={14} color={c.inkOnBrand} /> : null}
        </View>
      ) : fromAsker ? (
        <View style={s.checkSpacer} />
      ) : null}
      <View style={s.content}>
        <View pointerEvents="none" style={!selectable && s.dimmed}>
          {children}
        </View>
        {caption}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: -LIST_GUTTER,
    paddingHorizontal: LIST_GUTTER,
    paddingVertical: 2,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkSpacer: { width: 24 },
  content: { flex: 1 },
  dimmed: { opacity: 0.45 },
  caption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 6,
    marginTop: -5,
    marginBottom: space.sm,
  },
  captionText: { ...typography.caption, textAlign: "auto" },
});
