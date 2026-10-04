/**
 * The bordered, scrollable draft box of the Mu'een sheet: loading skeleton,
 * error / empty states, or the editable paragraphs with their citation pills.
 * Each paragraph is its own TextInput, so an edit never detaches a sentence
 * from its sources ("المراجع تبقى مرتبطة بجملها").
 */
import React from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { AppButton } from "@/components/ui/AppButton";
import { SkeletonBar } from "@/components/SkeletonLoader";
import { useTheme } from "@/hooks/use-theme";
import { useT } from "@/i18n/useT";
import { radius, space } from "@/constants/layout";
import { typography } from "@/constants/typography";
import { MueenSourceChip } from "./MueenSourceChip";
import type { MueenParagraph } from "../types";

const SKELETON_LINES = ["100%", "92%", "70%", "100%", "84%", "96%", "58%"];

export function MueenDraftBody({
  paragraphs,
  loading,
  error,
  empty,
  activeParagraphId,
  onChangeText,
  onOpenSources,
  onRetry,
}: {
  paragraphs: MueenParagraph[] | null;
  loading: boolean;
  error: boolean;
  empty: boolean;
  activeParagraphId: string | null;
  onChangeText: (paragraphId: string, text: string) => void;
  onOpenSources: (paragraph: MueenParagraph) => void;
  onRetry: () => void;
}) {
  const c = useTheme();
  const { t } = useT("mueen");

  let content: React.ReactNode;
  if (loading) {
    content = (
      <View style={s.skeleton} accessibilityLabel={t("sheet.loading")} accessible>
        <AppText role="footnote" style={[s.status, { color: c.textDim }]}>
          {t("sheet.loading")}
        </AppText>
        {SKELETON_LINES.map((w, i) => (
          <SkeletonBar key={i} width={w} height={14} delay={i * 60} />
        ))}
      </View>
    );
  } else if (empty) {
    content = (
      <AppText role="subhead" style={[s.status, { color: c.textMuted }]}>
        {t("sheet.empty")}
      </AppText>
    );
  } else if (error || !paragraphs) {
    content = (
      <View style={s.errorWrap}>
        <AppText role="subhead" style={[s.status, { color: c.textMuted }]}>
          {t("sheet.error")}
        </AppText>
        <AppButton label={t("sheet.retry")} variant="secondary" size="sm" onPress={onRetry} />
      </View>
    );
  } else {
    content = paragraphs.map((p, index) => (
      <View key={p.id} style={s.paragraph}>
        <TextInput
          value={p.text}
          onChangeText={(text) => onChangeText(p.id, text)}
          multiline
          scrollEnabled={false}
          accessibilityLabel={t("sheet.paragraphA11y", { n: index + 1 })}
          selectionColor={c.mueen}
          style={[
            s.input,
            { color: c.text },
            activeParagraphId === p.id && { backgroundColor: c.mueenHighlight },
          ]}
        />
        {p.sources.length > 0 ? (
          <MueenSourceChip
            sources={p.sources}
            active={activeParagraphId === p.id}
            onPress={() => onOpenSources(p)}
          />
        ) : null}
      </View>
    ));
  }

  return (
    <View style={[s.box, { backgroundColor: c.backgroundAlt, borderColor: c.mueenBorder }]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  box: { flex: 1, borderWidth: 1, borderRadius: radius.xl, overflow: "hidden", borderCurve: "continuous" },
  scroll: { padding: space.base, gap: space.md },
  paragraph: { gap: 6 },
  input: {
    ...typography.body,
    lineHeight: 26,
    // "left" = start: forced RTL flips it (TextInput has no "auto").
    textAlign: "left",
    writingDirection: "auto",
    textAlignVertical: "top",
    padding: 0,
    paddingHorizontal: 2,
    marginHorizontal: -2,
    borderRadius: 4,
  },
  skeleton: { gap: 10 },
  status: { textAlign: "center" },
  errorWrap: { alignItems: "center", gap: space.md, paddingVertical: space.lg },
});
