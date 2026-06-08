import React, { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../lib/api";
import { PawPrint, Plus, RefreshCw, Save, UserRound } from "lucide-react";
import { toast } from "sonner";

const EMPTY_PET = { name: "", species: "dog", breed: "", dob: "", sex: "", weight_lbs: "", microchip_id: "", notes: "" };
const EMPTY_RECORD = { record_type: "vaccination", name: "", date_performed: "", next_due: "", notes: "" };
const EMPTY_APPT = { date: "", reason: "", provider: "Care Team", status: "upcoming", notes: "" };

export default function AdminClientsPets() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newPet, setNewPet] = useState(EMPTY_PET);
  const [newRecord, setNewRecord] = useState(EMPTY_RECORD);
  const [newAppt, setNewAppt] = useState(EMPTY_APPT);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get("/portal/admin/clients");
      setClients(data || []);
      if (!selectedClientId && data?.[0]) setSelectedClientId(data[0].id);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load clients and pets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || clients[0] || null,
    [clients, selectedClientId]
  );
  const pets = useMemo(() => selectedClient?.pets || [], [selectedClient]);
  const selectedPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId) || pets[0] || null,
    [pets, selectedPetId]
  );

  useEffect(() => {
    if (selectedClient && !pets.some((p) => p.id === selectedPetId)) {
      setSelectedPetId(pets[0]?.id || null);
    }
  }, [selectedClientId, clients]); // eslint-disable-line react-hooks/exhaustive-deps

  const addPet = async () => {
    if (!selectedClient || !newPet.name.trim()) return toast.error("Pet name is required.");
    try {
      await adminApi.post("/portal/admin/pets", {
        client_id: selectedClient.id,
        ...newPet,
        weight_lbs: newPet.weight_lbs ? Number(newPet.weight_lbs) : null,
      });
      toast.success("Pet added to shared portal record.");
      setNewPet(EMPTY_PET);
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to add pet.");
    }
  };

  const updatePet = async () => {
    if (!selectedPet) return;
    try {
      await adminApi.patch(`/portal/admin/pets/${selectedPet.id}`, {
        name: selectedPet.name,
        species: selectedPet.species,
        breed: selectedPet.breed,
        dob: selectedPet.dob,
        sex: selectedPet.sex,
        weight_lbs: selectedPet.weight_lbs,
        photo_url: selectedPet.photo_url,
        microchip_id: selectedPet.microchip_id,
        notes: selectedPet.notes,
      });
      toast.success("Pet updated. Client portal will reflect this record.");
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to update pet.");
    }
  };

  const patchSelectedPetLocal = (field, value) => {
    setClients((prev) => prev.map((c) => c.id !== selectedClient?.id ? c : {
      ...c,
      pets: (c.pets || []).map((p) => p.id === selectedPet?.id ? { ...p, [field]: value } : p),
    }));
  };

  const addHealthRecord = async () => {
    if (!selectedPet || !newRecord.name || !newRecord.date_performed) return toast.error("Record name and date are required.");
    try {
      await adminApi.post(`/portal/admin/pets/${selectedPet.id}/health-records`, newRecord);
      toast.success("Health record added.");
      setNewRecord(EMPTY_RECORD);
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to add health record.");
    }
  };

  const addAppointment = async () => {
    if (!selectedPet || !newAppt.date || !newAppt.reason) return toast.error("Appointment date and reason are required.");
    try {
      await adminApi.post(`/portal/admin/pets/${selectedPet.id}/appointments`, newAppt);
      toast.success("Portal appointment history updated.");
      setNewAppt(EMPTY_APPT);
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Failed to add appointment.");
    }
  };

  if (loading) return <div className="text-clinic-mist">Loading clients and pets…</div>;

  return (
    <div data-testid="admin-clients-pets">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest flex items-center gap-2"><UserRound className="h-3.5 w-3.5" /> Client Portal Data</div>
          <h1 className="font-display text-3xl font-extrabold text-clinic-navy mt-1">Clients & Pets</h1>
          <p className="text-sm text-clinic-mist mt-2 max-w-2xl">Manage the shared client/patient records used by both this admin backend and the client portal. Changes here are reflected in the client portal.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-sand-300 px-4 py-2 text-sm font-semibold text-clinic-navy hover:border-clinic-forest/60"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="bg-white rounded-[1.5rem] border border-sand-300/70 p-4">
          <h2 className="font-display font-bold text-clinic-navy mb-3">Clients</h2>
          <div className="space-y-2">
            {clients.map((client) => (
              <button key={client.id} onClick={() => { setSelectedClientId(client.id); setSelectedPetId(null); }} className={`w-full text-left rounded-2xl border px-4 py-3 ${selectedClient?.id === client.id ? "border-clinic-red bg-clinic-red-soft" : "border-sand-300 hover:border-clinic-forest/60"}`}>
                <div className="font-bold text-clinic-navy">{client.first_name} {client.last_name}</div>
                <div className="text-xs text-clinic-mist">{client.email}</div>
                <div className="text-xs text-clinic-forest mt-1">{client.pets?.length || 0} pet(s)</div>
              </button>
            ))}
            {clients.length === 0 && <div className="text-sm text-clinic-mist">No portal clients yet.</div>}
          </div>
        </aside>

        <main className="space-y-6">
          {selectedClient && (
            <section className="bg-white rounded-[1.5rem] border border-sand-300/70 p-6">
              <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">Selected client</div>
              <div className="mt-1 font-display text-2xl font-extrabold text-clinic-navy">{selectedClient.first_name} {selectedClient.last_name}</div>
              <div className="text-sm text-clinic-mist">{selectedClient.email} · {selectedClient.phone || "No phone"}</div>
            </section>
          )}

          {selectedClient && (
            <section className="bg-white rounded-[1.5rem] border border-sand-300/70 p-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest"><PawPrint className="h-3.5 w-3.5" /> Pets</div>
              <div className="mt-4 flex flex-wrap gap-2">
                {pets.map((pet) => <button key={pet.id} onClick={() => setSelectedPetId(pet.id)} className={`rounded-full px-4 py-2 text-sm font-semibold border ${selectedPet?.id === pet.id ? "bg-clinic-navy text-white border-clinic-navy" : "border-sand-300 text-clinic-navy"}`}>{pet.name}</button>)}
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-4">
                <Input label="New pet name" value={newPet.name} onChange={(v) => setNewPet({ ...newPet, name: v })} />
                <Input label="Species" value={newPet.species} onChange={(v) => setNewPet({ ...newPet, species: v })} />
                <Input label="Breed" value={newPet.breed} onChange={(v) => setNewPet({ ...newPet, breed: v })} />
                <button onClick={addPet} className="self-end inline-flex justify-center items-center gap-2 bg-clinic-red text-white rounded-xl px-4 py-2.5 text-sm font-semibold"><Plus className="h-4 w-4" /> Add pet</button>
              </div>
            </section>
          )}

          {selectedPet && (
            <section className="bg-white rounded-[1.5rem] border border-sand-300/70 p-6">
              <div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl font-extrabold text-clinic-navy">Patient record: {selectedPet.name}</h2><button onClick={updatePet} className="inline-flex items-center gap-2 bg-clinic-navy text-white rounded-full px-5 py-2 text-sm font-semibold"><Save className="h-4 w-4" /> Save pet</button></div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Input label="Name" value={selectedPet.name || ""} onChange={(v) => patchSelectedPetLocal("name", v)} />
                <Input label="Species" value={selectedPet.species || ""} onChange={(v) => patchSelectedPetLocal("species", v)} />
                <Input label="Breed" value={selectedPet.breed || ""} onChange={(v) => patchSelectedPetLocal("breed", v)} />
                <Input label="DOB" value={selectedPet.dob || ""} onChange={(v) => patchSelectedPetLocal("dob", v)} />
                <Input label="Sex" value={selectedPet.sex || ""} onChange={(v) => patchSelectedPetLocal("sex", v)} />
                <Input label="Weight lbs" value={selectedPet.weight_lbs || ""} onChange={(v) => patchSelectedPetLocal("weight_lbs", v ? Number(v) : null)} />
                <Input label="Microchip" value={selectedPet.microchip_id || ""} onChange={(v) => patchSelectedPetLocal("microchip_id", v)} />
                <Input label="Photo URL" value={selectedPet.photo_url || ""} onChange={(v) => patchSelectedPetLocal("photo_url", v)} />
                <Input label="Notes" value={selectedPet.notes || ""} onChange={(v) => patchSelectedPetLocal("notes", v)} />
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <Panel title="Health records" items={selectedPet.health_records} render={(r) => <><b>{r.name}</b><span>{r.record_type} · {r.date_performed}{r.next_due ? ` · due ${r.next_due}` : ""}</span></>} />
                <Panel title="Appointment history" items={selectedPet.appointments} render={(a) => <><b>{a.reason}</b><span>{a.date} · {a.status}{a.provider ? ` · ${a.provider}` : ""}</span></>} />
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <FormBox title="Add health record" onSubmit={addHealthRecord} button="Add record">
                  <Input label="Type" value={newRecord.record_type} onChange={(v) => setNewRecord({ ...newRecord, record_type: v })} />
                  <Input label="Name" value={newRecord.name} onChange={(v) => setNewRecord({ ...newRecord, name: v })} />
                  <Input label="Date performed" value={newRecord.date_performed} onChange={(v) => setNewRecord({ ...newRecord, date_performed: v })} />
                  <Input label="Next due" value={newRecord.next_due} onChange={(v) => setNewRecord({ ...newRecord, next_due: v })} />
                </FormBox>
                <FormBox title="Add portal appointment" onSubmit={addAppointment} button="Add appointment">
                  <Input label="Date" value={newAppt.date} onChange={(v) => setNewAppt({ ...newAppt, date: v })} />
                  <Input label="Reason" value={newAppt.reason} onChange={(v) => setNewAppt({ ...newAppt, reason: v })} />
                  <Input label="Provider" value={newAppt.provider} onChange={(v) => setNewAppt({ ...newAppt, provider: v })} />
                  <Input label="Status" value={newAppt.status} onChange={(v) => setNewAppt({ ...newAppt, status: v })} />
                </FormBox>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }) {
  return <label className="block"><span className="text-xs font-semibold text-clinic-mist">{label}</span><input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-sand-300 px-3 py-2 text-sm text-clinic-navy focus:outline-none focus:ring-2 focus:ring-clinic-sage" /></label>;
}

function Panel({ title, items = [], render }) {
  return <div className="rounded-2xl bg-sand-100/70 p-4"><h3 className="font-display font-bold text-clinic-navy">{title}</h3><div className="mt-3 space-y-2">{items.length ? items.map((item) => <div key={item.id} className="rounded-xl bg-white border border-sand-300/70 px-3 py-2 text-sm text-clinic-mist flex flex-col">{render(item)}</div>) : <div className="text-sm text-clinic-mist">None yet.</div>}</div></div>;
}

function FormBox({ title, children, onSubmit, button }) {
  return <div className="rounded-2xl border border-sand-300/70 p-4"><h3 className="font-display font-bold text-clinic-navy">{title}</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div><button onClick={onSubmit} className="mt-4 inline-flex items-center gap-2 bg-clinic-red text-white rounded-full px-5 py-2 text-sm font-semibold"><Plus className="h-4 w-4" /> {button}</button></div>;
}
