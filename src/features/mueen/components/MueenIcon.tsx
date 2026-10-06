import React from "react";
import { View } from "react-native";
import MueenGlyph from "@/assets/images/mueen/mueen-icon.svg";

/** The quill's 24px artwork, as Figma draws it in every slot (16–20). */
const GLYPH = 24;

/**
 * The Mu'een identity icon: a quill with a spark (Figma "Icon/mueen").
 * `size` is the layout slot; like the design, the 24px artwork is centred on
 * it and may overflow slightly, so the icon reads the same everywhere.
 */
export function MueenIcon({ size = 18, color }: { size?: number; color: string }) {
  const offset = (size - GLYPH) / 2;
  return (
    <View style={{ width: size, height: size, overflow: "visible" }} pointerEvents="none">
      <MueenGlyph
        width={GLYPH}
        height={GLYPH}
        color={color}
        style={{ position: "absolute", top: offset, start: offset }}
      />
    </View>
  );
}
