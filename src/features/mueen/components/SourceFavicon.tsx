import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette } from "@/constants/palette";
import { typography } from "@/constants/typography";
import { useT } from "@/i18n/useT";
import type { MueenSourceKind } from "../types";

/** Spec · Source cards: one colour per source type; dark letter except on Quran. */
const KIND_STYLE: Record<MueenSourceKind, { bg: string; ink: string }> = {
  quran: { bg: palette.mueenSourceQuran, ink: palette.darkText },
  hadith: { bg: palette.mueenSourceHadith, ink: palette.mueenSourceInk },
  tafsir: { bg: palette.mueenSourceTafsir, ink: palette.mueenSourceInk },
  aqeedah: { bg: palette.mueenSourceAqeedah, ink: palette.mueenSourceInk },
  dawah: { bg: palette.mueenSourceDawah, ink: palette.mueenSourceInk },
  book: { bg: palette.mueenSourceBook, ink: palette.mueenSourceInk },
  other: { bg: palette.mueenSourceOther, ink: palette.darkText },
};

/** Round letter badge for a source type: ق · د · ت · ع · م · ش. */
export function SourceFavicon({ kind, size = 14 }: { kind: MueenSourceKind; size?: number }) {
  const { t } = useT("mueen");
  const { bg, ink } = KIND_STYLE[kind] ?? KIND_STYLE.other;
  return (
    <View
      style={[s.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Text style={[size > 16 ? s.letterLg : s.letter, { color: ink }]} allowFontScaling={false}>
        {t(`badge.${kind}`)}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: { alignItems: "center", justifyContent: "center" },
  letter: { ...typography.micro, lineHeight: 12, fontWeight: "700", textAlign: "center" },
  letterLg: { ...typography.footnote, lineHeight: 16, fontWeight: "600", textAlign: "center" },
});
