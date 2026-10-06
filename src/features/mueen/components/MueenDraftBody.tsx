/**
 * The bordered, scrollable draft box of the Mu'een sheet (Figma v2 · 06 / 07 /
 * 14): a skeleton while drafting or regenerating, otherwise the editable
 * paragraphs with their citation pills. Each paragraph is its own TextInput,
 * so an edit never detaches a sentence from its sources; a pill is locked
 * and disappears with its sentence (Spec · Pill editing).
 */
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SkeletonBar } from "@/components/SkeletonLoader";
import { useTheme } from "@/hooks/use-theme";
import { useT } from "@/i18n/useT";
import { radius, space } from "@/constants/layout";
import { typography } from "@/constants/typography";
import { MueenSourceChip } from "./MueenSourceChip";
import type { MueenParagraph } from "../types";

const SKELETON_LINES = ["100%", "92%", "70%", "100%", "84%", "96%", "58%", "100%", "76%"];
const LINE_HEIGHT = 26;
/** Covers the input's font padding, so the last line is never shaved. */
const MEASURE_SLACK = 4;
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

/**
 * One editable paragraph that always shows in full. Android neither grows a
 * multiline TextInput (scrollEnabled off) past its first layout nor reports its
 * content height reliably, so long paragraphs clipped and scrolled inside
 * themselves. An invisible Text with the same text, style and width measures
 * the real height; the input takes it and the sheet's ScrollView is the only
 * scroll.
 */
function ParagraphInput({ value, style, ...rest }: React.ComponentProps<typeof TextInput>) {
  const [height, setHeight] = useState<number | null>(null);
  return (
    <View>
      <View pointerEvents="none" style={s.measure} importantForAccessibility="no-hide-descendants">
        <Text
          style={[style, s.measureText]}
          onLayout={(e) => {
            const next = Math.max(LINE_HEIGHT, Math.ceil(e.nativeEvent.layout.height) + MEASURE_SLACK);
            if (next !== height) setHeight(next);
          }}
        >
          {/* The zero-width space keeps a trailing empty line (Enter at the end). */}
          {`${value ?? ""}${ZERO_WIDTH_SPACE}`}
        </Text>
      </View>
      <TextInput {...rest} value={value} multiline scrollEnabled={false} style={[style, height !== null && { height }]} />
    </View>
  );
}

export function MueenDraftBody({
  paragraphs,
  loading,
  activeParagraphId,
  onChangeText,
  onOpenSources,
}: {
  paragraphs: MueenParagraph[] | null;
  loading: boolean;
  activeParagraphId: string | null;
  onChangeText: (paragraphId: string, text: string) => void;
  onOpenSources: (paragraph: MueenParagraph) => void;
}) {
  const c = useTheme();
  const { t } = useT("mueen");

  return (
    <View style={[s.box, { backgroundColor: c.mueenField, borderColor: c.mueen }]}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loading || !paragraphs ? (
          <View style={s.skeleton} accessible accessibilityLabel={t("sheet.loading")}>
            {SKELETON_LINES.map((w, i) => (
              <SkeletonBar key={i} width={w} height={14} delay={i * 60} />
            ))}
          </View>
        ) : (
          paragraphs.map((p, index) => (
            <View key={p.id} style={s.paragraph}>
              <ParagraphInput
                value={p.text}
                onChangeText={(text) => onChangeText(p.id, text)}
                accessibilityLabel={t("sheet.paragraphA11y", { n: index + 1 })}
                selectionColor={c.mueen}
                style={[
                  s.input,
                  { color: c.text },
                  activeParagraphId === p.id && { backgroundColor: c.mueenHighlight },
                ]}
              />
              {p.sources.length > 0 && p.text.trim() ? (
                <MueenSourceChip
                  sources={p.sources}
                  active={activeParagraphId === p.id}
                  onPress={() => onOpenSources(p)}
                />
              ) : null}
            </View>
          ))
        )}
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
    lineHeight: LINE_HEIGHT,
    // "left" = start: forced RTL flips it (TextInput has no "auto").
    textAlign: "left",
    writingDirection: "auto",
    textAlignVertical: "top",
    padding: 0,
    paddingHorizontal: 2,
    marginHorizontal: -2,
    borderRadius: 4,
  },
  skeleton: { gap: 12 },
  measure: { position: "absolute", top: 0, start: 0, end: 0, opacity: 0 },
  measureText: { backgroundColor: "transparent" },
});
