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

  const getUrl = () => `${window.location.origin}${path}`;

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
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
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
      </div>
      <span className="sr-only" aria-live="polite">{copied ? "Link copied" : ""}</span>
    </div>
  );
}
