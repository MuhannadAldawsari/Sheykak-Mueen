/**
 * Mu'een draft sheet (Figma v2 · 06 whole conversation · 07 selected messages
 * with quote · 13 error · 14 regenerating · 15 confirm regenerate · 16 new
 * message · 17 keyboard · 18 no sources). Header with regenerate, the scope
 * row (what the draft was built from), then the state's body, the reviewer's
 * confirmation and the actions. Send stays disabled until the scholar
 * confirms they reviewed the draft and its sources. Edits and the quote are
 * owned by useMueen so they survive closing the sheet.
 */
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useKeyboardState, useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/hooks/use-theme";
import { useT } from "@/i18n/useT";
import { useFormatter } from "@/i18n/useFormatter";
import { useDirIcon } from "@/i18n/useDirIcon";
import { haptics } from "@/lib/haptics";
import { palette } from "@/constants/palette";
import { radius, space } from "@/constants/layout";
import { typography } from "@/constants/typography";
import { countDistinctSources } from "../payload";
import type { MueenDraft, MueenParagraph, MueenScope } from "../types";
import { MueenCitationsSheet } from "./MueenCitationsSheet";
import { MueenDraftBody } from "./MueenDraftBody";
import { MueenIcon } from "./MueenIcon";
import {
  MueenNewMessageBanner,
  MueenQuoteBar,
  MueenRegenerateDialog,
  MueenStatusPanel,
} from "./MueenSheetPanels";

export interface MueenDraftSheetProps {
  visible: boolean;
  onClose: () => void;
  scope: MueenScope;
  draft: MueenDraft | null;
  /** The draft's paragraphs with the scholar's edits applied. */
  paragraphs: MueenParagraph[] | null;
  onChangeParagraph: (paragraphId: string, text: string) => void;
  hasEdits: boolean;
  loading: boolean;
  regenerating: boolean;
  errorKind: "offline" | "failed" | null;
  /** Nothing for Mu'een to answer yet. */
  empty: boolean;
  onRegenerate: () => void;
  onPickMessages: () => void;
  quote: { name: string; preview: string } | null;
  onRemoveQuote: () => void;
  showNewMessage: boolean;
  onUpdateForNewMessage: () => void;
  onHideNewMessage: () => void;
  onSend: () => Promise<boolean>;
  sending: boolean;
  onWriteMyself: () => void;
}

type Mode = "loading" | "ok" | "error" | "noSources" | "empty";

export function MueenDraftSheet(props: MueenDraftSheetProps) {
  const { visible, onClose, scope, draft, paragraphs, hasEdits, errorKind } = props;
  const c = useTheme();
  const { t } = useT("mueen");
  const fmt = useFormatter();
  const dirIcon = useDirIcon();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  // The confirmation belongs to one generated draft: a new draft starts unchecked.
  const [confirmedFor, setConfirmedFor] = useState<string | null>(null);
  const confirmed = !!draft && confirmedFor === draft.id;
  const [citation, setCitation] = useState<MueenParagraph | null>(null);
  // Regenerating would discard edits: ask first (screen 15).
  const [pending, setPending] = useState<"regenerate" | "update" | null>(null);

  const mode: Mode = props.loading || props.regenerating
    ? "loading"
    : errorKind
      ? "error"
      : props.empty
        ? "empty"
        : draft?.status === "no_sources"
          ? "noSources"
          : "ok";

  const sourceCount = paragraphs ? countDistinctSources(paragraphs) : 0;
  const hasText = !!paragraphs?.some((p) => p.text.trim());
  const canSend = mode === "ok" && hasText && confirmed && !props.sending;

  // Fixed-height sheet that shrinks as the keyboard rises, so its top stays put (17).
  const baseHeight = height - insets.top - 48;
  const keyboard = useReanimatedKeyboardAnimation();
  const sizeStyle = useAnimatedStyle(() => ({ height: baseHeight + keyboard.height.value }));
  // While editing, the draft box takes the space of the hint, checkbox and buttons
  // (you can't confirm or send mid-typing); they return when the keyboard closes.
  const editing = useKeyboardState((k) => k.isVisible);

  const subtitle =
    mode === "loading"
      ? props.regenerating
        ? t("sheet.subtitleRegenerating")
        : t("sheet.subtitleLoading")
      : mode === "error"
        ? t("sheet.subtitleError")
        : mode === "noSources"
          ? t("sheet.subtitleNoSources")
          : t("sheet.subtitle", { sources: t("sources", { count: sourceCount, n: fmt.number(sourceCount) }) });
  const scopeLabel =
    scope.kind === "all"
      ? t("sheet.scopeAll")
      : t("sheet.scopeSelected", { count: scope.messageIds.length, n: fmt.number(scope.messageIds.length) });
  const textCount = draft?.textMessageCount ?? 0;

  const ask = (action: "regenerate" | "update") => {
    if (hasEdits) {
      setPending(action);
      return;
    }
    if (action === "regenerate") props.onRegenerate();
    else props.onUpdateForNewMessage();
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      dragToDismiss="handle"
      surfaceColor={c.mueenSheet}
      overlay={
        pending ? (
          <MueenRegenerateDialog
            onCancel={() => setPending(null)}
            onConfirm={() => {
              const action = pending;
              setPending(null);
              if (action === "regenerate") props.onRegenerate();
              else props.onUpdateForNewMessage();
            }}
          />
        ) : null
      }
    >
      {({ close }) => (
        <Animated.View style={[s.body, { paddingBottom: Math.max(insets.bottom, space.base) }, sizeStyle]}>
          {/* Header: icon tile · title/subtitle · regenerate */}
          <View style={s.header}>
            <View
              style={[s.tile, { backgroundColor: mode === "error" ? palette.darkNavIndicator : c.mueenTile }]}
            >
              <MueenIcon size={20} color={c.mueen} />
            </View>
            <View style={s.titleWrap}>
              <AppText role="title3" style={[s.title, { color: c.text }]}>
                {t("name")}
              </AppText>
              <Text numberOfLines={1} style={[s.subtitle, { color: c.mueenDim }]}>
                {subtitle}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                haptics.tap();
                ask("regenerate");
              }}
              disabled={mode === "loading"}
              accessibilityRole="button"
              accessibilityLabel={t("sheet.regenerate")}
              style={({ pressed }) => [s.iconBtn, (pressed || mode === "loading") && s.pressed]}
            >
              <Ionicons name="refresh" size={20} color={c.textMuted} />
            </Pressable>
          </View>

          {/* Scope: what the draft is built from */}
          <View style={[s.scope, { backgroundColor: c.mueenField, borderColor: c.mueenLine }]}>
            <Ionicons name="chatbubble-outline" size={18} color={c.mueen} />
            <Text numberOfLines={1} style={[s.scopeLabel, { color: c.text }]}>
              {scopeLabel}
            </Text>
            <Text numberOfLines={1} style={[s.scopeCount, { color: c.mueenDim }]}>
              {scope.kind === "all" && draft
                ? t("sheet.textMessages", { count: textCount, n: fmt.number(textCount) })
                : ""}
            </Text>
            <Pressable
              onPress={() => {
                haptics.select();
                props.onPickMessages();
              }}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={[s.scopeLink, { color: c.mueen }]}>
                {scope.kind === "all" ? t("sheet.pickMessages") : t("sheet.editSelection")}
              </Text>
            </Pressable>
          </View>

          {props.showNewMessage && mode !== "loading" ? (
            <MueenNewMessageBanner onUpdate={() => ask("update")} onHide={props.onHideNewMessage} />
          ) : null}
          {props.quote && (mode === "ok" || mode === "loading") ? (
            <MueenQuoteBar
              name={props.quote.name}
              preview={props.quote.preview}
              onRemove={props.onRemoveQuote}
            />
          ) : null}

          {mode === "error" ? (
            <MueenStatusPanel
              icon="cloud-offline-outline"
              tone="warning"
              title={errorKind === "offline" ? t("sheet.offlineTitle") : t("sheet.failedTitle")}
              body={errorKind === "offline" ? t("sheet.offlineBody") : t("sheet.failedBody")}
            />
          ) : mode === "noSources" ? (
            <MueenStatusPanel
              icon="book-outline"
              tone="neutral"
              title={t("sheet.noSourcesTitle")}
              body={t("sheet.noSourcesBody")}
              action={{ label: t("sheet.editSelection"), onPress: props.onPickMessages }}
            />
          ) : mode === "empty" ? (
            <MueenStatusPanel icon="chatbubbles-outline" tone="neutral" title={t("name")} body={t("sheet.empty")} />
          ) : (
            <>
              {editing ? null : (
                <View style={s.hint}>
                  <Ionicons name="pencil-outline" size={14} color={c.mueenDim} />
                  <Text style={[s.hintText, { color: c.mueenDim }]}>{t("sheet.editHint")}</Text>
                </View>
              )}
              <MueenDraftBody
                paragraphs={paragraphs}
                loading={mode === "loading"}
                activeParagraphId={citation?.id ?? null}
                onChangeText={props.onChangeParagraph}
                onOpenSources={setCitation}
              />
              {/* Reviewer confirmation (checkbox 20, radius 6, 44 tall row) */}
              {editing ? null : (
              <Pressable
                onPress={() => {
                  if (!draft) return;
                  haptics.toggle();
                  setConfirmedFor(confirmed ? null : draft.id);
                }}
                disabled={mode !== "ok"}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: confirmed, disabled: mode !== "ok" }}
                style={[s.confirm, { backgroundColor: c.mueenField }]}
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
              )}
            </>
          )}

          <View style={[s.actions, editing && s.hidden]}>
            {mode === "noSources" ? (
              <AnimatedPressable
                onPress={() => {
                  close();
                  props.onWriteMyself();
                }}
                accessibilityRole="button"
                style={[s.secondary, s.grow, { backgroundColor: c.mueenField, borderColor: c.mueenLineStrong }]}
              >
                <Text style={[s.actionText, { color: c.text }]}>{t("sheet.writeMyself")}</Text>
              </AnimatedPressable>
            ) : (
              <>
                <AnimatedPressable
                  onPress={close}
                  accessibilityRole="button"
                  style={[s.secondary, { backgroundColor: c.mueenField, borderColor: c.mueenLineStrong }]}
                >
                  <Text style={[s.actionText, { color: c.text }]}>{t("sheet.dismiss")}</Text>
                </AnimatedPressable>
                {mode === "error" ? (
                  <AnimatedPressable
                    onPress={props.onRegenerate}
                    haptic="light"
                    accessibilityRole="button"
                    style={[s.primary, { backgroundColor: c.mueen }]}
                  >
                    <Text style={[s.actionText, { color: c.inkOnBrand }]}>{t("sheet.retry")}</Text>
                    <Ionicons name="refresh" size={18} color={c.inkOnBrand} />
                  </AnimatedPressable>
                ) : mode !== "empty" ? (
                  <AnimatedPressable
                    disabled={!canSend}
                    onPress={async () => {
                      const done = await props.onSend();
                      if (done) close();
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canSend, busy: props.sending }}
                    style={[s.primary, { backgroundColor: canSend ? c.mueen : c.mueenDisabledBg }]}
                  >
                    <Text style={[s.actionText, { color: canSend ? c.inkOnBrand : c.mueenDisabledText }]}>
                      {t("sheet.send")}
                    </Text>
                    <Ionicons
                      name={dirIcon("arrow-forward")}
                      size={18}
                      color={canSend ? c.inkOnBrand : c.mueenDisabledText}
                    />
                  </AnimatedPressable>
                ) : null}
              </>
            )}
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
  title: { textAlign: "auto" },
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
  hidden: { display: "none" },
  grow: { flex: 1 },
  secondary: {
    height: 48,
    paddingHorizontal: space.lg,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
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
