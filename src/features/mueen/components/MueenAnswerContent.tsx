/**
 * Body of a `mueen` chat bubble (Figma 06 · Asker — Answer): each paragraph
 * followed by its citation pill. Tapping a pill opens the citations sheet;
 * while it is open the paragraph is highlighted and the rest dimmed (07).
 */
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/hooks/use-theme";
import { useT } from "@/i18n/useT";
import { palette } from "@/constants/palette";
import { space } from "@/constants/layout";
import type { MessageWithSender } from "@/shared/types/questions";
import { useMueenContext } from "../MueenContext";
import { decodeMueenAnswer } from "../payload";
import { MueenSourceChip } from "./MueenSourceChip";

export function MueenAnswerContent({
  message,
  isMine,
}: {
  message: MessageWithSender;
  isMine: boolean;
}) {
  const c = useTheme();
  const { t } = useT("mueen");
  const { activeCitation, openCitations } = useMueenContext();
  const payload = useMemo(() => decodeMueenAnswer(message.content), [message.content]);
  const textColor = { color: isMine ? palette.darkText : c.text };

  if (!payload) {
    return (
      <AppText role="body" style={[s.text, textColor]}>
        {t("preview.answer")}
      </AppText>
    );
  }

  const focused = activeCitation?.ownerId === message.id ? activeCitation.paragraph.id : null;

  return (
    <View style={s.wrap}>
      {payload.paragraphs.map((p) => {
        const active = focused === p.id;
        return (
          <View key={p.id} style={s.paragraph}>
            <View style={[s.textWrap, active && { backgroundColor: c.mueenHighlight }]}>
              <AppText
                role="body"
                style={[s.text, textColor, focused && !active ? s.dimmed : null]}
              >
                {p.text}
              </AppText>
            </View>
            {p.sources.length > 0 ? (
              <MueenSourceChip
                sources={p.sources}
                active={active}
                onPress={() => openCitations(message.id, p)}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: space.md },
  paragraph: { gap: 6 },
  textWrap: { borderRadius: 4, paddingHorizontal: 2, marginHorizontal: -2, borderCurve: "continuous" },
  text: { textAlign: "auto", writingDirection: "auto" },
  dimmed: { opacity: 0.4 },
});
