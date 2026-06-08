import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, Clock } from "lucide-react";

function fmtTime(isoUtc) {
  const d = new Date(isoUtc);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fmtDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

/**
 * Pick an appointment time. Shows type selector, then a horizontally scrollable
 * list of the next 14 days, each with its available slots.
 *
 * Props:
 *   - leadId: attached to the booking once confirmed
 *   - lead:   the lead object so we can prefill client info
 *   - preferredType: optional string matching a type name (from the form's Reason)
 *   - onBooked(appointment)
 */
export default function SlotPicker({ leadId, lead, preferredType, onBooked }) {
  const [types, setTypes] = useState([]);
  const [typeId, setTypeId] = useState(null);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [selected, setSelected] = useState(null);
  const [activeDay, setActiveDay] = useState(0);

  // Load types once.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/booking/types");
        if (!alive) return;
        setTypes(data);
        // Preselect by matching preferredType name (case-insensitive contains).
        if (data.length) {
          const matched =
            preferredType &&
            data.find((t) => t.name.toLowerCase().includes(preferredType.toLowerCase().split(" ")[0]));
          setTypeId((matched || data[0]).id);
        }
      } catch (e) {
        console.warn("failed loading booking types", e);
      }
    })();
    return () => { alive = false; };
  }, [preferredType]);

  // Load slots whenever type changes.
  useEffect(() => {
    if (!typeId) return;
    let alive = true;
    setLoading(true);
    setSelected(null);
    (async () => {
      try {
        const { data } = await api.get(`/booking/slots?type_id=${typeId}&days=14`);
        if (!alive) return;
        setDays(data.days || []);
        const firstOpenIdx = (data.days || []).findIndex((d) => d.slots.some((s) => s.available));
        setActiveDay(firstOpenIdx === -1 ? 0 : firstOpenIdx);
      } catch (e) {
        console.warn("failed loading slots", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [typeId]);

  const activeType = useMemo(() => types.find((t) => t.id === typeId), [types, typeId]);

  const confirm = async () => {
    if (!selected || booking) return;
    setBooking(true);
    try {
      const { data } = await api.post("/booking/book", {
        type_id: typeId,
        starts_at: selected,
        lead_id: leadId || null,
        client_name: lead?.name || "Guest",
        client_email: lead?.email || "",
        client_phone: lead?.phone || null,
        pet_id: lead?.pet_id || null,
        pet_name: lead?.pet_name || null,
        pet_type: lead?.pet_type || null,
        notes: lead?.comment || null,
      });
      toast.success("Appointment booked!");
      onBooked?.(data);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.detail || "That time was just taken. Please pick another.";
      toast.error(msg);
      // Refetch slots so the taken slot disappears.
      if (typeId) {
        try {
          const { data } = await api.get(`/booking/slots?type_id=${typeId}&days=14`);
          setDays(data.days || []);
          setSelected(null);
        } catch {
          /* ignore */
        }
      }
    }
    setBooking(false);
  };

  return (
    <section className="bg-white rounded-[2rem] p-8 lg:p-10 border border-sand-300/70" data-testid="slot-picker">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-clinic-sage text-clinic-forest grid place-items-center">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] font-semibold text-clinic-forest">
            Step 2 of 2
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-clinic-navy">
            Pick a time that works.
          </h2>
        </div>
      </div>

      <p className="mt-4 text-clinic-mist text-sm max-w-xl">
        Choose the visit type and a slot below. We&rsquo;ll reserve it and email {lead?.email || "you"} a confirmation.
      </p>

      {/* Type chips */}
      <div className="mt-6 flex flex-wrap gap-2" data-testid="slot-picker-types">
        {types.map((t) => (
          <button
            key={t.id}
            onClick={() => setTypeId(t.id)}
            className={`rounded-full px-4 py-2 text-xs font-bold border transition-colors ${
              t.id === typeId
                ? "bg-clinic-navy text-white border-clinic-navy"
                : "bg-white text-clinic-navy border-sand-300 hover:border-clinic-forest/60"
            }`}
            data-testid={`slot-type-${t.id}`}
          >
            <span>{t.name}</span>
            <span className={`ml-2 text-[10px] font-semibold ${t.id === typeId ? "text-white/70" : "text-clinic-mist"}`}>
              {t.duration_mins}min
            </span>
          </button>
        ))}
      </div>
      {activeType?.description && (
        <p className="mt-3 text-xs text-clinic-mist">{activeType.description}</p>
      )}

      {/* Day tabs */}
      {loading ? (
        <div className="mt-8 text-sm text-clinic-mist">Loading available times…</div>
      ) : days.length === 0 ? (
        <div className="mt-8 text-sm text-clinic-mist">
          No availability in the next 14 days. Please call (202) 659-8830.
        </div>
      ) : (
        <>
          <div className="mt-8 flex gap-2 overflow-x-auto pb-2" data-testid="slot-picker-days">
            {days.map((d, i) => {
              const anyAvail = d.slots.some((s) => s.available);
              return (
                <button
                  key={d.date}
                  onClick={() => setActiveDay(i)}
                  disabled={!anyAvail}
                  className={`shrink-0 rounded-2xl px-4 py-3 text-left border transition-colors min-w-[96px] ${
                    i === activeDay
                      ? "border-clinic-red bg-clinic-red-soft"
                      : anyAvail
                      ? "border-sand-300 bg-white hover:border-clinic-forest/60"
                      : "border-sand-200 bg-sand-100/60 opacity-50 cursor-not-allowed"
                  }`}
                  data-testid={`slot-day-${d.date}`}
                >
                  <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-clinic-mist">
                    {d.weekday.slice(0, 3)}
                  </div>
                  <div className="font-display font-bold text-clinic-navy mt-0.5">
                    {fmtDay(d.date).split(",")[1]?.trim() || fmtDay(d.date)}
                  </div>
                  <div className="text-[10px] text-clinic-mist mt-1">
                    {anyAvail ? `${d.slots.filter((s) => s.available).length} open` : "Closed"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="mt-6 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2" data-testid="slot-picker-times">
            {(days[activeDay]?.slots || []).map((s) => {
              const disabled = !s.available;
              const active = selected === s.starts_at;
              return (
                <button
                  key={s.starts_at}
                  disabled={disabled}
                  onClick={() => setSelected(s.starts_at)}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold border transition-colors ${
                    active
                      ? "bg-clinic-red text-white border-clinic-red"
                      : disabled
                      ? "bg-sand-100 text-clinic-mist/40 border-sand-200 line-through cursor-not-allowed"
                      : "bg-white text-clinic-navy border-sand-300 hover:border-clinic-forest/60"
                  }`}
                  data-testid={`slot-time-${s.starts_at}`}
                >
                  {fmtTime(s.starts_at)}
                </button>
              );
            })}
            {(days[activeDay]?.slots || []).length === 0 && (
              <div className="col-span-full text-sm text-clinic-mist">No slots this day.</div>
            )}
          </div>

          {/* Confirm bar */}
          <div className="mt-8 flex items-center justify-between flex-wrap gap-3 bg-sand-100/70 rounded-2xl px-5 py-4">
            <div className="text-sm">
              {selected ? (
                <>
                  <span className="text-clinic-mist">Selected: </span>
                  <span className="font-bold text-clinic-navy">
                    {fmtDay(days[activeDay].date)} · {fmtTime(selected)}
                  </span>
                </>
              ) : (
                <span className="text-clinic-mist flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> Pick a time above.
                </span>
              )}
            </div>
            <button
              onClick={confirm}
              disabled={!selected || booking}
              className="inline-flex items-center gap-2 bg-clinic-red hover:bg-clinic-red-hover text-white rounded-full px-6 py-2.5 font-semibold disabled:opacity-50"
              data-testid="slot-picker-confirm"
            >
              {booking ? "Booking…" : <><CheckCircle2 className="h-4 w-4" /> Confirm appointment</>}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
