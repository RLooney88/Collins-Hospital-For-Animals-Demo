"""Client portal API routes."""
from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, EmailStr, ConfigDict

from auth import hash_password, verify_password, create_access_token, get_current_admin
from database import get_db
from models import Client, Pet, ClientPetLink, PetContact, PetHealthRecord, PetAppointment

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")

portal = APIRouter(prefix="/portal", tags=["portal"])


# --- Auth dependency ---
from fastapi.security import OAuth2PasswordBearer
portal_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/portal/login", auto_error=False)

async def get_current_client(
    token: str | None = Depends(portal_oauth2),
    db: AsyncSession = Depends(get_db),
) -> Client:
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        client_id = payload.get("sub")
        if payload.get("role") != "client":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    res = await db.execute(select(Client).where(Client.id == client_id))
    client = res.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Client not found")
    return client


# --- Schemas ---
class PortalRegister(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: str | None = None

class PortalLogin(BaseModel):
    email: EmailStr
    password: str

class PortalTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    client: dict

class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    first_name: str
    last_name: str
    phone: str | None = None

class ClientUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None

class ContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    relation: str
    phone: str | None = None
    email: str | None = None

class HealthRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    record_type: str
    name: str
    date_performed: str
    next_due: str | None = None
    notes: str | None = None

class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    date: str
    reason: str
    provider: str | None = None
    notes: str | None = None
    status: str

class PetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    species: str
    breed: str | None = None
    dob: str | None = None
    sex: str | None = None
    weight_lbs: float | None = None
    photo_url: str | None = None
    microchip_id: str | None = None
    notes: str | None = None
    contacts: list[ContactOut] = []
    health_records: list[HealthRecordOut] = []
    appointments: list[AppointmentOut] = []

class PetPhotoUpdate(BaseModel):
    photo_url: str


class AdminClientUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None


class AdminPetCreate(BaseModel):
    client_id: str
    name: str
    species: str
    breed: str | None = None
    dob: str | None = None
    sex: str | None = None
    weight_lbs: float | None = None
    photo_url: str | None = None
    microchip_id: str | None = None
    notes: str | None = None


class AdminPetUpdate(BaseModel):
    name: str | None = None
    species: str | None = None
    breed: str | None = None
    dob: str | None = None
    sex: str | None = None
    weight_lbs: float | None = None
    photo_url: str | None = None
    microchip_id: str | None = None
    notes: str | None = None


class AdminContactCreate(BaseModel):
    name: str
    relation: str = "owner"
    phone: str | None = None
    email: EmailStr | None = None


class AdminHealthRecordCreate(BaseModel):
    record_type: str
    name: str
    date_performed: str
    next_due: str | None = None
    notes: str | None = None


class AdminPetAppointmentCreate(BaseModel):
    date: str
    reason: str
    provider: str | None = None
    notes: str | None = None
    status: str = "upcoming"


# --- Routes ---
@portal.post("/register", response_model=PortalTokenResponse, status_code=201)
async def register(payload: PortalRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Client).where(Client.email == payload.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")
    client = Client(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    token = create_access_token(client.id, extra={"role": "client"})
    return PortalTokenResponse(
        access_token=token,
        client={"id": client.id, "email": client.email, "first_name": client.first_name, "last_name": client.last_name},
    )


@portal.post("/login", response_model=PortalTokenResponse)
async def login(payload: PortalLogin, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Client).where(Client.email == payload.email.lower()))
    client = res.scalar_one_or_none()
    if not client or not verify_password(payload.password, client.password_hash):
        raise HTTPException(401, "Invalid email or password")
    token = create_access_token(client.id, extra={"role": "client"})
    return PortalTokenResponse(
        access_token=token,
        client={"id": client.id, "email": client.email, "first_name": client.first_name, "last_name": client.last_name},
    )


@portal.get("/me", response_model=ClientOut)
async def get_me(client: Client = Depends(get_current_client)):
    return ClientOut.model_validate(client)


@portal.patch("/me", response_model=ClientOut)
async def update_me(
    payload: ClientUpdate,
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, val)
    await db.commit()
    await db.refresh(client)
    return ClientOut.model_validate(client)


@portal.get("/pets", response_model=list[PetOut])
async def list_pets(
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Pet)
        .join(ClientPetLink, ClientPetLink.pet_id == Pet.id)
        .where(ClientPetLink.client_id == client.id)
        .options(
            selectinload(Pet.contacts),
            selectinload(Pet.health_records),
            selectinload(Pet.appointments),
        )
    )
    pets = res.scalars().unique().all()
    return [PetOut.model_validate(p) for p in pets]


@portal.get("/pets/{pet_id}", response_model=PetOut)
async def get_pet(
    pet_id: str,
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    # Verify client owns this pet
    link = await db.execute(
        select(ClientPetLink).where(ClientPetLink.client_id == client.id, ClientPetLink.pet_id == pet_id)
    )
    if not link.scalar_one_or_none():
        raise HTTPException(404, "Pet not found")
    res = await db.execute(
        select(Pet).where(Pet.id == pet_id).options(
            selectinload(Pet.contacts),
            selectinload(Pet.health_records),
            selectinload(Pet.appointments),
        )
    )
    pet = res.scalar_one_or_none()
    if not pet:
        raise HTTPException(404, "Pet not found")
    return PetOut.model_validate(pet)


@portal.patch("/pets/{pet_id}/photo", response_model=PetOut)
async def update_pet_photo(
    pet_id: str,
    payload: PetPhotoUpdate,
    client: Client = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    link = await db.execute(
        select(ClientPetLink).where(ClientPetLink.client_id == client.id, ClientPetLink.pet_id == pet_id)
    )
    if not link.scalar_one_or_none():
        raise HTTPException(404, "Pet not found")
    res = await db.execute(
        select(Pet).where(Pet.id == pet_id).options(
            selectinload(Pet.contacts),
            selectinload(Pet.health_records),
            selectinload(Pet.appointments),
        )
    )
    pet = res.scalar_one_or_none()
    pet.photo_url = payload.photo_url
    await db.commit()
    await db.refresh(pet)
    return PetOut.model_validate(pet)

# --- Admin routes over shared client portal data ---
def _client_to_admin_dict(client: Client) -> dict:
    pets = [link.pet for link in client.pet_links if link.pet]
    return {
        "id": client.id,
        "email": client.email,
        "first_name": client.first_name,
        "last_name": client.last_name,
        "phone": client.phone,
        "created_at": client.created_at.isoformat() if client.created_at else None,
        "pets": [PetOut.model_validate(p).model_dump() for p in pets],
    }


@portal.get("/admin/clients")
async def admin_list_clients(
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Client)
        .options(
            selectinload(Client.pet_links).selectinload(ClientPetLink.pet).selectinload(Pet.contacts),
            selectinload(Client.pet_links).selectinload(ClientPetLink.pet).selectinload(Pet.health_records),
            selectinload(Client.pet_links).selectinload(ClientPetLink.pet).selectinload(Pet.appointments),
        )
        .order_by(Client.created_at.desc())
    )
    return [_client_to_admin_dict(c) for c in res.scalars().unique().all()]


@portal.get("/admin/clients/{client_id}")
async def admin_get_client(
    client_id: str,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Client)
        .where(Client.id == client_id)
        .options(
            selectinload(Client.pet_links).selectinload(ClientPetLink.pet).selectinload(Pet.contacts),
            selectinload(Client.pet_links).selectinload(ClientPetLink.pet).selectinload(Pet.health_records),
            selectinload(Client.pet_links).selectinload(ClientPetLink.pet).selectinload(Pet.appointments),
        )
    )
    client = res.scalars().unique().one_or_none()
    if not client:
        raise HTTPException(404, "Client not found")
    return _client_to_admin_dict(client)


@portal.patch("/admin/clients/{client_id}")
async def admin_update_client(
    client_id: str,
    payload: AdminClientUpdate,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Client).where(Client.id == client_id))
    client = res.scalar_one_or_none()
    if not client:
        raise HTTPException(404, "Client not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    await db.commit()
    await db.refresh(client)
    return ClientOut.model_validate(client)


@portal.post("/admin/pets", response_model=PetOut, status_code=201)
async def admin_create_pet(
    payload: AdminPetCreate,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    client_res = await db.execute(select(Client).where(Client.id == payload.client_id))
    client = client_res.scalar_one_or_none()
    if not client:
        raise HTTPException(404, "Client not found")
    data = payload.model_dump(exclude={"client_id"})
    pet = Pet(**data)
    db.add(pet)
    await db.flush()
    db.add(ClientPetLink(client_id=client.id, pet_id=pet.id, role="owner"))
    await db.commit()
    res = await db.execute(
        select(Pet).where(Pet.id == pet.id).options(
            selectinload(Pet.contacts),
            selectinload(Pet.health_records),
            selectinload(Pet.appointments),
        )
    )
    return PetOut.model_validate(res.scalar_one())


@portal.patch("/admin/pets/{pet_id}", response_model=PetOut)
async def admin_update_pet(
    pet_id: str,
    payload: AdminPetUpdate,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Pet).where(Pet.id == pet_id))
    pet = res.scalar_one_or_none()
    if not pet:
        raise HTTPException(404, "Pet not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(pet, field, value)
    await db.commit()
    res = await db.execute(
        select(Pet).where(Pet.id == pet.id).options(
            selectinload(Pet.contacts),
            selectinload(Pet.health_records),
            selectinload(Pet.appointments),
        )
    )
    return PetOut.model_validate(res.scalar_one())


@portal.post("/admin/pets/{pet_id}/contacts", response_model=ContactOut, status_code=201)
async def admin_add_pet_contact(
    pet_id: str,
    payload: AdminContactCreate,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if not (await db.execute(select(Pet).where(Pet.id == pet_id))).scalar_one_or_none():
        raise HTTPException(404, "Pet not found")
    contact = PetContact(pet_id=pet_id, **payload.model_dump())
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return ContactOut.model_validate(contact)


@portal.post("/admin/pets/{pet_id}/health-records", response_model=HealthRecordOut, status_code=201)
async def admin_add_health_record(
    pet_id: str,
    payload: AdminHealthRecordCreate,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if not (await db.execute(select(Pet).where(Pet.id == pet_id))).scalar_one_or_none():
        raise HTTPException(404, "Pet not found")
    record = PetHealthRecord(pet_id=pet_id, **payload.model_dump())
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return HealthRecordOut.model_validate(record)


@portal.post("/admin/pets/{pet_id}/appointments", response_model=AppointmentOut, status_code=201)
async def admin_add_pet_appointment(
    pet_id: str,
    payload: AdminPetAppointmentCreate,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if not (await db.execute(select(Pet).where(Pet.id == pet_id))).scalar_one_or_none():
        raise HTTPException(404, "Pet not found")
    appt = PetAppointment(pet_id=pet_id, **payload.model_dump())
    db.add(appt)
    await db.commit()
    await db.refresh(appt)
    return AppointmentOut.model_validate(appt)

