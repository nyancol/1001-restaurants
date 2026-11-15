import React from "react";

/** Decorative color dot on neutral pill. Never colored text (a11y: label always present). */
export default function TagDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: 9999,
        backgroundColor: color,
        border: "1px solid rgba(0,0,0,0.25)",
        flexShrink: 0,
      }}
    />
  );
}
