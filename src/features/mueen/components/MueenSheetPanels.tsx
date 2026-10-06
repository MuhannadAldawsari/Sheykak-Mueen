/**
 * Pieces of the Mu'een draft sheet that only some states show (Figma v2):
 * the status panel (13 · offline / failed, 18 · no sources), the quote bar
 * (07 · selected messages), the new-message banner (16), and the
 * regenerate confirmation dialog (15).
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { useTheme } from "@/hooks/use-theme";
import { useT } from "@/i18n/useT";
import { haptics } from "@/lib/haptics";
import { palette } from "@/constants/palette";
import { elevation, radius, space } from "@/constants/layout";
import { typography } from "@/constants/typography";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/** Full-height message in place of the draft box (13 · offline, 18 · no sources). */
export function MueenStatusPanel({
  icon,
  tone,
  title,
  body,
  action,
}: {
  icon: IoniconName;
  tone: "warning" | "neutral";
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
}) {
  const c = useTheme();
  return (
    <View style={[s.panel, { backgroundColor: c.mueenField, borderColor: c.mueenLine }]}>
      <View
        style={[
          s.panelIcon,
          { backgroundColor: tone === "warning" ? palette.mueenWarnTint : palette.mueenNeutralTint },
        ]}
      >
        <Ionicons name={icon} size={26} color={tone === "warning" ? palette.warningStrong : c.mueenDim} />
      </View>
      <Text style={[s.panelTitle, { color: c.text }]}>{title}</Text>
      <Text style={[s.panelBody, { color: c.mueenDim }]}>{body}</Text>
      {action ? (
        <AnimatedPressable
          onPress={action.onPress}
          haptic="light"
          accessibilityRole="button"
          style={[s.outlineBtn, { backgroundColor: c.mueenField, borderColor: c.mueen }]}
        >
          <Text style={[s.btnText, { color: c.text }]}>{action.label}</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

/** «DANIEL M. / وهل تحترمون أمّه مريم؟» with ✕ to send without the quote. */
export function MueenQuoteBar({
  name,
  preview,
  onRemove,
}: {
  name: string;
  preview: string;
  onRemove: () => void;
}) {
  const c = useTheme();
  const { t } = useT("mueen");
  return (
    <View style={[s.quote, { backgroundColor: c.mueenField }]}>
      <View style={[s.quoteBar, { backgroundColor: c.textMuted }]} />
      <View style={s.quoteText}>
        <Text numberOfLines={1} style={[s.quoteName, { color: c.textMuted }]}>
          {name}
        </Text>
        <Text numberOfLines={1} style={[s.quotePreview, { color: c.mueenMuted }]}>
          {preview}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          haptics.tap();
          onRemove();
        }}
        accessibilityRole="button"
        accessibilityLabel={t("sheet.removeQuote")}
        style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}
      >
        <Ionicons name="close" size={20} color={c.textMuted} />
      </Pressable>
    </View>
  );
}

/** «رسالة جديدة من السائل · تحديث المسودة» while the sheet is open (16). */
export function MueenNewMessageBanner({
  onUpdate,
  onHide,
}: {
  onUpdate: () => void;
  onHide: () => void;
}) {
  const c = useTheme();
  const { t } = useT("mueen");
  return (
    <View style={[s.banner, { backgroundColor: c.mueenBanner, borderColor: c.mueen }]}>
      <Text style={[s.bannerTitle, { color: c.text }]}>{t("sheet.newMessage")}</Text>
      <Pressable
        onPress={() => {
          haptics.select();
          onUpdate();
        }}
        hitSlop={8}
        accessibilityRole="button"
      >
        <Text style={[s.bannerAction, { color: c.mueen }]}>{t("sheet.updateDraft")}</Text>
      </Pressable>
      <Pressable
        onPress={onHide}
        accessibilityRole="button"
        accessibilityLabel={t("sheet.hideBanner")}
        style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}
      >
        <Ionicons name="close" size={18} color={c.textMuted} />
      </Pressable>
    </View>
  );
}

/** «إعادة الصياغة؟» — only asked when regenerating would discard edits (15). */
export function MueenRegenerateDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const c = useTheme();
  const { t } = useT("mueen");
  return (
    <View style={s.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityRole="button" />
      <View
        style={[s.dialog, { backgroundColor: c.mueenSheet, borderColor: c.mueenLine }]}
        accessibilityViewIsModal
      >
        <Text style={[s.dialogTitle, { color: c.text }]}>{t("regen.title")}</Text>
        <Text style={[s.dialogBody, { color: c.mueenMuted }]}>{t("regen.body")}</Text>
        <View style={s.dialogButtons}>
          <AnimatedPressable
            onPress={onCancel}
            accessibilityRole="button"
            style={[s.secondaryBtn, { backgroundColor: c.mueenField, borderColor: c.mueenLineStrong }]}
          >
            <Text style={[s.btnText, { color: c.text }]}>{t("regen.cancel")}</Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={onConfirm}
            haptic="light"
            accessibilityRole="button"
            style={[s.primaryBtn, { backgroundColor: c.mueen }]}
          >
            <Text style={[s.btnText, { color: c.inkOnBrand }]}>{t("regen.confirm")}</Text>
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  panel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: space.xl,
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  panelIcon: { width: 56, height: 56, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  panelTitle: { ...typography.title3, textAlign: "center", maxWidth: 300 },
  panelBody: { ...typography.callout, fontWeight: "400", lineHeight: 22, textAlign: "center", maxWidth: 280 },
  outlineBtn: {
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.xs,
  },
  btnText: { ...typography.headline },
  quote: { height: 52, borderRadius: 10, flexDirection: "row", alignItems: "center", overflow: "hidden" },
  quoteBar: { width: 4, alignSelf: "stretch" },
  quoteText: { flex: 1, paddingHorizontal: space.md, paddingVertical: space.sm },
  quoteName: { ...typography.subhead, lineHeight: 18, fontWeight: "600", textAlign: "auto", writingDirection: "auto" },
  quotePreview: { ...typography.subhead, lineHeight: 18, textAlign: "auto", writingDirection: "auto" },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.full },
  banner: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingStart: 14,
    paddingEnd: space.xs,
  },
  bannerTitle: { ...typography.subhead, lineHeight: 18, fontWeight: "600", flex: 1, textAlign: "auto" },
  bannerAction: { ...typography.subhead, lineHeight: 18, fontWeight: "600" },
  scrim: {
    position: "absolute",
    top: 0,
    bottom: 0,
    start: 0,
    end: 0,
    backgroundColor: palette.modalBackdrop,
    alignItems: "center",
    justifyContent: "center",
  },
  dialog: {
    width: 326,
    maxWidth: "88%",
    borderWidth: 1,
    borderRadius: 22,
    paddingTop: 22,
    paddingBottom: space.lg,
    paddingHorizontal: space.lg,
    gap: space.sm,
    boxShadow: elevation(5),
  },
  dialogTitle: { ...typography.title3, textAlign: "auto" },
  dialogBody: { ...typography.callout, fontWeight: "400", lineHeight: 22, textAlign: "auto" },
  dialogButtons: { flexDirection: "row", gap: 10, paddingTop: 14 },
  primaryBtn: { flex: 1, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  secondaryBtn: {
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
});
