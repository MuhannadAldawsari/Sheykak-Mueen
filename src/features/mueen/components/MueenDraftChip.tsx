/**
 * "مسودة من 6 مراجع معتمدة ⌃" (Figma 01 · Chat — Draft chip): the entry point
 * above the composer. Shows drafting progress, the source count once ready,
 * and a retry hint on failure. Tapping opens the draft sheet.
 */
import React from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { useTheme } from "@/hooks/use-theme";
import { useT } from "@/i18n/useT";
import { useFormatter } from "@/i18n/useFormatter";
import { radius, space } from "@/constants/layout";
import { typography } from "@/constants/typography";
import { MueenIcon } from "./MueenIcon";

export function MueenDraftChip({
  loading,
  error,
  sourceCount,
  noDraft = false,
  onPress,
}: {
  loading: boolean;
  error: boolean;
  sourceCount: number;
  /** The service answered without a draft (nothing in the approved sources / out of scope). */
  noDraft?: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  const { t } = useT("mueen");
  const fmt = useFormatter();
  const label = loading
    ? t("chip.loading")
    : error
      ? t("chip.error")
      : noDraft
        ? t("chip.noDraft")
        : t("chip.ready", { sources: t("sources", { count: sourceCount, n: fmt.number(sourceCount) }) });

  return (
    <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOut.duration(120)} style={s.wrap}>
      <AnimatedPressable
        onPress={onPress}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={`${t("chip.a11y")} — ${label}`}
        style={[s.chip, { backgroundColor: c.mueenChipActive, borderColor: c.mueenBorder }]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={c.mueen} />
        ) : (
          <MueenIcon size={18} color={c.mueen} />
        )}
        <Text numberOfLines={1} style={[s.label, { color: c.mueen }]}>
          {label}
        </Text>
        <Ionicons name={error ? "refresh" : "chevron-up"} size={16} color={c.mueen} />
      </AnimatedPressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: space.base, paddingBottom: space.sm, alignItems: "flex-start" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    maxWidth: "100%",
  },
  label: { ...typography.callout, fontWeight: "600", flexShrink: 1 },
});
