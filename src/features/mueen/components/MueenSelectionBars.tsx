/**
 * Selection mode chrome (Figma v2 · 03 · Select messages): a header that keeps
 * the asker's identity (avatar, name, last seen) with ✕ to leave selection,
 * and a bottom bar that replaces the composer — «صياغة مسودة مع مُعين (n)»
 * and a shortcut to draft from the whole conversation.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { UserAvatar } from "@/components/UserAvatar";
import { useTheme } from "@/hooks/use-theme";
import { useT } from "@/i18n/useT";
import { useFormatter } from "@/i18n/useFormatter";
import { haptics } from "@/lib/haptics";
import { radius, space } from "@/constants/layout";
import { typography } from "@/constants/typography";
import { MueenIcon } from "./MueenIcon";

export interface SelectionPartner {
  name?: string | null;
  avatarUrl?: string | null;
  status?: string | null;
}

export function MueenSelectionHeader({
  partner,
  onCancel,
}: {
  partner: SelectionPartner;
  onCancel: () => void;
}) {
  const c = useTheme();
  const { t } = useT("mueen");
  return (
    <View style={[s.header, { backgroundColor: c.mueenSheet }]}>
      <UserAvatar uri={partner.avatarUrl} size={42} accessibilityLabel={partner.name ?? undefined} />
      <View style={s.identity}>
        <Text numberOfLines={1} style={[s.name, { color: c.text }]}>
          {partner.name ?? ""}
        </Text>
        {partner.status ? (
          <Text numberOfLines={1} style={[s.status, { color: c.mueenDim }]}>
            {partner.status}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={() => {
          haptics.tap();
          onCancel();
        }}
        accessibilityRole="button"
        accessibilityLabel={t("select.cancel")}
        style={({ pressed }) => [s.cancel, pressed && s.pressed]}
      >
        <Ionicons name="close" size={24} color={c.text} />
      </Pressable>
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
        {
          backgroundColor: c.mueenSheet,
          borderTopColor: c.mueenLine,
          paddingBottom: Math.max(insets.bottom, space.md),
        },
      ]}
    >
      <AnimatedPressable
        onPress={onDraftSelected}
        disabled={disabled}
        haptic="light"
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={[s.cta, { backgroundColor: disabled ? c.mueenDisabledBg : c.mueen }]}
      >
        <MueenIcon size={18} color={disabled ? c.mueenDisabledText : c.inkOnBrand} />
        <Text style={[s.ctaText, { color: disabled ? c.mueenDisabledText : c.inkOnBrand }]}>
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
        <Text style={[s.linkText, { color: c.mueenMuted }]}>{t("select.whole")}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingStart: space.md,
    paddingEnd: space.sm,
  },
  identity: { flex: 1, gap: 1 },
  name: { ...typography.title3, fontWeight: "700", textAlign: "auto", writingDirection: "auto" },
  status: { ...typography.footnote, fontWeight: "400", textAlign: "auto" },
  cancel: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.full },
  footer: {
    borderTopWidth: 1,
    paddingTop: space.md,
    paddingHorizontal: space.base,
    gap: 6,
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
  link: { height: 40, justifyContent: "center", paddingHorizontal: space.sm, borderRadius: radius.sm },
  linkText: { ...typography.callout, fontWeight: "500" },
  pressed: { opacity: 0.6 },
});
