import React from "react";
import "./Modal.css";

function Modal({ isOpen, type, title, message, onConfirm, onCancel, confirmText = "OK", cancelText = "Cancel" }) {
  if (!isOpen) return null;

  const icons = { success: "✅", error: "❌", warning: "⚠️", confirm: "❓" };
  const colors = { success: "#22c55e", error: "#dc2626", warning: "#f59e0b", confirm: "#3b82f6" };

  return (
    <div className="modal-overlay" onClick={onCancel || onConfirm}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon" style={{ color: colors[type] }}>{icons[type]}</div>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-buttons">
          {onCancel && (
            <button className="modal-cancel" onClick={onCancel}>
              {cancelText}
            </button>
          )}
          <button className="modal-confirm" style={{ background: colors[type] }} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Modal;
