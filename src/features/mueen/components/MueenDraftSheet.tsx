/**
 * Mu'een draft sheet (Figma 04 · whole conversation / 05 · selected messages):
 * header with regenerate, the scope row (what the draft was built from, with
 * a link into selection mode), the editable cited draft, the reviewer's
 * responsibility checkbox, and Send / Dismiss. Send stays disabled until the
 * scholar confirms they reviewed the answer and its sources.
 */
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/hooks/use-theme";
import { useT } from "@/i18n/useT";
import { useFormatter } from "@/i18n/useFormatter";
import { useDirIcon } from "@/i18n/useDirIcon";
import { haptics } from "@/lib/haptics";
import { radius, space } from "@/constants/layout";
import { typography } from "@/constants/typography";
import { countDistinctSources } from "../payload";
import type { MueenDraft, MueenParagraph, MueenScope } from "../types";
import { MueenCitationsSheet } from "./MueenCitationsSheet";
import { MueenDraftBody } from "./MueenDraftBody";
import { MueenIcon } from "./MueenIcon";

export function MueenDraftSheet({
  visible,
  onClose,
  scope,
  draft,
  loading,
  error,
  empty,
  onRegenerate,
  onPickMessages,
  onSend,
  sending,
}: {
  visible: boolean;
  onClose: () => void;
  scope: MueenScope;
  draft: MueenDraft | null;
  loading: boolean;
  error: boolean;
  empty: boolean;
  onRegenerate: () => void;
  /** Enter selection mode (screen 03) from the scope row. */
  onPickMessages: () => void;
  onSend: (draftId: string, paragraphs: MueenParagraph[]) => Promise<boolean>;
  sending: boolean;
}) {
  const c = useTheme();
  const { t } = useT("mueen");
  const fmt = useFormatter();
  const dirIcon = useDirIcon();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  // Local edits + review state belong to one generated draft.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [citation, setCitation] = useState<MueenParagraph | null>(null);
  useEffect(() => {
    setEdits({});
    setConfirmed(false);
  }, [draft?.id]);

  const paragraphs = useMemo(
    () => draft?.paragraphs.map((p) => (p.id in edits ? { ...p, text: edits[p.id] } : p)) ?? null,
    [draft, edits],
  );
  const sourceCount = paragraphs ? countDistinctSources(paragraphs) : 0;
  const hasText = !!paragraphs?.some((p) => p.text.trim());
  const canSend = !!draft && !loading && hasText && confirmed && !sending;

  // Fixed-height sheet that shrinks as the keyboard rises, so its top stays put.
  const baseHeight = height - insets.top - 48;
  const keyboard = useReanimatedKeyboardAnimation();
  const sizeStyle = useAnimatedStyle(() => ({ height: baseHeight + keyboard.height.value }));

  const subtitle = loading
    ? t("sheet.subtitleLoading")
    : t("sheet.subtitle", { sources: t("sources", { count: sourceCount, n: fmt.number(sourceCount) }) });
  const scopeLabel =
    scope.kind === "all"
      ? t("sheet.scopeAll")
      : t("sheet.scopeSelected", { count: scope.messageIds.length, n: fmt.number(scope.messageIds.length) });
  const textCount = draft?.textMessageCount ?? 0;

  return (
    <BottomSheetModal visible={visible} onClose={onClose} dragToDismiss={false}>
      {({ close }) => (
        <Animated.View style={[s.body, { paddingBottom: Math.max(insets.bottom, space.base) }, sizeStyle]}>
          {/* Header: icon tile · title/subtitle · regenerate */}
          <View style={s.header}>
            <View style={[s.tile, { backgroundColor: c.mueenTile }]}>
              <MueenIcon color={c.mueen} />
            </View>
            <View style={s.titleWrap}>
              <AppText role="headline" style={[s.title, { color: c.text }]}>
                {t("name")}
              </AppText>
              <Text numberOfLines={1} style={[s.subtitle, { color: c.textDim }]}>
                {subtitle}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                haptics.tap();
                onRegenerate();
              }}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={t("sheet.regenerate")}
              style={({ pressed }) => [s.iconBtn, (pressed || loading) && s.pressed]}
            >
              <Ionicons name="refresh" size={20} color={c.textMuted} />
            </Pressable>
          </View>

          {/* Scope: what the draft is built from */}
          <View style={[s.scope, { backgroundColor: c.backgroundAlt, borderColor: c.border }]}>
            <Ionicons name="chatbubble-outline" size={18} color={c.mueen} />
            <Text numberOfLines={1} style={[s.scopeLabel, { color: c.text }]}>
              {scopeLabel}
            </Text>
            <Text numberOfLines={1} style={[s.scopeCount, { color: c.textDim }]}>
              {scope.kind === "all" && draft
                ? t("sheet.textMessages", { count: textCount, n: fmt.number(textCount) })
                : ""}
            </Text>
            <Pressable
              onPress={() => {
                haptics.select();
                onPickMessages();
              }}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={[s.scopeLink, { color: c.mueen }]}>
                {scope.kind === "all" ? t("sheet.pickMessages") : t("sheet.editSelection")}
              </Text>
            </Pressable>
          </View>

          <View style={s.hint}>
            <Ionicons name="pencil-outline" size={14} color={c.textDim} />
            <Text style={[s.hintText, { color: c.textDim }]}>{t("sheet.editHint")}</Text>
          </View>

          <MueenDraftBody
            paragraphs={paragraphs}
            loading={loading}
            error={error}
            empty={empty}
            activeParagraphId={citation?.id ?? null}
            onChangeText={(id, text) => setEdits((prev) => ({ ...prev, [id]: text }))}
            onOpenSources={setCitation}
            onRetry={onRegenerate}
          />

          {/* Reviewer confirmation (checkbox: 20px, radius 6, 44px row) */}
          <Pressable
            onPress={() => {
              haptics.toggle();
              setConfirmed((v) => !v);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: confirmed }}
            style={[s.confirm, { backgroundColor: c.backgroundAlt }]}
          >
            <View
              style={[
                s.checkbox,
                confirmed
                  ? { backgroundColor: c.mueen, borderColor: c.mueen }
                  : { backgroundColor: c.background, borderColor: c.borderStrong },
              ]}
            >
              {confirmed ? <Ionicons name="checkmark" size={14} color={c.inkOnBrand} /> : null}
            </View>
            <AppText role="subhead" style={[s.confirmText, { color: c.text }]}>
              {t("sheet.confirm")}
            </AppText>
          </Pressable>

          <View style={s.actions}>
            <AnimatedPressable
              onPress={close}
              accessibilityRole="button"
              style={[s.dismiss, { backgroundColor: c.backgroundAlt, borderColor: c.borderStrong }]}
            >
              <Text style={[s.actionText, { color: c.text }]}>{t("sheet.dismiss")}</Text>
            </AnimatedPressable>
            <AnimatedPressable
              disabled={!canSend}
              onPress={async () => {
                if (!draft || !paragraphs) return;
                const done = await onSend(draft.id, paragraphs);
                if (done) close();
              }}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSend, busy: sending }}
              style={[s.send, { backgroundColor: canSend ? c.mueen : c.mueenChip }]}
            >
              <Text style={[s.actionText, { color: canSend ? c.inkOnBrand : c.textDim }]}>
                {t("sheet.send")}
              </Text>
              <Ionicons
                name={dirIcon("arrow-forward")}
                size={18}
                color={canSend ? c.inkOnBrand : c.textDim}
              />
            </AnimatedPressable>
          </View>

          <MueenCitationsSheet paragraph={citation} onClose={() => setCitation(null)} />
        </Animated.View>
      )}
    </BottomSheetModal>
  );
}

const s = StyleSheet.create({
  body: { paddingHorizontal: space.base, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  tile: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  titleWrap: { flex: 1, gap: 1 },
  title: { fontWeight: "600", textAlign: "auto" },
  subtitle: { ...typography.footnote, textAlign: "auto" },
  iconBtn: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  scope: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderRadius: 14,
  },
  scopeLabel: { ...typography.subhead, fontWeight: "600", flexShrink: 1 },
  scopeCount: { ...typography.footnote, fontWeight: "400", flex: 1, textAlign: "auto" },
  scopeLink: { ...typography.subhead, fontWeight: "600" },
  hint: { flexDirection: "row", alignItems: "center", gap: 6 },
  hintText: { ...typography.footnote, flexShrink: 1, textAlign: "auto" },
  confirm: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderRadius: 14,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: { flex: 1, textAlign: "auto" },
  actions: { flexDirection: "row", gap: 10 },
  dismiss: {
    height: 48,
    paddingHorizontal: space.lg,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  send: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  actionText: { ...typography.headline },
  pressed: { opacity: 0.5 },
});
