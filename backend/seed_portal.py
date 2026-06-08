"""Seed demo data for the client portal.

Portal demo data is intentionally stored in the same client/pet tables that the
admin portal manages. Admin and client portal surfaces should be two views over
these shared records, never separate mock datasets.
"""
from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from auth import hash_password
from database import AsyncSessionLocal
from models import Client, Pet, ClientPetLink, PetContact, PetHealthRecord, PetAppointment

logger = logging.getLogger(__name__)

DEMO_CLIENTS = [
    {
        "email": "rlooney@rodericklooney.com",
        "password": "Athen@2025!",
        "first_name": "Roddy",
        "last_name": "Looney",
        "phone": "(410) 555-0199",
        "pet": {
            "name": "Rosie",
            "species": "dog",
            "breed": "Chizon (Bichon Frise / Shih Tzu mix)",
            "dob": "2021-03-15",
            "sex": "female",
            "weight_lbs": 12.4,
            "microchip_id": "985141002345678",
            "notes": "Sweet, gentle temperament. Prefers slow introductions. Loves treats.",
        },
    },
    {
        "email": "demo@demo.com",
        "password": "Demo2026!",
        "first_name": "Demo",
        "last_name": "Client",
        "phone": "(410) 555-0126",
        "pet": {
            "name": "Bailey",
            "species": "dog",
            "breed": "Golden Retriever mix",
            "dob": "2020-08-04",
            "sex": "male",
            "weight_lbs": 54.0,
            "microchip_id": "985141009876543",
            "notes": "Demo pet record for prospect walkthroughs. Friendly, food motivated, mild seasonal allergies.",
        },
    },
]

HEALTH_RECORDS = [
    {"record_type": "vaccination", "name": "Rabies (3-year)", "date_performed": "2024-06-12", "next_due": "2027-06-12", "notes": None},
    {"record_type": "vaccination", "name": "DHPP", "date_performed": "2025-06-10", "next_due": "2026-06-10", "notes": None},
    {"record_type": "vaccination", "name": "Bordetella", "date_performed": "2025-09-18", "next_due": "2026-09-18", "notes": None},
    {"record_type": "bloodwork", "name": "CBC / Chemistry Panel", "date_performed": "2025-06-10", "next_due": None, "notes": "All values within normal range."},
    {"record_type": "fecal", "name": "Fecal Float", "date_performed": "2025-06-10", "next_due": None, "notes": "Negative for parasites."},
    {"record_type": "dental", "name": "Dental Cleaning + Full Mouth X-rays", "date_performed": "2024-11-05", "next_due": None, "notes": "No extractions needed. Good dental health."},
]

APPOINTMENTS = [
    {"date": "2025-06-10", "reason": "Annual Wellness Exam + Vaccines", "provider": "Demo Care Team", "status": "completed", "notes": "Vaccines updated. Weight stable. Heart and lungs clear."},
    {"date": "2025-09-18", "reason": "Bordetella Booster", "provider": "Demo Care Team", "status": "completed", "notes": "Quick visit. No concerns."},
    {"date": "2024-11-05", "reason": "Dental Cleaning", "provider": "Demo Care Team", "status": "completed", "notes": "Dental cleaning under anesthesia. Recovered well."},
    {"date": "2026-06-10", "reason": "Annual Wellness Exam", "provider": "Demo Care Team", "status": "upcoming", "notes": "Upcoming demo wellness visit."},
]


async def _ensure_client_with_pet(db, spec: dict) -> None:
    email = spec["email"].lower()
    res = await db.execute(
        select(Client)
        .where(Client.email == email)
        .options(selectinload(Client.pet_links).selectinload(ClientPetLink.pet))
    )
    client = res.scalar_one_or_none()
    if not client:
        client = Client(
            email=email,
            password_hash=hash_password(spec["password"]),
            first_name=spec["first_name"],
            last_name=spec["last_name"],
            phone=spec.get("phone"),
        )
        db.add(client)
        await db.flush()
        logger.info("Portal seed: created client %s", email)
    else:
        client.first_name = spec["first_name"]
        client.last_name = spec["last_name"]
        client.phone = spec.get("phone")
        # Keep the known demo password usable across cloned demo sites.
        client.password_hash = hash_password(spec["password"])

    pet_spec = spec["pet"]
    existing_pet = None
    for link in client.pet_links:
        if link.pet and link.pet.name.lower() == pet_spec["name"].lower():
            existing_pet = link.pet
            break
    if not existing_pet:
        existing_pet = Pet(**pet_spec)
        db.add(existing_pet)
        await db.flush()
        db.add(ClientPetLink(client_id=client.id, pet_id=existing_pet.id, role="owner"))
        logger.info("Portal seed: created pet %s for %s", pet_spec["name"], email)
    else:
        for key, value in pet_spec.items():
            setattr(existing_pet, key, value)

    contact_res = await db.execute(select(PetContact).where(PetContact.pet_id == existing_pet.id, PetContact.email == email))
    if not contact_res.scalar_one_or_none():
        db.add(PetContact(pet_id=existing_pet.id, name=f"{client.first_name} {client.last_name}", relation="owner", phone=client.phone, email=email))

    records_res = await db.execute(select(PetHealthRecord).where(PetHealthRecord.pet_id == existing_pet.id))
    existing_records = {(r.record_type, r.name, r.date_performed) for r in records_res.scalars().all()}
    for rec in HEALTH_RECORDS:
        key = (rec["record_type"], rec["name"], rec["date_performed"])
        if key not in existing_records:
            db.add(PetHealthRecord(pet_id=existing_pet.id, **rec))

    appts_res = await db.execute(select(PetAppointment).where(PetAppointment.pet_id == existing_pet.id))
    existing_appts = {(a.date, a.reason) for a in appts_res.scalars().all()}
    for appt in APPOINTMENTS:
        key = (appt["date"], appt["reason"])
        if key not in existing_appts:
            db.add(PetAppointment(pet_id=existing_pet.id, **appt))


async def seed_portal():
    async with AsyncSessionLocal() as db:
        for spec in DEMO_CLIENTS:
            await _ensure_client_with_pet(db, spec)
        await db.commit()
        logger.info("Portal seed: ensured Roddy + Demo clients with shared client/pet records.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed_portal())
