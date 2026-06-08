import React from "react";
import TeamSection from "../components/TeamSection";
import ContactSection from "../components/ContactSection";
import InlineCTA from "../components/InlineCTA";

export default function About() {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-12" data-testid="about-page">
      <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">About the clinic</div>
      <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-clinic-navy mt-3 max-w-3xl leading-[1.02]">
        A calm, thorough, family-owned clinic in Washington.
      </h1>
      <p className="mt-6 text-lg text-clinic-mist max-w-2xl leading-relaxed">
        Dr. Kristen Fischer opened Collins Hospital for Animals to practice medicine the way she
        always believed it should be practiced: unhurried, evidence-based, and deeply connected to
        the families she serves.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {[
          { n: "Years", v: "15+", tint: "bg-clinic-red text-sand-50", numColor: "text-white", labelColor: "text-clinic-amber" },
          { n: "Happy families", v: "5,000+", tint: "bg-clinic-peach border border-clinic-peachDeep/60", numColor: "text-clinic-navy", labelColor: "text-clinic-red" },
          { n: "Modalities onsite", v: "10", tint: "bg-clinic-sage border border-clinic-forest/15", numColor: "text-clinic-navy", labelColor: "text-clinic-forest" },
        ].map((s) => (
          <div key={s.n} className={`rounded-[1.5rem] p-7 ${s.tint}`}>
            <div className={`font-display text-4xl font-extrabold ${s.numColor}`}>{s.v}</div>
            <div className={`text-xs uppercase tracking-widest font-semibold mt-2 ${s.labelColor}`}>
              {s.n}
            </div>
          </div>
        ))}
      </div>

      <TeamSection />
      <InlineCTA />
      <ContactSection />
    </div>
  );
}
