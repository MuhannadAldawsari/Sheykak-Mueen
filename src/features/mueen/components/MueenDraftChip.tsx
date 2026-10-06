/**
 * The Mu'een bar above the composer (Figma v2 · 01 / 19 · Spec · Draft bar
 * states): «استعن بمُعين» once a draft is ready (no count — the source count
 * lives in the sheet subtitle), a preparing state, an error that retries, a
 * "not enough approved sources" state, and an icon-only button after the
 * scholar dismissed the sheet (their edits are kept).
 */
import React from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { useTheme } from "@/hooks/use-theme";
import { useT } from "@/i18n/useT";
import { palette } from "@/constants/palette";
import { radius, space } from "@/constants/layout";
import { typography } from "@/constants/typography";
import { MueenIcon } from "./MueenIcon";

export type MueenBarState = "loading" | "ready" | "error" | "noSources" | "minimized";

export function MueenDraftChip({ state, onPress }: { state: MueenBarState; onPress: () => void }) {
  const c = useTheme();
  const { t } = useT("mueen");
  const shell = { backgroundColor: c.mueenContainer, borderColor: c.mueen };

  if (state === "minimized") {
    return (
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={s.row} pointerEvents="box-none">
        <AnimatedPressable
          onPress={onPress}
          haptic="light"
          accessibilityRole="button"
          accessibilityLabel={t("chip.miniA11y")}
          style={[s.mini, shell]}
        >
          <MueenIcon size={18} color={c.mueen} />
        </AnimatedPressable>
      </Animated.View>
    );
  }

  const label =
    state === "loading"
      ? t("chip.loading")
      : state === "error"
        ? t("chip.error")
        : state === "noSources"
          ? t("chip.noSources")
          : t("chip.ready");

  return (
    <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOut.duration(120)} style={s.row} pointerEvents="box-none">
      <AnimatedPressable
        onPress={onPress}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={`${t("chip.a11y")} — ${label}`}
        style={[s.chip, shell, state === "ready" && s.glow]}
      >
        {state === "loading" ? (
          <ActivityIndicator size="small" color={c.mueen} />
        ) : (
          <MueenIcon size={16} color={c.mueen} />
        )}
        <Text numberOfLines={1} style={[s.label, { color: c.mueen }]}>
          {label}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  // Floats over the chat list's bottom corner (start side); the end side
  // stays clear for the scroll-to-latest button.
  row: { position: "absolute", start: space.base, end: 64, bottom: space.sm, alignItems: "flex-start" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    height: 40,
    paddingStart: space.md,
    paddingEnd: space.base,
    borderRadius: radius.full,
    borderWidth: 1,
    maxWidth: "100%",
  },
  glow: { boxShadow: `0 0 10px ${palette.mueenGlow}` },
  mini: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { ...typography.callout, flexShrink: 1 },
});
