"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

const TOOL_URL = "https://torquegirl.com/tools/obd2-log-analyzer";
const SHARE_PAYLOAD = {
  title: "TorqueGirl OBD2 Log Analyzer",
  text: "Explore your OBD2 log locally in your browser. Nothing is uploaded.",
  url: TOOL_URL,
} as const;

async function copyToolLink() {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(TOOL_URL);
    return;
  }

  const field = document.createElement("textarea");
  field.value = TOOL_URL;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Clipboard copy was not available");
}

export function ShareToolButton() {
  const [status, setStatus] = useState("");

  async function shareTool() {
    setStatus("");
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(SHARE_PAYLOAD);
        setStatus("Share options opened.");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setStatus("Sharing cancelled.");
          return;
        }
      }
    }

    try {
      await copyToolLink();
      setStatus("Link copied.");
    } catch {
      setStatus("Could not copy the link. You can copy it from the address bar.");
    }
  }

  return (
    <div className="obd-share-tool">
      <button type="button" className="obd-share-button" onClick={() => void shareTool()} aria-label="Share TorqueGirl OBD2 Log Analyzer">
        {status === "Link copied." ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
        Share Tool
      </button>
      <span className="obd-share-status" role="status" aria-live="polite">{status}</span>
    </div>
  );
}
