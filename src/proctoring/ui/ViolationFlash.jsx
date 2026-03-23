import React, { useEffect, useState } from "react";

// Full screen colored overlay that appears briefly on violation
// Props: { severity: "medium"|"high"|null }
// Triggers CSS animation when severity changes
// pointer-events: none
// z-index: 9998
export default function ViolationFlash({ severity }) {
  const [flashClass, setFlashClass] = useState("");

  useEffect(() => {
    if (!severity) return;

    if (severity === "medium") {
      setFlashClass("flash-medium");
      const timer = setTimeout(() => setFlashClass(""), 2000); // 2 second duration
      return () => clearTimeout(timer);
    } else if (severity === "high") {
      setFlashClass("flash-high");
      const timer = setTimeout(() => setFlashClass(""), 2000); // 2 second duration
      return () => clearTimeout(timer);
    }
  }, [severity]);

  if (!flashClass) return null;

  const isHigh = flashClass === "flash-high";

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "52px",
        zIndex: 10001, // Above everything
        pointerEvents: "none",
        backgroundColor: isHigh ? "#dc2626" : "#f59e0b", // Red-600 or Amber-500
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.3s ease-in-out",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      }}
    >
      <span style={{ fontWeight: "800", fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {isHigh ? "⚠️ Critical Warning: Prohibited Activity Detected" : "⚠️ Suspicious Activity Detected: Please stay focused"}
      </span>
    </div>
  );
}
