import React, { useEffect, useMemo } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  HeartPulse,
  PawPrint,
  Phone,
  ShieldCheck,
  Stethoscope,
  Syringe,
} from "lucide-react";
import { useSmartSite } from "../context/SmartSiteContext";
import { SERVICES_BY_ANIMAL } from "../data/services";

// Background image + framing for the "Explore services" CTA card per animal.
const EXPLORE_CARD_BG = {
  dogs: { image: "/images/animals/hero-svc-dogs.webp", position: "center 40%" },
  cats: { image: "/images/animals/hero-svc-cats.webp", position: "center 40%" },
  critters: { image: "/images/animals/hero-svc-critters.webp", position: "center 40%" },
};

// Map an animal-page slug to the correct /services tab.
// Critters has no single tab (rabbits + guinea_pigs), so default to rabbits
// which is the most common and still gives the user a relevant starting tab.
const SERVICES_TAB_FOR_ANIMAL = {
  dogs: "dogs",
  cats: "cats",
  critters: "rabbits",
};

function servicesHref(animalSlug) {
  const tab = SERVICES_TAB_FOR_ANIMAL[animalSlug];
  return tab ? `/services?tab=${tab}` : "/services";
}

/**
 * Canonical species pages, /dogs, /cats, /critters.
 * These are NOT dynamic. They exist so every visitor can explore everything
 * we do for a given species, whether or not their intent is set yet.
 * We still fire a strong intent signal on mount + on interactions so the
 * homepage, surfaces, and admin analytics reflect the visit.
 */

const ANIMALS = {
  dogs: {
    slug: "dogs",
    title: "Dogs",
    noun: "dog",
    hero_headline: "Care that keeps their tail wagging.",
    hero_eyebrow: "DC Dogs",
    hero_copy:
      "From first-puppy visits to senior comfort, we treat every dog with the calm, thoughtful care you'd give a member of the family.",
    image: "/images/animals/hero-dogs-page.webp",
    quote: {
      body: "Dogs don't hide discomfort as well as cats do, but they'll push through because they want to please you. Our job is to notice the small things, a little stiffness, a subtle cough, a change in appetite, before they become big problems.",
      author: "Dr. Kristen Fischer, V.M.D.",
    },
    life_stages: [
      { name: "Puppy", age: "6 wks – 1 yr", focus: "Vaccine series, deworming, nutrition counseling, spay/neuter planning, training guidance.", icon: "paw", image: "/images/animals/dog-puppy.webp" },
      { name: "Adult", age: "1 – 7 yrs", focus: "Annual wellness, dental care, parasite prevention, weight management, lifestyle vaccines.", icon: "shield", image: "/images/animals/dog-adult.webp", objectPosition: "center top" },
      { name: "Senior", age: "7 yrs +", focus: "Twice-yearly exams, bloodwork, joint support, laser therapy, PRP, quality-of-life planning.", icon: "heart", image: "/images/animals/dog-senior.webp" },
    ],
    conditions: [
      { name: "Dental disease", body: "Plaque, gingivitis, and loose teeth, often silent until severe.", image: "/images/animals/dog-dental.webp" },
      { name: "Allergies & skin issues", body: "Itching, ear infections, hot spots. Often environmental, sometimes food-related.", image: "/images/animals/dog-allergy-skin.webp", objectPosition: "center 35%" },
      { name: "Arthritis & joint pain", body: "Stiffness getting up, reluctance on stairs, slowing on walks.", image: "/images/animals/dog-arthritis.webp", objectPosition: "center 70%" },
      { name: "Obesity & weight issues", body: "Excess weight stresses joints, heart, and overall health. We create realistic plans.", image: "/images/animals/dog-obesity.webp" },
      { name: "GI upset", body: "Vomiting, diarrhea, loss of appetite. We triage and figure out the cause.", image: "/images/animals/dog-gi.webp" },
    ],
    vaccines: {
      core: ["Rabies", "DHPP (Distemper / Hepatitis / Parvo / Parainfluenza)"],
      lifestyle: ["Bordetella (kennel cough)", "Leptospirosis", "Lyme", "Canine influenza"],
    },
    what_to_expect: [
      "A calm greeting from our team, no rushed handling.",
      "Full nose-to-tail exam with plenty of breaks if your dog is anxious.",
      "A conversation about lifestyle, nutrition, and anything you've noticed.",
      "A clear, written plan you leave with, next steps, costs, and timing.",
    ],
    faqs: [
      { q: "How often should my adult dog come in?", a: "Once a year for healthy adults (1–7 yrs), twice a year for seniors. Puppies follow their own schedule for the first year." },
      { q: "When should I spay/neuter my dog?", a: "It depends on breed and size, small breeds often earlier, large and giant breeds later to support joint development. We'll recommend the right timing at your puppy visit." },
      { q: "What signs mean I should call you today?", a: "Not eating for 24 hours, repeated vomiting, difficulty breathing, suspected toxin ingestion, sudden lameness, seizures, or any bloated belly. Call (202) 659-8830 first so the team can guide you appropriately." },
      { q: "Do you do dental work for dogs?", a: "Yes, full anesthetic cleanings with dental X-rays and extractions as needed. We screen at every wellness visit." },
      { q: "Can you help my senior dog stay comfortable?", a: "Absolutely. Laser therapy, joint support, weight management, multimodal pain control, and PRP/regenerative options, we combine them for real quality of life." },
    ],
    services: ["wellness-exams", "vaccinations", "dental-care", "surgery", "parasite-prevention", "laser-therapy", "prp-therapy", "microchipping", "senior-care", "emergency-care"],
  },
  cats: {
    slug: "cats",
    title: "Cats",
    noun: "cat",
    hero_headline: "Gentle, low-stress feline medicine.",
    hero_eyebrow: "DC Cats",
    hero_copy:
      "We take cats at their pace, quiet rooms, slow hands, and a team that listens. Feline wellness, dental, senior, and specific treatments all in one place.",
    image: "/images/animals/cat-hero-home.webp",
    quote: {
      body: "Cats don't complain, they hide. The best thing you can do is bring them in for wellness before they're sick, because by the time a cat looks sick, the disease has usually been there a while.",
      author: "Dr. Kristen Fischer, V.M.D.",
    },
    life_stages: [
      { name: "Kitten", age: "8 wks – 1 yr", focus: "Vaccine series, deworming, spay/neuter, nutrition, socialization, microchipping.", icon: "paw", image: "/images/animals/cat-kitten.webp" },
      { name: "Adult", age: "1 – 10 yrs", focus: "Annual wellness exam, dental screening, parasite prevention, weight and behavior check-ins.", icon: "shield", image: "/images/animals/cat-adult.webp", objectPosition: "center top" },
      { name: "Senior", age: "10 yrs +", focus: "Twice-yearly exams, bloodwork, kidney & thyroid screening, quality-of-life support, gentle dental care.", icon: "heart", image: "/images/animals/cat-senior.webp" },
    ],
    conditions: [
      { name: "Kidney disease", body: "The most common chronic illness in senior cats. Caught early, we can slow its progression significantly.", image: "/images/animals/cat-kidney.webp" },
      { name: "Dental disease", body: "Painful resorptive lesions, gingivitis, and tooth loss. Often missed because cats hide mouth pain.", image: "/images/animals/cat-dental.webp" },
      { name: "Hyperthyroidism", body: "Weight loss despite a big appetite, vocalizing, hyperactivity. Common in cats over 10.", image: "/images/animals/cat-hyperthyroid.webp" },
      { name: "Urinary issues (FLUTD)", body: "Straining, blood in urine, inappropriate urination. Can be a true emergency in male cats.", image: "/images/animals/cat-urinary.webp" },
      { name: "Upper respiratory", body: "Sneezing, nasal discharge, eye involvement. Common and treatable when caught early.", image: "/images/animals/cat-respiratory.webp" },
    ],
    vaccines: {
      core: ["Rabies", "FVRCP (Feline Viral Rhinotracheitis / Calicivirus / Panleukopenia)"],
      lifestyle: ["FeLV (Feline Leukemia), especially for outdoor cats"],
    },
    what_to_expect: [
      "Quiet exam room, dim lighting, and time to let your cat come out at their own pace.",
      "Gentle, slow handling, we work with the cat in front of us, not against them.",
      "A thorough exam plus any screening appropriate to their age and lifestyle.",
      "A plan you leave with, and honest conversation if something needs a specialist.",
    ],
    faqs: [
      { q: "My cat hates the carrier, any tips for the visit?", a: "Leave the carrier out as furniture at home, use pheromone spray, bring a familiar towel, and skip the car lecture. We take extra time at check-in so your cat can decompress." },
      { q: "Does my indoor-only cat really need vaccines?", a: "Yes, core vaccines protect against diseases that can still reach indoor cats. We'll build a minimal, risk-appropriate schedule." },
      { q: "My cat is over 10, what changes about their care?", a: "Twice-yearly exams, baseline bloodwork, kidney and thyroid screening, blood pressure checks, and a focus on comfort. Small changes matter a lot at this age." },
      { q: "What counts as a feline emergency?", a: "Male cats straining to urinate, difficulty breathing, sudden collapse, seizures, suspected toxin exposure, prolonged not eating or hiding. Call us right away." },
      { q: "Do you do dental work for cats?", a: "Yes. Feline dental disease is incredibly common and painful, we screen at every wellness and offer full cleanings with dental X-rays." },
    ],
    services: ["wellness-exams", "vaccinations", "dental-care", "senior-care", "surgery", "laser-therapy", "microchipping", "parasite-prevention", "emergency-care"],
  },
  critters: {
    slug: "critters",
    title: "Small & Exotic Pets",
    noun: "pet",
    hero_headline: "Thoughtful care for every kind of companion.",
    hero_eyebrow: "Rabbits, Small Mammals & More",
    hero_copy:
      "Rabbits, guinea pigs, hamsters, and other small companions deserve the same quality of care as any family pet. We will be honest about what we can treat and guide you to the right specialist when needed.",
    image: "/images/animals/hero-critters-page.webp",
    quote: {
      body: "The best thing we can do for an exotic pet is be honest: what we can confidently treat, and when a species-specific specialist is the right next step. We will point you in the right direction either way.",
      author: "Dr. Kristen Fischer, V.M.D.",
    },
    life_stages: [
      { name: "Young", age: "First months", focus: "Husbandry review, diet, environment, basic exam, age-appropriate handling.", icon: "paw", image: "/images/animals/rabbit-young.webp" },
      { name: "Adult", age: "Prime years", focus: "Annual wellness, weight and dental check, enrichment and habitat review.", icon: "shield", image: "/images/animals/rabbit-adult.webp", objectPosition: "center top" },
      { name: "Senior", age: "Late life", focus: "Quality-of-life monitoring, pain support, and gentle diagnostics.", icon: "heart", image: "/images/animals/rabbit-senior.webp" },
    ],
    conditions: [
      { name: "Dental overgrowth", body: "Continuously-growing teeth need the right diet and regular checks.", image: "/images/animals/rabbit-dental.webp" },
      { name: "GI stasis (rabbits)", body: "A true emergency. If your rabbit stops eating or pooping, call immediately.", image: "/images/animals/rabbit-gi.webp" },
      { name: "Skin & parasite issues", body: "Mites, fur loss, and skin lesions are common. We use species-safe treatments.", image: "/images/animals/rabbit-skin.webp" },
      { name: "Nutritional imbalances", body: "Vitamin C deficiency (guinea pigs), calcium issues, and diet-linked disease.", image: "/images/animals/gp-vitamin-c.webp" },
      { name: "Respiratory infections", body: "Small mammals hide respiratory disease well. We screen carefully at every visit.", image: "/images/animals/gp-skin.webp" },
    ],
    vaccines: {
      core: ["Varies by species. We will build a prevention plan that fits your pet."],
      lifestyle: [],
    },
    what_to_expect: [
      "A phone conversation first so we can confirm we are a good fit for your pet's species.",
      "A short, low-stress first visit focused on husbandry, diet, and general health.",
      "An honest assessment, including referral to a specialist if that is what your pet needs.",
      "Guidance you can put into practice at home that same day.",
    ],
    faqs: [
      { q: "Do you see rabbits?", a: "Yes, for wellness and common issues. Please call first so we can confirm fit and timing." },
      { q: "What about reptiles, birds, or very exotic species?", a: "We see some. For specialty cases we will refer you to an experienced exotics practice rather than guess." },
      { q: "My rabbit stopped eating, is that urgent?", a: "Yes. GI stasis is life-threatening in rabbits. Call (202) 659-8830 immediately or call Collins immediately or contact an exotics emergency hospital." },
      { q: "How often should my small mammal come in?", a: "At minimum once a year for a wellness and husbandry review. Seniors and sick pets more often." },
      { q: "Can you help me set up a good habitat?", a: "Absolutely. Environment, lighting, diet, and enrichment are often the biggest levers for exotic pet health." },
    ],
    services: ["wellness-exams", "parasite-prevention", "microchipping", "emergency-care"],
  },
};

const SLUG_ALIASES = {
  dog: "dogs", cat: "cats", critter: "critters", "other-critters": "critters",
};

const ICON_MAP = { paw: PawPrint, shield: ShieldCheck, heart: HeartPulse };

export default function AnimalPage() {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\//, "").split("/")[0];
  const key = SLUG_ALIASES[slug] || slug;
  const animal = ANIMALS[key];
  const { setIntent, track, parentIntent } = useSmartSite();

  useEffect(() => {
    if (!animal) return;
    if (parentIntent !== animal.slug) {
      setIntent(animal.slug, null, { label: `animal_page:${animal.slug}` });
    } else {
      track({
        signalType: "page_view",
        label: `animal_page:${animal.slug}`,
        intent: animal.slug,
        strength: 2,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const scopedServices = useMemo(
    () => {
      if (!animal) return [];
      // Find services for this animal type from the new data structure
      const animalKey = animal.slug === "critters" ? "rabbits" : animal.slug;
      const data = SERVICES_BY_ANIMAL[animalKey];
      return data ? data.preventive.slice(0, 4) : [];
    },
    [animal]
  );

  if (!animal) return <Navigate to="/404" replace />;

  return (
    <div data-testid={`animal-page-${animal.slug}`}>
      {/* Hero */}
      <section className="relative w-full min-h-[78vh] overflow-hidden">
        <img
          key={animal.image}
          src={animal.image}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-clinic-navy/85 via-clinic-navy/55 to-clinic-navy/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-clinic-ink/75 via-transparent to-transparent" />
        <div className="absolute inset-0 grain pointer-events-none" aria-hidden="true" />
        <div className="relative z-10 h-full">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-36 lg:pt-40 pb-16">
            <div className="text-[11px] uppercase tracking-[0.22em] font-bold text-clinic-amber">
              {animal.hero_eyebrow}
            </div>
            <h1
              className="mt-4 font-display text-5xl sm:text-6xl lg:text-[80px] leading-[1.02] font-extrabold tracking-tight text-sand-50 max-w-3xl"
              data-testid="animal-hero-headline"
            >
              {animal.hero_headline}
            </h1>
            <p className="mt-6 max-w-xl text-lg lg:text-xl text-sand-100/90 leading-relaxed">
              {animal.hero_copy}
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/appointment"
                onClick={() =>
                  track({ signalType: "cta_click", label: `animal_cta:${animal.slug}`, intent: animal.slug, strength: 2 })
                }
                className="inline-flex items-center gap-2 bg-clinic-red hover:bg-clinic-red-hover text-white rounded-full px-8 py-4 font-semibold shadow-xl shadow-clinic-red/30 transition-transform hover:-translate-y-0.5"
                data-testid={`animal-cta-${animal.slug}`}
              >
                <PawPrint className="h-4 w-4" />
                Request a {animal.noun} visit
              </Link>
              <a
                href="tel:+12026598830"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/25 backdrop-blur-md text-sand-50 rounded-full px-7 py-4 font-semibold transition-colors"
              >
                <Phone className="h-4 w-4" /> Call (202) 659-8830
              </a>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 text-sm font-bold text-clinic-amber hover:text-white underline underline-offset-4 decoration-2 transition-colors"
                data-testid={`animal-services-link-${animal.slug}`}
              >
                View {animal.noun} services
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Life-stage timeline */}
        <section className="mt-20" data-testid="animal-life-stages">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-red">
                Life-stage care
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-clinic-navy mt-3">
                Care that grows with your {animal.noun}.
              </h2>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {animal.life_stages.map((st, i) => {
              const Icon = ICON_MAP[st.icon] || PawPrint;
              const tints = [
                "bg-clinic-red text-sand-50",
                "bg-clinic-peach text-clinic-navy border border-clinic-peachDeep/60",
                "bg-clinic-sage text-clinic-navy border border-clinic-forest/15",
              ];
              const primary = i === 0;
              return (
                <article key={st.name} className={`rounded-[1.5rem] overflow-hidden ${tints[i]}`}>
                  {st.image && (
                    <div className="h-40 overflow-hidden">
                      <img src={st.image} alt={st.name} className="h-full w-full object-cover" style={st.objectPosition ? { objectPosition: st.objectPosition } : undefined} loading="lazy" />
                    </div>
                  )}
                  <div className="p-6">
                    <div className={`inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold ${primary ? "text-clinic-amber" : "text-clinic-red"}`}>
                      <Icon className="h-4 w-4" /> {st.name}
                    </div>
                    <div className={`mt-2 font-display text-2xl font-extrabold ${primary ? "text-white" : "text-clinic-navy"}`}>
                      {st.age}
                    </div>
                    <p className={`mt-2 text-sm leading-relaxed ${primary ? "text-white/85" : "text-clinic-mist"}`}>
                      {st.focus}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Common conditions */}
        <section className="mt-20" data-testid="animal-conditions">
          <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-red">
            Common concerns
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-clinic-navy mt-3 max-w-3xl">
            What we see most often in {animal.title.toLowerCase()}.
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {animal.conditions.map((c, i) => (
              <article
                key={c.name}
                className="bg-white rounded-[1.5rem] overflow-hidden border border-sand-300/60 hover:-translate-y-1 transition-transform"
                data-testid={`animal-condition-${i}`}
              >
                {c.image && (
                  <div className="h-36 overflow-hidden">
                    <img src={c.image} alt={c.name} className="h-full w-full object-cover" style={c.objectPosition ? { objectPosition: c.objectPosition } : undefined} loading="lazy" />
                  </div>
                )}
                <div className="p-6">
                  <div className="font-display font-bold text-clinic-navy">{c.name}</div>
                  <p className="mt-2 text-sm text-clinic-mist leading-relaxed">{c.body}</p>
                </div>
              </article>
            ))}

            {/* Explore services CTA card, fills empty trailing slot */}
            <Link
              to={servicesHref(animal.slug)}
              onClick={() => track({
                signalType: "cta_click",
                label: `animal-page-explore-services:${animal.slug}`,
                intent: animal.slug === "critters" ? "critters" : animal.slug,
                strength: 4,
              })}
              className="group relative overflow-hidden rounded-[1.5rem] min-h-[280px] flex flex-col justify-between p-8 text-sand-50 hover:-translate-y-1 transition-transform"
              data-testid="animal-explore-services"
            >
              {/* Background photo */}
              {EXPLORE_CARD_BG[animal.slug]?.image && (
                <img
                  src={EXPLORE_CARD_BG[animal.slug].image}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{ objectPosition: EXPLORE_CARD_BG[animal.slug].position }}
                />
              )}
              {/* Navy gradient overlay so text stays legible */}
              <div className="absolute inset-0 bg-gradient-to-t from-clinic-navy/95 via-clinic-navy/75 to-clinic-navy/40" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-bold text-clinic-amber">
                  <PawPrint className="h-3.5 w-3.5" /> Full service list
                </div>
                <h3 className="font-display text-2xl font-extrabold mt-4 leading-[1.1]">
                  Explore every service we offer for {animal.title.toLowerCase()}.
                </h3>
                <p className="mt-3 text-sand-100/85 text-sm leading-relaxed">
                  Preventive, dental, surgery, senior, and urgent care, all grouped in one place.
                </p>
              </div>
              <span className="relative mt-6 inline-flex items-center gap-2 text-clinic-amber font-bold text-sm">
                See {animal.title.toLowerCase()} services
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
        </section>

        {/* Vaccines & prevention */}
        <section className="mt-20 grid gap-8 lg:grid-cols-2" data-testid="animal-vaccines">
          <div className="bg-clinic-navy text-sand-50 rounded-[2rem] p-10 lg:p-12 relative overflow-hidden grain">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] font-bold text-clinic-amber">
              <Syringe className="h-3.5 w-3.5" /> Vaccines & prevention
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-bold mt-3">A schedule built around your pet.</h3>
            <div className="mt-8 space-y-6">
              <div>
                <div className="text-[11px] uppercase tracking-widest font-bold text-clinic-amber">Core</div>
                <ul className="mt-3 space-y-2">
                  {animal.vaccines.core.map((v) => (
                    <li key={v} className="flex items-start gap-2 text-sand-50/90">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 text-clinic-amber shrink-0" />
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {animal.vaccines.lifestyle?.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-widest font-bold text-clinic-amber">Lifestyle / Risk-based</div>
                  <ul className="mt-3 space-y-2">
                    {animal.vaccines.lifestyle.map((v) => (
                      <li key={v} className="flex items-start gap-2 text-sand-50/90">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-clinic-amber shrink-0" />
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-clinic-red/25 blur-3xl" />
          </div>

          <div className="bg-clinic-cream rounded-[2rem] p-10 lg:p-12 border border-clinic-peachDeep/60">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] font-bold text-clinic-forest">
              <Calendar className="h-3.5 w-3.5" /> What to expect
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-clinic-navy mt-3">
              Here's what a {animal.noun} visit looks like.
            </h3>
            <ul className="mt-8 space-y-3">
              {animal.what_to_expect.map((line, i) => (
                <li key={i} className="flex items-start gap-3 text-clinic-navy">
                  <span className="shrink-0 h-6 w-6 rounded-full bg-clinic-red text-white text-[11px] font-bold grid place-items-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* the veterinarian quote */}
        <section className="mt-20 bg-clinic-red text-sand-50 rounded-[2rem] p-10 lg:p-14 relative overflow-hidden grain" data-testid="animal-quote">
          <div className="max-w-3xl relative z-10">
            <div className="text-[11px] uppercase tracking-[0.22em] font-bold text-clinic-amber">From the veterinarian</div>
            <blockquote className="mt-4 font-display text-2xl sm:text-3xl font-bold leading-[1.2]">
              &ldquo;{animal.quote.body}&rdquo;
            </blockquote>
            <div className="mt-5 text-sm font-semibold text-sand-50/85">{animal.quote.author}</div>
          </div>
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-clinic-amber/25 blur-3xl" />
          <div className="absolute -left-10 -bottom-16 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        </section>

        {/* Species-specific FAQ */}
        <section className="mt-20 grid gap-12 lg:grid-cols-5 items-start" data-testid="animal-faq">
          <div className="lg:col-span-2 bg-clinic-peach rounded-[2rem] p-10 border border-clinic-peachDeep/60 relative overflow-hidden">
            <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-red">
              {animal.title} FAQ
            </div>
            <h3 className="font-display text-3xl font-bold text-clinic-navy mt-3">
              Real questions from {animal.noun} families.
            </h3>
            <p className="mt-4 text-clinic-navy/70">
              If yours isn&rsquo;t here, we&rsquo;re happy to talk it through by phone.
            </p>
            <div className="absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-clinic-red/10 blur-3xl" />
          </div>
          <div className="lg:col-span-3">
            <Accordion type="single" collapsible>
              {animal.faqs.map((f, i) => (
                <AccordionItem
                  key={i}
                  value={`animal-faq-${i}`}
                  className="border-b border-sand-300/70"
                  data-testid={`animal-faq-item-${i}`}
                >
                  <AccordionTrigger
                    className="text-left font-display font-bold text-lg text-clinic-navy py-5"
                    onClick={() =>
                      track({
                        signalType: "faq_open",
                        label: `${animal.slug}:${f.q}`,
                        intent: animal.slug,
                        strength: 2,
                      })
                    }
                  >
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-clinic-mist pb-5">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Services we offer for this species */}
        <section className="mt-20" data-testid="animal-services">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-red">
                Services for {animal.title}
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-clinic-navy mt-3 max-w-2xl">
                Everything we commonly do for {animal.title.toLowerCase()}.
              </h2>
            </div>
            <Link
              to="/services"
              className="text-sm font-bold text-clinic-red hover:text-clinic-red-hover underline underline-offset-4 decoration-2"
            >
              See all services
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {scopedServices.map((s, i) => {
              const tints = [
                "bg-white border-sand-300/60",
                "bg-clinic-peach border-clinic-peachDeep/60",
                "bg-clinic-sage border-clinic-forest/15",
                "bg-clinic-red-soft border-clinic-red/20",
              ];
              return (
                <Link
                  key={s.slug}
                  to={`/services/${s.slug}`}
                  onClick={() =>
                    track({
                      signalType: "cta_click",
                      label: `animal_service:${animal.slug}:${s.slug}`,
                      intent: animal.slug,
                      subIntent: s.intent_hint,
                      strength: 2,
                    })
                  }
                  className={`group rounded-[1.5rem] p-7 border hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_22px_42px_rgba(0,0,0,0.08)] ${tints[i % tints.length]}`}
                  data-testid={`animal-service-card-${s.slug}`}
                >
                  <div className="font-display font-bold text-xl text-clinic-navy">{s.title}</div>
                  <p className="mt-2 text-sm text-clinic-mist leading-relaxed">{s.summary || s.blurb}</p>
                  <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-clinic-red group-hover:gap-2.5 transition-all">
                    Learn more <PawPrint className="h-3.5 w-3.5 transition-transform group-hover:rotate-12" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Cross-links */}
        <section className="mt-20" data-testid="animal-crosslinks">
          <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-red">
            Different pet?
          </div>
          <h3 className="font-display text-2xl sm:text-3xl font-bold text-clinic-navy mt-2">
            Explore our care for other animals.
          </h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(ANIMALS)
              .filter((a) => a.slug !== animal.slug)
              .map((a) => (
                <Link
                  key={a.slug}
                  to={`/${a.slug}`}
                  className="group relative rounded-[1.5rem] overflow-hidden h-40 block"
                  data-testid={`animal-crosslink-${a.slug}`}
                >
                  <img src={a.image} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-clinic-navy/80 via-clinic-navy/40 to-transparent" />
                  <div className="relative z-10 h-full flex items-end p-5 text-sand-50">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] font-bold text-clinic-amber">{a.hero_eyebrow}</div>
                      <div className="font-display text-xl font-bold mt-1">See care for {a.title}</div>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export { ANIMALS };
