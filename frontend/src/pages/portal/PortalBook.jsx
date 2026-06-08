import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams, Link } from "react-router-dom";
import { portalApi } from "../../lib/portalApi";
import SlotPicker from "../../components/SlotPicker";
import { ArrowLeft, CalendarDays, CheckCircle2, PawPrint } from "lucide-react";

// Map the species used by the portal to the site's intent values so SlotPicker
// / backend continue to receive something useful.
const SPECIES_TO_PET_TYPE = {
  dog: "dogs",
  cat: "cats",
  rabbit: "critters",
  guinea_pig: "critters",
  other: "critters",
};

export default function PortalBook() {
  const { client } = useOutletContext();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPetId, setSelectedPetId] = useState(searchParams.get("pet") || null);
  const [booked, setBooked] = useState(null);

  useEffect(() => {
    portalApi.get("/pets")
      .then((r) => {
        setPets(r.data);
        if (!selectedPetId && r.data.length === 1) setSelectedPetId(r.data[0].id);
      })
      .finally(() => setLoading(false));
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId) || null,
    [pets, selectedPetId]
  );

  const preferredType = searchParams.get("type");

  // Synthesize a pseudo-lead for SlotPicker's prefill, using client + selected pet data.
  const leadLike = useMemo(() => {
    if (!client || !selectedPet) return null;
    return {
      name: `${client.first_name} ${client.last_name}`,
      email: client.email,
      phone: client.phone || null,
      pet_id: selectedPet.id,
      pet_name: selectedPet.name,
      pet_type: SPECIES_TO_PET_TYPE[selectedPet.species] || "other",
      comment: null,
    };
  }, [client, selectedPet]);

  if (loading) return <div className="text-clinic-mist" data-testid="portal-book-loading">Loading…</div>;

  if (booked) {
    const when = new Date(booked.starts_at).toLocaleString([], {
      weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
    });
    return (
      <div className="py-12 text-center" data-testid="portal-book-confirmed">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-clinic-sage text-clinic-forest mb-5">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="font-display text-4xl font-extrabold text-clinic-navy">You&rsquo;re booked!</h1>
        <p className="mt-4 text-clinic-mist text-lg">
          <span className="font-bold text-clinic-navy">{booked.appointment_type_name}</span>{" "}for{" "}
          <span className="font-bold text-clinic-navy">{selectedPet?.name}</span>{" "}on{" "}
          <span className="font-bold text-clinic-navy">{when}</span>.
        </p>
        <p className="mt-2 text-clinic-mist text-sm">
          We&rsquo;ve emailed a confirmation to {client?.email}.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link to="/portal" className="inline-flex items-center gap-2 bg-clinic-navy text-white rounded-full px-5 py-2 text-sm font-semibold">
            Back to portal
          </Link>
          <button
            onClick={() => { setBooked(null); }}
            className="inline-flex items-center gap-2 bg-white border border-sand-300 text-clinic-navy rounded-full px-5 py-2 text-sm font-semibold hover:border-clinic-forest/60"
          >
            Book another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="portal-book">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs text-clinic-mist hover:text-clinic-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-clinic-sage text-clinic-forest grid place-items-center">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-clinic-forest">Client Portal</div>
          <h1 className="font-display text-3xl font-extrabold text-clinic-navy">Book an appointment</h1>
        </div>
      </div>
      <p className="mt-3 text-clinic-mist text-sm max-w-xl">
        Pick which pet is coming in, then choose a time that works. We&rsquo;ll reserve it and email you a confirmation.
      </p>

      {/* Pet selector */}
      {pets.length === 0 ? (
        <div className="mt-8 bg-white rounded-2xl border border-sand-300/60 p-6 text-sm text-clinic-mist">
          We don&rsquo;t have any pets on file for you yet. Please call us at (202) 659-8830 and we&rsquo;ll get you set up.
        </div>
      ) : (
        <section className="mt-8 bg-white rounded-[1.5rem] border border-sand-300/60 p-6">
          <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-clinic-forest flex items-center gap-2">
            <PawPrint className="h-3 w-3" /> Step 1 of 2 · which pet?
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pets.map((p) => {
              const active = p.id === selectedPetId;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPetId(p.id)}
                  className={`text-left rounded-2xl border px-5 py-4 transition-colors ${
                    active
                      ? "border-clinic-red bg-clinic-red-soft"
                      : "border-sand-300 bg-white hover:border-clinic-forest/60"
                  }`}
                  data-testid={`portal-book-pet-${p.id}`}
                >
                  <div className="font-display font-bold text-clinic-navy">{p.name}</div>
                  <div className="text-xs text-clinic-mist mt-0.5">
                    {p.species || "pet"}{p.breed ? ` · ${p.breed}` : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* SlotPicker */}
      {selectedPet && leadLike && (
        <div className="mt-6">
          <SlotPicker
            leadId={null}
            lead={leadLike}
            preferredType={preferredType}
            onBooked={setBooked}
          />
        </div>
      )}
    </div>
  );
}
