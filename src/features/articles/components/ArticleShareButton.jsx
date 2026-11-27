"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, Mail, Share2 } from "lucide-react";

function subscribeToShareSupport() {
  return () => {};
}

function getShareSupportSnapshot() {
  return typeof navigator !== "undefined" && !!navigator.share;
}

function getServerShareSupportSnapshot() {
  return false;
}

function SocialIcon({ name }) {
  const common = {
    width: 19,
    height: 19,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true,
  };

  switch (name) {
    case "WhatsApp":
      return (
        <svg {...common}>
          <path d="M20.52 3.48A11.82 11.82 0 0 0 12.08 0C5.5 0 .15 5.35.15 11.93c0 2.1.55 4.15 1.6 5.96L0 24l6.27-1.64a11.9 11.9 0 0 0 5.8 1.48h.01c6.57 0 11.92-5.35 11.92-11.93 0-3.18-1.24-6.17-3.48-8.43ZM12.08 21.8a9.9 9.9 0 0 1-5.05-1.38l-.36-.21-3.72.98.99-3.63-.24-.37a9.84 9.84 0 0 1-1.51-5.26c0-5.46 4.44-9.9 9.9-9.9 2.65 0 5.14 1.03 7.01 2.9a9.85 9.85 0 0 1 2.9 7c0 5.46-4.45 9.9-9.92 9.9Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.88-.79-1.47-1.76-1.64-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.08-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.89.12.58-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Z" />
        </svg>
      );

    case "Facebook":
      return (
        <svg {...common}>
          <path d="M13.5 21v-8.2h2.76l.41-3.2H13.5V7.56c0-.93.26-1.56 1.59-1.56h1.7V3.14c-.29-.04-1.3-.14-2.47-.14-2.45 0-4.13 1.5-4.13 4.25V9.6H7.42v3.2h2.77V21h3.31Z" />
        </svg>
      );

    case "X":
      return (
        <svg {...common}>
          <path d="M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.9-7.4L5.58 22H2.45l7.25-8.29L1.8 2h6.4l4.43 6.76L18.9 2Zm-1.1 18h1.73L7.27 3.89H5.41L17.8 20Z" />
        </svg>
      );

    case "LinkedIn":
      return (
        <svg {...common}>
          <path d="M5.16 3a2.16 2.16 0 1 0 0 4.32 2.16 2.16 0 0 0 0-4.32ZM3.3 9h3.72v12H3.3V9Zm5.98 0h3.56v1.64h.05c.5-.94 1.7-1.93 3.5-1.93 3.75 0 4.44 2.47 4.44 5.68V21h-3.72v-5.86c0-1.4-.03-3.2-1.95-3.2-1.95 0-2.25 1.52-2.25 3.1V21H9.28V9Z" />
        </svg>
      );

    case "Telegram":
      return (
        <svg {...common}>
          <path d="M21.8 3.2 18.5 20c-.25 1.18-.92 1.47-1.86.92l-5.15-3.8-2.49 2.4c-.28.28-.52.52-1.06.52l.37-5.25 9.56-8.64c.42-.37-.09-.58-.65-.21L5.4 13.37.3 11.77c-1.1-.34-1.12-1.1.23-1.64L20.45 2.5c.92-.34 1.72.22 1.35.7Z" />
        </svg>
      );

    default:
      return <Mail size={19} />;
  }
}

export default function ArticleShareButton({ title, url }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const canNativeShare = useSyncExternalStore(
    subscribeToShareSupport,
    getShareSupportSnapshot,
    getServerShareSupportSnapshot,
  );

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const shareText = encodeURIComponent(`${title} ${url}`);

  const platforms = [
    { name: "WhatsApp", href: `https://wa.me/?text=${shareText}` },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: "X",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      name: "Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      name: "Email",
      href: `mailto:?subject=${encodedTitle}&body=${shareText}`,
    },
  ];

  async function handleNativeShare() {
    if (typeof navigator === "undefined" || !navigator.share) return;

    try {
      await navigator.share({ title, url });
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("Article sharing failed.");
      }
    }
  }

  async function handleCopy() {
    setCopyError(false);

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <div className="mt-8 border-t border-[#e9e7e2] pt-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#14243d]">
          <Share2 size={16} />
          Share article
        </span>

        {canNativeShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            aria-label="Share article using your device"
            title="Share article"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#14243d] text-white transition-colors hover:bg-[#263c5d]"
          >
            <Share2 size={17} />
          </button>
        )}

        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Link copied" : "Copy article link"}
          title={copied ? "Copied" : "Copy link"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e6dfd1] bg-white text-[#14243d] transition-colors hover:border-[#b99658] hover:text-[#9b7842]"
        >
          {copied ? <Check size={17} /> : <Copy size={17} />}
        </button>

        {platforms.map((platform) => (
          <a
            key={platform.name}
            href={platform.href}
            target={platform.name === "Email" ? undefined : "_blank"}
            rel={platform.name === "Email" ? undefined : "noopener noreferrer"}
            aria-label={`Share article via ${platform.name}`}
            title={platform.name}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e6dfd1] bg-white text-[#14243d] transition-colors hover:border-[#b99658] hover:bg-[#f8f6f1] hover:text-[#9b7842]"
          >
            <SocialIcon name={platform.name} />
          </a>
        ))}
      </div>

      {copyError && (
        <p role="status" className="mt-2 text-xs text-red-600">
          Could not copy the link. Please copy the article URL from your
          browser.
        </p>
      )}
    </div>
  );
}
