import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette } from "@/constants/palette";
import { typography } from "@/constants/typography";
import { useT } from "@/i18n/useT";
import type { MueenSourceKind } from "../types";

const KIND_STYLE: Record<MueenSourceKind, { bg: string; ink: string }> = {
  quran: { bg: palette.mueenSourceQuran, ink: palette.darkText },
  dorar: { bg: palette.mueenSourceDorar, ink: palette.inkOnBrand },
  shamela: { bg: palette.mueenSourceShamela, ink: palette.inkOnBrand },
  other: { bg: palette.mueenSourceOther, ink: palette.darkText },
};

/** Round letter badge for a source family: ق Quran · د Dorar · ش Shamela. */
export function SourceFavicon({ kind, size = 14 }: { kind: MueenSourceKind; size?: number }) {
  const { t } = useT("mueen");
  const { bg, ink } = KIND_STYLE[kind];
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
  letterLg: { ...typography.footnote, fontWeight: "700", textAlign: "center" },
});
