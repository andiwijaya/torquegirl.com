"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

type ArticleShareProps = {
  title: string;
  description?: string;
  path: string;
};

export function ArticleShare({ title, description, path }: ArticleShareProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const getUrl = () => `https://torquegirl.com${path}`;
  const socialUrl = (platform: "whatsapp" | "facebook" | "x" | "linkedin") => {
    const url = encodeURIComponent(getUrl());
    const text = encodeURIComponent(title);
    if (platform === "whatsapp") return `https://wa.me/?text=${text}%20${url}`;
    if (platform === "facebook") return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    if (platform === "x") return `https://x.com/intent/post?text=${text}&url=${url}`;
    return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
  };

  async function share() {
    const url = getUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title, text: description, url });
        return;
      } catch {
        // A user cancellation is a normal outcome; keep the fallback available.
      }
    }
    await copyLink();
  }

  async function copyLink() {
    const url = getUrl();
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const field = document.createElement("textarea");
        field.value = url;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        const success = document.execCommand("copy");
        field.remove();
        if (!success) throw new Error("Clipboard copy was not available");
      }
      setCopied(true);
      setCopyFailed(false);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
      setCopyFailed(true);
      window.setTimeout(() => setCopyFailed(false), 3500);
    }
  }

  return (
    <div className="article-share" aria-label="Share this article">
      <span className="article-share-label">Share this article</span>
      <div className="article-share-actions">
        <button className="share-button share-button-primary" type="button" onClick={share}>
          <Share2 size={16} aria-hidden="true" /> SHARE
        </button>
        <button className="share-button" type="button" onClick={copyLink}>
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          {copied ? "LINK COPIED" : "COPY LINK"}
        </button>
        <div className="share-socials" aria-label="More sharing options">
          <a className="share-button share-social-button" href={socialUrl("whatsapp")} target="_blank" rel="noreferrer" aria-label={`Share ${title} on WhatsApp`}>WHATSAPP</a>
          <a className="share-button share-social-button" href={socialUrl("facebook")} target="_blank" rel="noreferrer" aria-label={`Share ${title} on Facebook`}>FACEBOOK</a>
          <a className="share-button share-social-button" href={socialUrl("x")} target="_blank" rel="noreferrer" aria-label={`Share ${title} on X`}>X</a>
          <a className="share-button share-social-button" href={socialUrl("linkedin")} target="_blank" rel="noreferrer" aria-label={`Share ${title} on LinkedIn`}>LINKEDIN</a>
        </div>
      </div>
      <span className="sr-only" aria-live="polite">{copied ? "Link copied" : copyFailed ? "Could not copy link. You can copy it from the address bar." : ""}</span>
    </div>
  );
}
