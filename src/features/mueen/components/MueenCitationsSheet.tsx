/**
 * "مراجع هذه الجملة" (Figma v2 · 08 / 25 / 26 · Citations sheet): every
 * source behind one paragraph, as Source Cards — "النوع · المصدر" label with
 * the type's favicon, the verbatim ayah / hadith (or book / topic title), the
 * reference line (hadith grade as plain text), and an open-source button that
 * shows "تعذّر فتح المصدر" when the browser can't open it.
 * Shared by the draft sheet (scholar) and the answer bubble (both sides).
 */
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { openBrowserAsync } from "expo-web-browser";
import Toast from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ModalToast } from "@/components/ModalToast";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/hooks/use-theme";
import { useT } from "@/i18n/useT";
import { useFormatter } from "@/i18n/useFormatter";
import { haptics } from "@/lib/haptics";
import { radius, space } from "@/constants/layout";
import { typography } from "@/constants/typography";
import { SourceFavicon } from "./SourceFavicon";
import { sourceNumbers } from "../citations";
import type { MueenParagraph, MueenSource } from "../types";

/** Types whose card ends with a reference line; book / topic show a description. */
const HAS_REFERENCE_LINE = new Set(["quran", "hadith", "tafsir", "aqeedah"]);

function SourceCard({
  source,
  number,
  toastOffset,
}: {
  source: MueenSource;
  /** The «(n)» the paragraph text cites it by; null for Quran (cited by its reference). */
  number: number | null;
  toastOffset: number;
}) {
  const c = useTheme();
  const { t } = useT("mueen");
  const label = `${number !== null ? `(${number}) ` : ""}${t(`kind.${source.kind}`)} · ${source.collection}`;
  const grade = source.kind === "hadith" && source.grade ? t(`grade.${source.grade}`) : null;
  const referenceLine = [grade, source.attribution].filter(Boolean).join(" · ");

  const open = async () => {
    if (!source.url) return;
    haptics.tap();
    try {
      await openBrowserAsync(source.url);
    } catch {
      haptics.error();
      Toast.show({
        type: "alert",
        text1: t("toast.openFailed"),
        position: "bottom",
        bottomOffset: toastOffset,
      });
    }
  };

  return (
    <View style={[s.card, { backgroundColor: c.backgroundAlt, borderColor: c.border }]}>
      <View style={s.sourceRow}>
        <SourceFavicon kind={source.kind} size={22} />
        <Text style={[s.label, { color: c.textMuted }]}>{label}</Text>
        {source.url ? (
          <Pressable
            onPress={() => void open()}
            accessibilityRole="link"
            accessibilityLabel={t("citations.open")}
            hitSlop={4}
            style={({ pressed }) => [s.openBtn, { backgroundColor: c.mueenSoftFill }, pressed && s.pressed]}
          >
            <Ionicons name="open-outline" size={16} color={c.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {source.quote ? (
        source.kind === "quran" ? (
          <Text style={[s.ayah, { color: c.text }]}>{source.quote}</Text>
        ) : (
          <AppText role="headline" style={[s.quote, { color: c.text }]}>
            {source.quote}
          </AppText>
        )
      ) : null}
      {referenceLine ? (
        <Text
          style={[
            HAS_REFERENCE_LINE.has(source.kind) ? s.reference : s.description,
            { color: c.mueenDim },
          ]}
        >
          {referenceLine}
        </Text>
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
  const numbers = sourceNumbers(sources);
  // Toasts float just above the sheet, over the chat (screen 26).
  const [sheetHeight, setSheetHeight] = useState(360);

  return (
    <BottomSheetModal
      visible={!!paragraph}
      onClose={onClose}
      surfaceColor={c.mueenSheet}
      overlay={<ModalToast />}
    >
      {({ close }) => (
        <View
          style={[s.body, { paddingBottom: Math.max(insets.bottom, space.base) }]}
          onLayout={(e) => setSheetHeight(Math.round(e.nativeEvent.layout.height) + 40)}
        >
          <View style={s.header}>
            <View style={s.titleWrap}>
              <AppText role="title3" style={[s.title, { color: c.text }]}>
                {t("citations.title")}
              </AppText>
              <View style={[s.count, { backgroundColor: c.mueenDisabledBg }]}>
                <Text style={[s.countText, { color: c.mueenMuted }]}>{fmt.number(sources.length)}</Text>
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
            {/* Listed in the order the text cites them (numberCitations). */}
            {sources.map((source, i) => (
              <SourceCard key={source.id} source={source} number={numbers[i]} toastOffset={sheetHeight} />
            ))}
          </ScrollView>

          <View style={s.footnote}>
            <Ionicons name="shield-checkmark-outline" size={12} color={c.mueenDim} />
            <Text style={[s.footnoteText, { color: c.mueenDim }]}>{t("citations.footnote")}</Text>
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
  title: { textAlign: "auto" },
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
  label: { ...typography.subhead, flex: 1, textAlign: "auto" },
  openBtn: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  // Verbatim ayah: larger, airy line height (Spec · Source cards · Quran).
  ayah: { ...typography.title2, fontWeight: "600", lineHeight: 38, textAlign: "auto", writingDirection: "rtl" },
  quote: { fontWeight: "600", textAlign: "auto", writingDirection: "auto" },
  reference: { ...typography.footnote, textAlign: "auto" },
  description: { ...typography.subhead, textAlign: "auto" },
  footnote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  footnoteText: { ...typography.caption, fontWeight: "400" },
  pressed: { opacity: 0.6 },
});
