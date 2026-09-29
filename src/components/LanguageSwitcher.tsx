"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Languages, Volume2, X } from "lucide-react";
import { clsx } from "clsx";
import { LOCALES, type Locale } from "@/lib/i18n";
import { speak } from "@/lib/speech";
import { useApp } from "@/lib/app-context";

/**
 * Language switcher.
 *
 * The first-run picker told the user "you can change this later", and for a
 * while that was not true — there was no way back to it. A promise the
 * interface makes and cannot keep is worse than never making it, especially
 * for a user who may have tapped the wrong flag and then been stuck in a
 * script they cannot read.
 *
 * Shown as the current language's own name (मराठी / हिंदी / English) rather
 * than a globe icon alone: a user who has landed in the wrong language needs
 * to recognise what it currently says in order to escape it.
 *
 * Each option speaks its own name before being applied, exactly as the
 * first-run picker does, so a non-reader can find their way back by ear.
 *
 * The sheet is rendered through a PORTAL to <body>. It has to be: this button
 * lives inside a header carrying `animate-fade-up`, and any ancestor with a
 * transform becomes the containing block for `position: fixed` descendants.
 * Without the portal the overlay is trapped inside the header's box and the
 * panel gets clipped off the top of the screen.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useApp();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  // Portals need a DOM target, which does not exist during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  // Escape must always work: a user stuck in an unreadable language needs a
  // guaranteed way out of this sheet.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    // Freeze the page behind the sheet. Without this the body scrolls under
    // the overlay and the panel can end up pushed off-screen.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const choose = (code: Locale) => {
    setLocale(code);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={t("onboard.chooseLanguage")}
        className={clsx(
          "inline-flex min-h-touch items-center gap-1.5 rounded-full border px-3 py-1.5",
          "text-sm font-bold transition-all duration-150 active:scale-95",
          className,
        )}
        style={{
          borderColor: "rgb(var(--border))",
          backgroundColor: "rgb(var(--card))",
        }}
      >
        <Languages size={16} aria-hidden className="muted" />
        {current.nativeLabel}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("onboard.chooseLanguage")}
            className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"
            onClick={(e) => {
              // Backdrop tap closes; taps inside the panel do not.
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              ref={panelRef}
              className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5
                       shadow-e4 animate-slide-up sm:animate-pop-in"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg display text-slate-900">
                  {t("onboard.chooseLanguage")}
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("action.cancel")}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition active:scale-95 hover:bg-slate-100"
                >
                  <X size={20} aria-hidden />
                </button>
              </div>

              <ul className="space-y-2.5">
                {LOCALES.map((l, i) => {
                  const active = l.code === locale;
                  return (
                    <li
                      key={l.code}
                      className="stagger"
                      style={{ "--i": i } as React.CSSProperties}
                    >
                      <div className="flex items-stretch gap-2">
                        <button
                          type="button"
                          onClick={() => choose(l.code)}
                          aria-current={active ? "true" : undefined}
                          className={clsx(
                            "flex flex-1 items-center justify-between rounded-2xl border p-4 text-left",
                            "shadow-e1 transition-all duration-200",
                            "hover:-translate-y-0.5 hover:shadow-e3 active:translate-y-0 active:scale-[0.98]",
                            active
                              ? "border-brand-600 bg-brand-50 ring-2 ring-brand-500"
                              : "border-slate-200 bg-white",
                          )}
                        >
                          <span className="flex items-center gap-2">
                            {active && (
                              <Check
                                size={18}
                                className="shrink-0 text-brand-600"
                                aria-hidden
                              />
                            )}
                            <span className="text-xl font-bold text-slate-900">
                              {l.nativeLabel}
                            </span>
                          </span>
                          <span className="text-sm text-slate-500">
                            {l.label}
                          </span>
                        </button>

                        <button
                          type="button"
                          aria-label={`Listen: ${l.label}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            void speak(l.nativeLabel, l.code, { rate: 0.85 });
                          }}
                          className="inline-flex w-14 shrink-0 items-center justify-center rounded-2xl bg-grad-brand text-white shadow-glow-brand transition-transform duration-150 active:scale-95"
                        >
                          <Volume2 size={20} aria-hidden />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
