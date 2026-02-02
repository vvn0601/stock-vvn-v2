import React from "react";

export function DebugOverlay({ lines }: { lines: string[] }) {
  if (!lines.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        bottom: 12,
        width: "min(720px, calc(100vw - 24px))",
        maxHeight: "40vh",
        overflow: "auto",
        background: "rgba(0,0,0,0.85)",
        color: "#e5e7eb",
        padding: 12,
        borderRadius: 12,
        zIndex: 999999,
        fontSize: 12,
        lineHeight: 1.35,
        border: "1px solid rgba(255,255,255,0.15)",
        whiteSpace: "pre-wrap",
      }}
    >
      {lines.slice(-50).map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}
