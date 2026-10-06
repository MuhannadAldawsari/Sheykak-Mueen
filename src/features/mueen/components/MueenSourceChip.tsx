import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { useFormatter } from "@/i18n/useFormatter";
import { useT } from "@/i18n/useT";
import { haptics } from "@/lib/haptics";
import { radius, space } from "@/constants/layout";
import { typography } from "@/constants/typography";
import { SourceFavicon } from "./SourceFavicon";
import type { MueenSource } from "../types";

/** "الدرر السنية · الموسوعة الحديثية" → "الدرر السنية" for the compact chip. */
const shortName = (collection: string) => collection.split(" · ")[0];

/**
 * Citation pill under a paragraph (Figma "Citation Pill"): the first source's
 * favicon + "القرآن · مريم 30" / "الدرر السنية", and "+N" when the paragraph
 * has more. It is locked (not editable) and tapping opens that paragraph's
 * citations sheet.
 */
export function MueenSourceChip({
  sources,
  active = false,
  onPress,
}: {
  sources: MueenSource[];
  active?: boolean;
  onPress?: () => void;
}) {
  const c = useTheme();
  const { t } = useT("mueen");
  const fmt = useFormatter();
  const first = sources[0];
  if (!first) return null;
  const name = first.kind === "quran" ? t("kindShort.quran") : shortName(first.collection);
  const base = first.reference ? `${name} · ${first.reference}` : name;
  const label = sources.length > 1 ? `${base} +${fmt.number(sources.length - 1)}` : base;

  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              haptics.select();
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={t("citations.chipA11y", { label })}
      style={({ pressed }) => [
        s.chip,
        { backgroundColor: active ? c.mueenChipActive : c.mueenChip },
        active && { borderColor: c.mueen, borderWidth: 1 },
        pressed && s.pressed,
      ]}
    >
      <SourceFavicon kind={first.kind} />
      <Text
        numberOfLines={1}
        style={[s.label, { color: active ? c.mueen : c.mueenMuted }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    height: 22,
    paddingStart: 4,
    paddingEnd: space.sm,
    borderRadius: radius.full,
    maxWidth: "100%",
  },
  label: { ...typography.caption, textAlign: "auto", flexShrink: 1 },
  pressed: { opacity: 0.7 },
});
