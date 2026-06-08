import React from "react";
import { Link } from "react-router-dom";
import { PawPrint, Phone } from "lucide-react";
import { useSurface } from "../hooks/useSurface";
import { useSmartSite } from "../context/SmartSiteContext";

export default function InlineCTA({ forceIntent = null, forceSubIntent = null } = {}) {
  const { content, loading } = useSurface("inline_cta", { forceIntent, forceSubIntent });
  const { track } = useSmartSite();

  if (loading || !content) return null;

  const { headline, body, primary_cta_label, primary_cta_href, image_url } = content;

  return (
    <section className="mt-24" data-testid="inline-cta">
      <div className="rounded-[2rem] relative overflow-hidden min-h-[320px] flex items-center">
        {/* Background image or fallback navy */}
        {image_url ? (
          <>
            <img
              src={image_url}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              style={content.imagePosition ? { objectPosition: content.imagePosition } : undefined}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-clinic-navy/90 via-clinic-navy/70 to-clinic-navy/40" />
          </>
        ) : (
          <div className="absolute inset-0 bg-clinic-navy grain" />
        )}

        <div className="relative z-10 p-10 lg:p-14 w-full">
          <div className="max-w-3xl">
            <div className="text-[11px] uppercase tracking-[0.22em] font-bold text-clinic-amber">
              Schedule a visit
            </div>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-sand-50 leading-[1.1]">
              {headline}
            </h2>
            <p className="mt-4 text-lg text-sand-100/85 leading-relaxed max-w-xl">
              {body}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to={primary_cta_href || "/appointment"}
                onClick={() => track({ signalType: "cta_click", label: "inline_cta:schedule" })}
                className="inline-flex items-center gap-2 bg-clinic-red hover:bg-clinic-red-hover text-white rounded-full px-8 py-4 font-semibold shadow-xl shadow-clinic-red/30 transition-transform hover:-translate-y-0.5"
                data-testid="inline-cta-primary"
              >
                <PawPrint className="h-4 w-4" />
                {primary_cta_label || "Request an appointment"}
              </Link>
              <a
                href="tel:+12026598830"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/25 backdrop-blur-md text-sand-50 rounded-full px-7 py-4 font-semibold transition-colors"
                data-testid="inline-cta-phone"
              >
                <Phone className="h-4 w-4" /> Call (202) 659-8830
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
