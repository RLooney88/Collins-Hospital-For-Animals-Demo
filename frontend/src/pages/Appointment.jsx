import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, Phone } from "lucide-react";
import { api } from "../lib/api";
import { useSurface } from "../hooks/useSurface";
import { useSmartSite } from "../context/SmartSiteContext";
import Testimonials from "../components/Testimonials";
import SlotPicker from "../components/SlotPicker";

const PET_TYPES = [
  { value: "dogs", label: "Dog" },
  { value: "cats", label: "Cat" },
  { value: "critters", label: "Other" },
];

const SERVICE_OPTIONS = [
  "Wellness Exam",
  "Vaccinations",
  "Dental Care",
  "Surgery / Spay-Neuter",
  "Digital Radiography",
  "Health Certificates",
  "Parasite Prevention",
  "Microchipping",
  "Senior Care",
  "Urgent Concern",
  "Other",
];

// Map a sub-intent (from the SubIntentPrompt card click) to the closest service option.
const SUB_INTENT_TO_SERVICE = {
  new_puppy: "Wellness Exam",
  new_kitten: "Wellness Exam",
  wellness: "Wellness Exam",
  health_concerns: "Urgent Concern",
  senior: "Senior Care",
  treatments: "Dental Care",
  husbandry: "Wellness Exam",
};

export default function Appointment() {
  const { content } = useSurface("appointment_intro");
  const { sessionToken, parentIntent, subIntent, track } = useSmartSite();
  const [searchParams] = useSearchParams();
  const reasonParam = searchParams.get("reason");
  const [form, setForm] = useState(() => ({
    name: "",
    email: "",
    phone: "",
    pet_name: "",
    pet_type: parentIntent || "",
    service_interest:
      (reasonParam && SUB_INTENT_TO_SERVICE[reasonParam]) ||
      (subIntent && SUB_INTENT_TO_SERVICE[subIntent]) ||
      "",
    preferred_time: "",
    comment: "",
  }));
  const [submitted, setSubmitted] = useState(false);
  const [submittedLead, setSubmittedLead] = useState(null);
  const [bookedAppt, setBookedAppt] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Name and email are required.");
      return;
    }
    setLoading(true);
    try {
      await track({ signalType: "form_start", label: "appointment" });
      const { data } = await api.post("/leads", {
        ...form,
        session_token: sessionToken,
        source_page: "/appointment",
      });
      setSubmittedLead(data);
      setSubmitted(true);
      toast.success("Got it — now pick a time below.");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please call us at (202) 659-8830.");
    } finally {
      setLoading(false);
    }
  };

  if (bookedAppt) {
    const startLocal = new Date(bookedAppt.starts_at).toLocaleString([], {
      weekday: "long", month: "long", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="max-w-3xl mx-auto py-24 text-center" data-testid="appointment-booked">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-clinic-sage text-clinic-forest mb-6">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="font-display text-4xl font-extrabold text-clinic-navy">You&rsquo;re booked!</h1>
          <p className="mt-4 text-clinic-mist text-lg">
            <span className="font-bold text-clinic-navy">{bookedAppt.appointment_type_name}</span>
            {" "}on{" "}
            <span className="font-bold text-clinic-navy">{startLocal}</span>.
          </p>
          <p className="mt-2 text-clinic-mist text-sm">
            We&rsquo;ll email a confirmation to {bookedAppt.client_email}. For changes, call{" "}
            <a href="tel:+12026598830" className="font-bold text-clinic-navy underline">(202) 659-8830</a>.
          </p>
        </div>
        <div className="pb-24">
          <Testimonials />
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-12 pb-24" data-testid="appointment-page-step-2">
        <SlotPicker
          leadId={submittedLead?.id}
          lead={submittedLead}
          preferredType={form.service_interest}
          onBooked={setBookedAppt}
        />
        <Testimonials />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-12 pb-24" data-testid="appointment-page">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          {content?.eyebrow && (
            <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">
              {content.eyebrow}
            </div>
          )}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-clinic-navy mt-3 leading-[1.04]">
            {content?.headline || "Let's get your pet on the schedule."}
          </h1>
          <p className="mt-6 text-clinic-mist text-lg max-w-md">
            {content?.subheadline || "Tell us a little about your pet and we'll follow up to confirm a time."}
          </p>
          {content?.reassurance && (
            <div className="mt-8 bg-clinic-sage/50 rounded-2xl p-5 text-sm text-clinic-navy">
              {content.reassurance}
            </div>
          )}
          <a
            href="tel:+12026598830"
            className="mt-6 inline-flex items-center gap-2 text-clinic-navy font-bold"
          >
            <Phone className="h-4 w-4" /> (202) 659-8830
          </a>
        </div>

        <form
          onSubmit={onSubmit}
          className="lg:col-span-7 bg-white rounded-[2rem] p-8 lg:p-12 border border-sand-300/70 space-y-5"
          data-testid="appointment-form"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name *" testid="field-name">
              <input required value={form.name} onChange={update("name")} className={inputCls} />
            </Field>
            <Field label="Email *" testid="field-email">
              <input type="email" required value={form.email} onChange={update("email")} className={inputCls} />
            </Field>
            <Field label="Phone" testid="field-phone">
              <input value={form.phone} onChange={update("phone")} className={inputCls} />
            </Field>
            <Field label="Pet's name" testid="field-pet-name">
              <input value={form.pet_name} onChange={update("pet_name")} className={inputCls} />
            </Field>
            <Field label="Pet type" testid="field-pet-type">
              <select value={form.pet_type} onChange={update("pet_type")} className={inputCls} data-testid="pet-type-select">
                <option value="">Select…</option>
                {PET_TYPES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Preferred time" testid="field-time">
              <input value={form.preferred_time} onChange={update("preferred_time")} placeholder="e.g. Weekday mornings" className={inputCls} />
            </Field>
          </div>
          <Field label="Reason for visit" testid="field-service">
            <select value={form.service_interest} onChange={update("service_interest")} className={inputCls}>
              <option value="">Select…</option>
              {SERVICE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Notes" testid="field-comment">
            <textarea
              value={form.comment}
              onChange={update("comment")}
              rows={4}
              placeholder="Anything we should know? symptoms, timing, medications…"
              className={inputCls}
            />
          </Field>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-clinic-mist">
              We&rsquo;ll never share your info.
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 bg-clinic-red hover:bg-clinic-red-hover text-white rounded-full px-7 py-3 font-semibold disabled:opacity-60"
              data-testid="appointment-submit-btn"
            >
              {loading ? "Sending…" : "Request appointment"}
            </button>
          </div>
        </form>
      </div>

      <Testimonials />
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-sand-300 bg-sand-50 px-4 py-3 text-sm text-clinic-navy placeholder:text-clinic-mist/60 focus:outline-none focus:border-clinic-forest focus:ring-2 focus:ring-clinic-forest/20";

function Field({ label, children, testid }) {
  return (
    <label className="block" data-testid={testid}>
      <span className="block text-xs uppercase tracking-[0.16em] font-bold text-clinic-navy mb-1.5">{label}</span>
      {children}
    </label>
  );
}
