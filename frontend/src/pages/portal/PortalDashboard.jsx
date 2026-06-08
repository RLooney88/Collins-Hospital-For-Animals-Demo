import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { portalApi } from "../../lib/portalApi";
import { PawPrint, Calendar, AlertTriangle, CheckCircle2, Clock, CalendarPlus } from "lucide-react";

function daysAgo(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

function statusColor(dateStr) {
  const days = daysAgo(dateStr);
  if (days <= 365) return "green";
  return "warn";
}

function StatusDot({ date, label }) {
  const status = date ? statusColor(date) : "warn";
  const isGood = status === "green";
  return (
    <div className="group relative flex items-center gap-2">
      {isGood ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-amber-500" />
      )}
      <span className={`text-xs font-semibold ${isGood ? "text-emerald-700" : "text-amber-700"}`}>
        {label}: {date || "No record"}
      </span>
      {!isGood && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-clinic-navy text-sand-50 text-xs rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
          {date ? "This diagnostic is over a year old." : "No record found."} Regular {label.toLowerCase()} is crucial to preventive care and catching health issues early. Call us at (202) 659-8830 to schedule.
        </div>
      )}
    </div>
  );
}

export default function PortalDashboard() {
  const { client } = useOutletContext();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalApi.get("/pets").then((r) => setPets(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-clinic-mist">Loading your pets...</div>;

  return (
    <div data-testid="portal-dashboard">
      <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">My Pets</div>
      <div className="flex items-start justify-between flex-wrap gap-4 mt-2">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-clinic-navy">
            Welcome back{client ? `, ${client.first_name}` : ""}.
          </h1>
          <p className="text-clinic-mist text-sm mt-1">Here's how your pets are doing.</p>
        </div>
        <Link
          to="/portal/book"
          className="inline-flex items-center gap-2 bg-clinic-red hover:bg-clinic-red-hover text-white rounded-full px-5 py-2.5 font-semibold text-sm shadow-sm"
          data-testid="portal-dashboard-book"
        >
          <CalendarPlus className="h-4 w-4" /> Book an appointment
        </Link>
      </div>

      {pets.length === 0 ? (
        <div className="mt-8 bg-white rounded-2xl border border-sand-300/60 p-12 text-center">
          <PawPrint className="h-10 w-10 text-clinic-mist/30 mx-auto mb-3" />
          <div className="font-display font-bold text-clinic-navy">No pets yet</div>
          <p className="text-sm text-clinic-mist mt-1">Contact us to get your pets added to your account.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {pets.map((pet) => {
            const lastAppt = pet.appointments
              ?.filter((a) => a.status === "completed")
              .sort((a, b) => b.date.localeCompare(a.date))[0];
            const nextAppt = pet.appointments
              ?.filter((a) => a.status === "upcoming")
              .sort((a, b) => a.date.localeCompare(b.date))[0];

            const latestBloodwork = pet.health_records
              ?.filter((r) => r.record_type === "bloodwork")
              .sort((a, b) => b.date_performed.localeCompare(a.date_performed))[0];
            const latestFecal = pet.health_records
              ?.filter((r) => r.record_type === "fecal")
              .sort((a, b) => b.date_performed.localeCompare(a.date_performed))[0];
            const latestDental = pet.health_records
              ?.filter((r) => r.record_type === "dental")
              .sort((a, b) => b.date_performed.localeCompare(a.date_performed))[0];

            return (
              <Link
                key={pet.id}
                to={`/portal/pets/${pet.id}`}
                className="bg-white rounded-2xl border border-sand-300/60 overflow-hidden hover:-translate-y-1 transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] group"
                data-testid={`pet-card-${pet.name.toLowerCase()}`}
              >
                {/* Pet header */}
                <div className="flex items-center gap-4 p-6 pb-4">
                  <div className="h-16 w-16 rounded-2xl bg-clinic-peach border border-clinic-peachDeep/60 overflow-hidden shrink-0">
                    {pet.photo_url ? (
                      <img src={pet.photo_url} alt={pet.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full grid place-items-center">
                        <PawPrint className="h-6 w-6 text-clinic-red/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold text-xl text-clinic-navy">{pet.name}</div>
                    <div className="text-sm text-clinic-mist truncate">{pet.breed}</div>
                    {pet.dob && (
                      <div className="text-xs text-clinic-mist mt-0.5">
                        Born {new Date(pet.dob).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                        {pet.weight_lbs && ` | ${pet.weight_lbs} lbs`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Appointments */}
                <div className="px-6 pb-3">
                  {nextAppt && (
                    <div className="flex items-center gap-2 bg-clinic-sage/40 rounded-lg px-3 py-2 mb-2">
                      <Calendar className="h-3.5 w-3.5 text-clinic-forest" />
                      <span className="text-xs font-semibold text-clinic-forest">
                        Next: {nextAppt.reason} on {new Date(nextAppt.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  )}
                  {lastAppt && (
                    <div className="flex items-center gap-2 text-xs text-clinic-mist">
                      <Clock className="h-3.5 w-3.5" />
                      Last visit: {lastAppt.reason} ({new Date(lastAppt.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
                    </div>
                  )}
                </div>

                {/* Health snapshot */}
                <div className="border-t border-sand-300/60 px-6 py-4 bg-sand-50/50 space-y-2">
                  <div className="text-[10px] uppercase tracking-widest font-bold text-clinic-navy mb-2">Health Snapshot</div>
                  <StatusDot date={latestBloodwork?.date_performed} label="Bloodwork" />
                  <StatusDot date={latestFecal?.date_performed} label="Fecal" />
                  <StatusDot date={latestDental?.date_performed} label="Dental" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
