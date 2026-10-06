/**
 * "مراجع هذه الجملة" (Figma 07 · Citations sheet): every source behind one
 * paragraph — favicon + source name, the quoted text (ayah / hadith) or book
 * title, its approved translation when there is one, the narration line, the
 * hadith grade, and a link to the source.
 * Shared by the draft sheet (scholar) and the answer bubble (both sides).
 */
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { openBrowserAsync } from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/hooks/use-theme";
import { useT } from "@/i18n/useT";
import { useFormatter } from "@/i18n/useFormatter";
import { haptics } from "@/lib/haptics";
import { radius, space } from "@/constants/layout";
import { typography } from "@/constants/typography";
import { SourceFavicon } from "./SourceFavicon";
import type { MueenParagraph, MueenSource } from "../types";

function SourceCard({ source }: { source: MueenSource }) {
  const c = useTheme();
  const { t } = useT("mueen");
  const isBook = source.kind === "shamela";
  return (
    <View style={[s.card, { backgroundColor: c.backgroundAlt, borderColor: c.border }]}>
      <View style={s.sourceRow}>
        <SourceFavicon kind={source.kind} size={22} />
        <Text style={[s.collection, { color: c.textMuted }]}>
          {source.reference ? `${source.collection} · ${source.reference}` : source.collection}
        </Text>
        {source.url ? (
          <Pressable
            onPress={() => {
              haptics.tap();
              void openBrowserAsync(source.url!);
            }}
            accessibilityRole="link"
            accessibilityLabel={t("citations.open")}
            hitSlop={4}
            style={({ pressed }) => [s.openBtn, { backgroundColor: c.mueenChip }, pressed && s.pressed]}
          >
            <Ionicons name="open-outline" size={16} color={c.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {source.quote ? (
        <AppText
          role={isBook ? "body" : "headline"}
          style={[s.quote, { color: c.text }, isBook ? s.bookTitle : s.quoteWeight]}
        >
          {source.quote}
        </AppText>
      ) : null}
      {source.translation ? (
        <AppText role="body" style={[s.translation, { color: c.textMuted }]}>
          {source.translation}
        </AppText>
      ) : null}
      {source.attribution || source.grade ? (
        <View style={s.gradeRow}>
          {source.grade ? (
            <View style={[s.grade, { backgroundColor: c.mueenTile }]}>
              <Ionicons name="checkmark" size={12} color={c.mueen} />
              <Text style={[s.gradeText, { color: c.mueen }]}>{t(`grade.${source.grade}`)}</Text>
            </View>
          ) : null}
          {source.attribution ? (
            <Text style={[s.attribution, { color: c.textDim }]}>{source.attribution}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function MueenCitationsSheet({
  paragraph,
  onClose,
}: {
  paragraph: MueenParagraph | null;
  onClose: () => void;
}) {
  const c = useTheme();
  const { t } = useT("mueen");
  const fmt = useFormatter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sources = paragraph?.sources ?? [];

  return (
    <BottomSheetModal visible={!!paragraph} onClose={onClose}>
      {({ close }) => (
        <View style={[s.body, { paddingBottom: Math.max(insets.bottom, space.base) }]}>
          <View style={s.header}>
            <View style={s.titleWrap}>
              <AppText role="headline" style={[s.title, { color: c.text }]}>
                {t("citations.title")}
              </AppText>
              <View style={[s.count, { backgroundColor: c.mueenChip }]}>
                <Text style={[s.countText, { color: c.textMuted }]}>{fmt.number(sources.length)}</Text>
              </View>
            </View>
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel={t("citations.close")}
              style={({ pressed }) => [s.closeBtn, pressed && s.pressed]}
            >
              <Ionicons name="close" size={20} color={c.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            style={{ maxHeight: height * 0.6 }}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
          >
            {sources.map((source) => (
              <SourceCard key={source.id} source={source} />
            ))}
          </ScrollView>

          <View style={s.footnote}>
            <Ionicons name="shield-checkmark-outline" size={12} color={c.textDim} />
            <Text style={[s.footnoteText, { color: c.textDim }]}>{t("citations.footnote")}</Text>
          </View>
        </View>
      )}
    </BottomSheetModal>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: space.base, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: space.sm },
  titleWrap: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.sm },
  title: { fontWeight: "600", textAlign: "auto" },
  count: {
    height: 20,
    minWidth: 20,
    paddingHorizontal: 6,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { ...typography.caption, fontWeight: "600" },
  closeBtn: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  list: { gap: space.md },
  card: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 10, borderCurve: "continuous" },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  collection: { ...typography.subhead, flex: 1, textAlign: "auto" },
  openBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  quote: { textAlign: "auto", writingDirection: "auto" },
  quoteWeight: { fontWeight: "500" },
  bookTitle: { fontWeight: "600" },
  translation: { textAlign: "auto", writingDirection: "auto" },
  gradeRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: space.sm },
  grade: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    height: 23,
    paddingHorizontal: 10,
    borderRadius: radius.full,
  },
  gradeText: { ...typography.caption, fontWeight: "600" },
  attribution: { ...typography.footnote, fontWeight: "400", flexShrink: 1, textAlign: "auto" },
  footnote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  footnoteText: { ...typography.caption, fontWeight: "400" },
  pressed: { opacity: 0.6 },
});
