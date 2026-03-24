import { useState, useCallback, useEffect, useRef, type MouseEvent } from "react";
import { useClickOutside } from "../hooks/useClickOutside";
import { shortClaimUrl } from "../utils/slugify";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Claim-based sharing — builds URL from shareId/slug */
interface ClaimShareProps {
  shareId: string;
  slug: string;
  claimText: string;
  ogImageUrl?: string;
  seoTitle?: string;
  url?: never;
  shareTitle?: never;
  shareText?: never;
}

/** Custom sharing — uses provided URL and text directly */
interface CustomShareProps {
  url: string;
  shareTitle: string;
  /** Multi-line text for WhatsApp and copy-to-clipboard. Falls back to shareTitle + url. */
  shareText?: string;
  ogImageUrl?: string;
  shareId?: never;
  slug?: never;
  claimText?: never;
  seoTitle?: never;
}

interface ShareOptions {
  /** Render as a labeled button instead of icon-only trigger */
  buttonLabel?: string;
  /** Force menu to open above the trigger */
  openAbove?: boolean;
}

type ShareLinksProps = (ClaimShareProps | CustomShareProps) & ShareOptions;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wrapper that stops the click from bubbling to the parent <a> card. */
function stop(handler: () => void) {
  return (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handler();
  };
}

/** Copy with fallback for insecure contexts / older browsers. */
function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;left:-9999px";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch {
    /* noop */
  }
  document.body.removeChild(ta);
  return Promise.resolve();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ShareLinks(props: ShareLinksProps) {
  const { ogImageUrl, buttonLabel, openAbove } = props;

  // Derive url / title / copyText from either claim or custom props
  const url = props.url ?? shortClaimUrl(props.shareId);
  const title = props.shareTitle ?? props.seoTitle ?? `Verified: "${props.claimText}"`;
  const copyText = props.shareText ?? url;
  const whatsAppText = props.shareText ?? title + "\n" + url;

  const [open, setOpen] = useState(false);
  const [copiedAction, setCopiedAction] = useState<"copy" | null>(null);
  const [openBelow, setOpenBelow] = useState(false);
  const menuRef = useRef<HTMLSpanElement>(null);

  const showPreview = !!(props.seoTitle ?? props.shareTitle) && !!ogImageUrl;

  // Prefetch OG image at idle priority so it's instant when the menu opens
  useEffect(() => {
    if (!showPreview || !ogImageUrl) return;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "image";
    link.href = ogImageUrl;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [showPreview, ogImageUrl]);

  const hasNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  // Close on outside click
  useClickOutside(
    menuRef,
    open,
    useCallback(() => setOpen(false), []),
  );

  const toggleMenu = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // On mobile with native share, trigger it directly
      if (hasNativeShare && window.innerWidth < 640) {
        navigator.share({ title, url, text: props.shareText }).catch(() => {});
        return;
      }
      setOpen((prev) => {
        if (!prev) setCopiedAction(null);
        return !prev;
      });
      if (openAbove === undefined) {
        const el = menuRef.current;
        if (el) setOpenBelow(el.getBoundingClientRect().top < 250);
      }
    },
    [openAbove, hasNativeShare, title, url, props.shareText],
  );

  const shareX = useCallback(() => {
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setOpen(false);
  }, [url, title]);

  const shareFb = useCallback(() => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setOpen(false);
  }, [url]);

  const shareWhatsApp = useCallback(() => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(whatsAppText)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setOpen(false);
  }, [whatsAppText]);

  const copyLink = useCallback(() => {
    copyToClipboard(copyText).then(() => {
      setCopiedAction("copy");
      setTimeout(() => {
        setOpen(false);
        setCopiedAction(null);
      }, 1200);
    });
  }, [copyText]);

  const nativeShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({ title, url, text: props.shareText }).catch(() => {});
    }
    setOpen(false);
  }, [url, title, props.shareText]);

  const triggerClass =
    "inline-flex items-center justify-center min-w-11 min-h-11 rounded-full text-warm-400 hover:text-primary hover:bg-primary/[0.08] transition-colors cursor-pointer";

  const itemClass =
    "flex items-center justify-center sm:justify-start gap-0 sm:gap-2.5 w-full min-w-12 min-h-12 sm:min-w-0 sm:min-h-0 px-3 py-2 text-sm text-warm-600 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer rounded-md";

  const iconClass = "w-5 h-5 sm:w-4 sm:h-4 shrink-0";

  const menuBelow = openAbove === true ? false : openAbove === false ? true : openBelow;

  const shareIcon = (
    <svg
      className={buttonLabel ? "w-4 h-4" : "w-3.5 h-3.5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );

  return (
    <span ref={menuRef} className="relative inline-flex items-center">
      {/* Trigger */}
      {buttonLabel ? (
        <button
          className="rounded-xl border-2 border-warm-200 bg-white px-6 py-3 text-warm-700 font-bold text-sm
                     hover:border-warm-300 active:scale-[0.97] transition-all cursor-pointer
                     inline-flex items-center gap-2"
          onClick={toggleMenu}
          aria-expanded={open}
          aria-haspopup="true"
          aria-controls="share-menu"
        >
          {shareIcon}
          {buttonLabel}
        </button>
      ) : (
        <button
          className={triggerClass}
          title="Share"
          onClick={toggleMenu}
          aria-label="Share"
          aria-expanded={open}
          aria-haspopup="true"
          aria-controls="share-menu"
        >
          {shareIcon}
        </button>
      )}

      {/* Dropdown menu */}
      {open && (
        <span
          id="share-menu"
          role="menu"
          className={`absolute ${buttonLabel ? "left-1/2 -translate-x-1/2" : "right-0"} z-[60] rounded-lg border border-warm-200 bg-warm-50 shadow-[0_4px_12px_rgba(0,0,0,0.12)] animate-in fade-in slide-in-from-bottom-1 duration-150 ${menuBelow ? "top-full mt-2" : "bottom-full mb-2"} ${showPreview ? "flex flex-row w-[calc(100vw-4rem)] sm:w-auto p-0 rounded-[0.625rem]" : "w-auto sm:w-48 py-1.5"}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* OG image preview (left side) */}
          {showPreview && (
            <span className="flex flex-col flex-1 min-w-0 sm:flex-none sm:w-60 p-3 gap-2 border-r border-warm-100">
              <img
                src={ogImageUrl}
                alt=""
                className="w-full rounded-md bg-warm-50"
                style={{ aspectRatio: "1200/630", objectFit: "cover" }}
              />
              <span className="text-xs font-semibold text-warm-700 leading-[1.35] line-clamp-3">
                {title}
              </span>
            </span>
          )}

          {/* Share options */}
          <span
            className={`grid sm:flex sm:flex-col ${showPreview ? "grid-cols-2 py-1.5 px-1.5 sm:px-0 w-28 sm:w-48 shrink-0" : "grid-cols-[1fr_1fr] py-1.5 px-1.5 sm:px-0"}`}
          >
            {/* X / Twitter */}
            <button
              className={itemClass}
              onClick={stop(shareX)}
              role="menuitem"
              aria-label="Share on X"
            >
              <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="hidden sm:inline">Share on X</span>
            </button>

            {/* Facebook */}
            <button
              className={itemClass}
              onClick={stop(shareFb)}
              role="menuitem"
              aria-label="Share on Facebook"
            >
              <svg
                className="w-6 h-6 sm:w-[1.125rem] sm:h-[1.125rem] shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
              <span className="hidden sm:inline">Share on Facebook</span>
            </button>

            {/* WhatsApp */}
            <button
              className={itemClass}
              onClick={stop(shareWhatsApp)}
              role="menuitem"
              aria-label="Share on WhatsApp"
            >
              <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="hidden sm:inline">Share on WhatsApp</span>
            </button>

            <hr className="hidden sm:block my-1.5 border-warm-100 col-span-2" />

            {/* Copy link */}
            <button
              className={itemClass}
              onClick={stop(copyLink)}
              role="menuitem"
              aria-label={copiedAction === "copy" ? "Copied" : "Copy link"}
            >
              {copiedAction === "copy" ? (
                <svg
                  className={`${iconClass} text-true`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className={iconClass}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
              <span className="hidden sm:inline">
                {copiedAction === "copy" ? "Copied!" : "Copy link"}
              </span>
            </button>

            {/* Native share — replaces copy on mobile, shown after copy on desktop */}
            {hasNativeShare && (
              <button
                className={itemClass}
                onClick={stop(nativeShare)}
                role="menuitem"
                aria-label="Share"
              >
                <svg
                  className={iconClass}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                <span className="hidden sm:inline">Share</span>
              </button>
            )}

          </span>
        </span>
      )}
    </span>
  );
}
