import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { portalApi } from "../../lib/portalApi";
import {
  PawPrint, ArrowLeft, Calendar, CheckCircle2, AlertTriangle,
  Clock, Syringe, Phone, Mail, User, Droplets, Bone, Heart, CalendarPlus,
} from "lucide-react";

function daysAgo(dateStr) {
  if (!dateStr) return Infinity;
  return Math.floor((new Date() - new Date(dateStr)) / 86400000);
}

function HealthIndicator({ date, label, icon: Icon }) {
  const days = date ? daysAgo(date) : Infinity;
  const isGood = days <= 365;
  return (
    <div className="group relative bg-white rounded-xl border border-sand-300/60 p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl grid place-items-center ${isGood ? "bg-emerald-50" : "bg-amber-50"}`}>
          <Icon className={`h-5 w-5 ${isGood ? "text-emerald-500" : "text-amber-500"}`} />
        </div>
        <div>
          <div className="font-display font-bold text-sm text-clinic-navy">{label}</div>
          <div className={`text-xs font-semibold ${isGood ? "text-emerald-600" : "text-amber-600"}`}>
            {date ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No record"}
            {isGood && <span className="ml-1.5 text-emerald-500">Up to date</span>}
          </div>
        </div>
        {isGood ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400 ml-auto" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-400 ml-auto" />
        )}
      </div>
      {!isGood && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-clinic-navy text-sand-50 text-xs rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
          {date ? `Last ${label.toLowerCase()} was over a year ago.` : `No ${label.toLowerCase()} on file.`} Regular {label.toLowerCase()} is crucial to preventive care and your pet's long-term health. Call (202) 659-8830 to schedule.
        </div>
      )}
    </div>
  );
}

export default function PortalPetDetail() {
  const { petId } = useParams();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalApi.get(`/pets/${petId}`)
      .then((r) => setPet(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [petId]);

  if (loading) return <div className="text-clinic-mist">Loading...</div>;
  if (!pet) return <div className="text-clinic-mist">Pet not found.</div>;

  const vaccines = pet.health_records?.filter((r) => r.record_type === "vaccination") || [];
  const latestBloodwork = pet.health_records?.filter((r) => r.record_type === "bloodwork").sort((a, b) => b.date_performed.localeCompare(a.date_performed))[0];
  const latestFecal = pet.health_records?.filter((r) => r.record_type === "fecal").sort((a, b) => b.date_performed.localeCompare(a.date_performed))[0];
  const latestDental = pet.health_records?.filter((r) => r.record_type === "dental").sort((a, b) => b.date_performed.localeCompare(a.date_performed))[0];
  const completedAppts = pet.appointments?.filter((a) => a.status === "completed").sort((a, b) => b.date.localeCompare(a.date)) || [];
  const upcomingAppts = pet.appointments?.filter((a) => a.status === "upcoming").sort((a, b) => a.date.localeCompare(b.date)) || [];

  return (
    <div data-testid={`portal-pet-${pet.name.toLowerCase()}`}>
      <Link to="/portal" className="inline-flex items-center gap-2 text-sm font-bold text-clinic-forest hover:text-clinic-navy mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to my pets
      </Link>

      {/* Pet header */}
      <div className="bg-white rounded-2xl border border-sand-300/60 p-6 flex flex-col sm:flex-row items-start gap-6">
        <div className="h-24 w-24 rounded-2xl bg-clinic-peach border border-clinic-peachDeep/60 overflow-hidden shrink-0">
          {pet.photo_url ? (
            <img src={pet.photo_url} alt={pet.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center">
              <PawPrint className="h-8 w-8 text-clinic-red/40" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-extrabold text-clinic-navy">{pet.name}</h1>
          <div className="text-clinic-mist mt-1">{pet.breed} | {pet.sex || "Unknown sex"}</div>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-clinic-navy">
            {pet.dob && <span>Born: {new Date(pet.dob).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>}
            {pet.weight_lbs && <span>Weight: {pet.weight_lbs} lbs</span>}
            {pet.microchip_id && <span>Microchip: {pet.microchip_id}</span>}
          </div>
          {pet.notes && <p className="text-sm text-clinic-mist mt-2">{pet.notes}</p>}
        </div>
        <Link
          to={`/portal/book?pet=${pet.id}`}
          className="inline-flex items-center gap-2 bg-clinic-red hover:bg-clinic-red-hover text-white rounded-full px-5 py-2.5 font-semibold text-sm shrink-0 shadow-sm"
          data-testid="portal-pet-book"
        >
          <CalendarPlus className="h-4 w-4" /> Book for {pet.name}
        </Link>
      </div>

      {/* Health indicators */}
      <div className="mt-8">
        <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest mb-4">Health Status</div>
        <div className="grid gap-4 sm:grid-cols-3">
          <HealthIndicator date={latestBloodwork?.date_performed} label="Bloodwork" icon={Droplets} />
          <HealthIndicator date={latestFecal?.date_performed} label="Fecal" icon={Heart} />
          <HealthIndicator date={latestDental?.date_performed} label="Dental" icon={Bone} />
        </div>
      </div>

      {/* Upcoming */}
      {upcomingAppts.length > 0 && (
        <div className="mt-8">
          <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest mb-4">Upcoming Appointments</div>
          {upcomingAppts.map((a) => (
            <div key={a.id} className="bg-clinic-sage/30 border border-clinic-forest/10 rounded-xl p-4 flex items-center gap-4">
              <Calendar className="h-5 w-5 text-clinic-forest" />
              <div>
                <div className="font-semibold text-clinic-navy">{a.reason}</div>
                <div className="text-sm text-clinic-mist">
                  {new Date(a.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  {a.provider && ` with ${a.provider}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vaccinations */}
      <div className="mt-8">
        <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest mb-4">Vaccinations</div>
        <div className="bg-white rounded-xl border border-sand-300/60 divide-y divide-sand-300/60">
          {vaccines.length === 0 ? (
            <div className="p-4 text-sm text-clinic-mist">No vaccination records.</div>
          ) : (
            vaccines.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Syringe className="h-4 w-4 text-clinic-forest" />
                  <div>
                    <div className="font-semibold text-sm text-clinic-navy">{v.name}</div>
                    <div className="text-xs text-clinic-mist">Given: {new Date(v.date_performed).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                  </div>
                </div>
                {v.next_due && (
                  <div className={`text-xs font-semibold ${daysAgo(v.next_due) < 0 ? "text-emerald-600" : "text-amber-600"}`}>
                    Due: {new Date(v.next_due).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Past appointments */}
      <div className="mt-8">
        <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest mb-4">Visit History</div>
        <div className="bg-white rounded-xl border border-sand-300/60 divide-y divide-sand-300/60">
          {completedAppts.map((a) => (
            <div key={a.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-clinic-mist" />
                  <div className="font-semibold text-sm text-clinic-navy">{a.reason}</div>
                </div>
                <div className="text-xs text-clinic-mist">
                  {new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              </div>
              {a.notes && <p className="text-xs text-clinic-mist mt-1 ml-7">{a.notes}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Contacts */}
      <div className="mt-8">
        <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest mb-4">Contacts</div>
        <div className="grid gap-4 sm:grid-cols-2">
          {pet.contacts?.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-sand-300/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-clinic-mist" />
                <span className="font-semibold text-sm text-clinic-navy">{c.name}</span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-clinic-forest bg-clinic-sage/50 px-2 py-0.5 rounded-full">{c.relation}</span>
              </div>
              {c.phone && (
                <div className="flex items-center gap-2 text-xs text-clinic-mist">
                  <Phone className="h-3.5 w-3.5" /> {c.phone}
                </div>
              )}
              {c.email && (
                <div className="flex items-center gap-2 text-xs text-clinic-mist mt-1">
                  <Mail className="h-3.5 w-3.5" /> {c.email}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
