import React from "react";
import MueenGlyph from "@/assets/images/mueen/mueen-icon.svg";

/** The Mu'een book-with-check glyph (Figma asset). Strokes use `color`. */
export function MueenIcon({ size = 18, color }: { size?: number; color: string }) {
  return <MueenGlyph width={size} height={size} color={color} />;
}
