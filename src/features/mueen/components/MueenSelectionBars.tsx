/**
 * Selection mode chrome (Figma 03 · Select messages): the header that replaces
 * the chat header ("رسالتان محددتان" + ✕) and the bottom bar that replaces
 * the composer (draft for the selection, or for the whole conversation).
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/hooks/use-theme";
import { useT } from "@/i18n/useT";
import { useFormatter } from "@/i18n/useFormatter";
import { haptics } from "@/lib/haptics";
import { radius, space } from "@/constants/layout";
import { typography } from "@/constants/typography";
import { MueenIcon } from "./MueenIcon";

export function MueenSelectionHeader({ count, onCancel }: { count: number; onCancel: () => void }) {
  const c = useTheme();
  const { t } = useT("mueen");
  const fmt = useFormatter();
  return (
    <View style={[s.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
      <Pressable
        onPress={() => {
          haptics.tap();
          onCancel();
        }}
        accessibilityRole="button"
        accessibilityLabel={t("select.cancel")}
        style={({ pressed }) => [s.cancel, pressed && s.pressed]}
      >
        <Ionicons name="close" size={22} color={c.text} />
      </Pressable>
      <View style={s.titleWrap}>
        <AppText role="headline" style={[s.title, { color: c.text }]} accessibilityRole="header">
          {t("select.count", { count, n: fmt.number(count) })}
        </AppText>
        <Text style={[s.subtitle, { color: c.textDim }]}>{t("select.subtitle")}</Text>
      </View>
    </View>
  );
}

export function MueenSelectionFooter({
  count,
  onDraftSelected,
  onDraftAll,
}: {
  count: number;
  onDraftSelected: () => void;
  onDraftAll: () => void;
}) {
  const c = useTheme();
  const { t } = useT("mueen");
  const fmt = useFormatter();
  const insets = useSafeAreaInsets();
  const disabled = count === 0;
  return (
    <View
      style={[
        s.footer,
        { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, space.md) },
      ]}
    >
      <AnimatedPressable
        onPress={onDraftSelected}
        disabled={disabled}
        haptic="light"
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={[s.cta, { backgroundColor: disabled ? c.mueenChip : c.mueen }]}
      >
        <MueenIcon size={16} color={disabled ? c.textDim : c.inkOnBrand} />
        <Text style={[s.ctaText, { color: disabled ? c.textDim : c.inkOnBrand }]}>
          {t("select.cta", { n: fmt.number(count) })}
        </Text>
      </AnimatedPressable>
      <Pressable
        onPress={() => {
          haptics.select();
          onDraftAll();
        }}
        accessibilityRole="button"
        style={({ pressed }) => [s.link, pressed && s.pressed]}
      >
        <Text style={[s.linkText, { color: c.textMuted }]}>{t("select.whole")}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingStart: space.sm,
    paddingEnd: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancel: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  titleWrap: { flex: 1, gap: 1 },
  title: { fontWeight: "700", textAlign: "auto" },
  subtitle: { ...typography.footnote, fontWeight: "400", textAlign: "auto" },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.md,
    paddingHorizontal: space.base,
    gap: 10,
    alignItems: "center",
  },
  cta: {
    alignSelf: "stretch",
    height: 52,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  ctaText: { ...typography.headline },
  link: { height: 32, justifyContent: "center", paddingHorizontal: space.sm, borderRadius: radius.sm },
  linkText: { ...typography.subhead, fontWeight: "500" },
  pressed: { opacity: 0.6 },
});
