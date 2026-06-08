"""Booking engine + public/admin endpoints for appointment scheduling."""
from __future__ import annotations

from datetime import datetime, date, time, timedelta, timezone
from typing import Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_admin
from database import get_db
from models import (
    Appointment,
    AppointmentType,
    BlockedTime,
    ClinicHours,
    Client,
    ClientPetLink,
    LeadSubmission,
    PetAppointment,
    StaffConfig,
)

# Eastern time for all clinic-facing operations.
CLINIC_TZ = ZoneInfo("America/New_York")

booking = APIRouter(prefix="/booking", tags=["booking"])


# ---------- Helpers ----------

async def _get_staff_config(db: AsyncSession) -> StaffConfig:
    res = await db.execute(select(StaffConfig).limit(1))
    cfg = res.scalar_one_or_none()
    if not cfg:
        cfg = StaffConfig()
        db.add(cfg)
        await db.commit()
        await db.refresh(cfg)
    return cfg


async def _list_hours(db: AsyncSession) -> dict[int, ClinicHours]:
    res = await db.execute(select(ClinicHours))
    return {h.day_of_week: h for h in res.scalars().all()}


def _overlap(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    return a_start < b_end and b_start < a_end


async def _appointments_window(
    db: AsyncSession, window_start: datetime, window_end: datetime
) -> list[Appointment]:
    res = await db.execute(
        select(Appointment).where(
            and_(
                Appointment.status.in_(["booked", "confirmed"]),
                Appointment.starts_at < window_end,
                Appointment.ends_at > window_start,
            )
        )
    )
    return list(res.scalars().all())


async def _blocked_window(
    db: AsyncSession, window_start: datetime, window_end: datetime
) -> list[BlockedTime]:
    res = await db.execute(
        select(BlockedTime).where(
            and_(BlockedTime.starts_at < window_end, BlockedTime.ends_at > window_start)
        )
    )
    return list(res.scalars().all())


async def _is_slot_available(
    db: AsyncSession,
    start_utc: datetime,
    type_: AppointmentType,
    cfg: StaffConfig,
    cached_appts: list[Appointment],
    cached_blocks: list[BlockedTime],
) -> bool:
    """Check doctor & tech availability at start_utc for `type_`."""
    end_utc = start_utc + timedelta(minutes=type_.duration_mins)
    doctor_end = start_utc + timedelta(minutes=type_.doctor_mins)
    tech_end = start_utc + timedelta(minutes=type_.tech_mins)

    # Blocked time: if any blocked range overlaps the relevant resource window, reject.
    for b in cached_blocks:
        b_blocks = b.blocks or "all"
        if b_blocks in ("all", "doctor") and type_.doctor_mins > 0 and _overlap(start_utc, doctor_end, b.starts_at, b.ends_at):
            return False
        if b_blocks in ("all", "tech") and type_.tech_mins > 0 and _overlap(start_utc, tech_end, b.starts_at, b.ends_at):
            return False

    # Count overlapping doctor-busy and tech-busy windows from existing appointments.
    doctor_overlaps = 0
    tech_overlaps = 0
    for a in cached_appts:
        if type_.doctor_mins > 0 and _overlap(start_utc, doctor_end, a.starts_at, a.doctor_ends_at):
            doctor_overlaps += 1
        if type_.tech_mins > 0 and _overlap(start_utc, tech_end, a.starts_at, a.tech_ends_at):
            tech_overlaps += 1

    if type_.doctor_mins > 0 and doctor_overlaps >= cfg.num_doctors:
        return False
    if type_.tech_mins > 0 and tech_overlaps >= cfg.num_techs:
        return False
    return True


async def _slots_for_type(
    db: AsyncSession,
    type_: AppointmentType,
    start_date: date,
    end_date: date,
) -> list[dict]:
    cfg = await _get_staff_config(db)
    hours_by_dow = await _list_hours(db)
    min_lead = datetime.now(timezone.utc) + timedelta(hours=cfg.min_lead_time_hours)

    window_start = datetime.combine(start_date, time.min, tzinfo=CLINIC_TZ).astimezone(timezone.utc)
    window_end = datetime.combine(end_date + timedelta(days=1), time.min, tzinfo=CLINIC_TZ).astimezone(timezone.utc)
    appts = await _appointments_window(db, window_start, window_end)
    blocks = await _blocked_window(db, window_start, window_end)

    slots: list[dict] = []
    current = start_date
    granularity = max(5, cfg.slot_granularity_mins)
    while current <= end_date:
        dow = current.weekday()  # Mon=0 ... Sun=6
        hrs = hours_by_dow.get(dow)
        if hrs and hrs.is_open and hrs.close_minutes > hrs.open_minutes:
            # Generate candidate start times in CLINIC_TZ.
            minute = hrs.open_minutes
            latest_start = hrs.close_minutes - type_.duration_mins
            while minute <= latest_start:
                local_start = datetime.combine(
                    current,
                    time(hour=minute // 60, minute=minute % 60),
                    tzinfo=CLINIC_TZ,
                )
                start_utc = local_start.astimezone(timezone.utc)
                if start_utc >= min_lead:
                    ok = await _is_slot_available(db, start_utc, type_, cfg, appts, blocks)
                    slots.append({
                        "starts_at": start_utc.isoformat(),
                        "local_date": current.isoformat(),
                        "local_time": local_start.strftime("%H:%M"),
                        "available": ok,
                    })
                minute += granularity
        current += timedelta(days=1)
    return slots


# ---------- Public endpoints ----------

@booking.get("/types")
async def list_types(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(AppointmentType).where(AppointmentType.active == True).order_by(AppointmentType.sort_order, AppointmentType.name))  # noqa: E712
    return [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "duration_mins": t.duration_mins,
            "color": t.color,
        }
        for t in res.scalars().all()
    ]


@booking.get("/slots")
async def get_slots(
    type_id: str,
    days: int = 14,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(AppointmentType).where(AppointmentType.id == type_id))
    type_ = res.scalar_one_or_none()
    if not type_ or not type_.active:
        raise HTTPException(404, "Appointment type not found")

    cfg = await _get_staff_config(db)
    days = min(max(1, days), cfg.booking_window_days)
    today_local = datetime.now(CLINIC_TZ).date()
    end_date = today_local + timedelta(days=days - 1)
    slots = await _slots_for_type(db, type_, today_local, end_date)

    # Group by local_date for convenient UI rendering.
    by_date: dict[str, list[dict]] = {}
    for s in slots:
        by_date.setdefault(s["local_date"], []).append(s)
    return {
        "type": {
            "id": type_.id,
            "name": type_.name,
            "duration_mins": type_.duration_mins,
        },
        "days": [
            {
                "date": d,
                "weekday": datetime.fromisoformat(d).strftime("%A"),
                "slots": slots_for_day,
            }
            for d, slots_for_day in by_date.items()
        ],
    }


class BookRequest(BaseModel):
    type_id: str
    starts_at: str  # ISO UTC
    lead_id: Optional[str] = None
    client_name: str
    client_email: str
    client_phone: Optional[str] = None
    pet_name: Optional[str] = None
    pet_type: Optional[str] = None
    pet_id: Optional[str] = None
    notes: Optional[str] = None


@booking.post("/book")
async def book_appointment(payload: BookRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(AppointmentType).where(AppointmentType.id == payload.type_id))
    type_ = res.scalar_one_or_none()
    if not type_ or not type_.active:
        raise HTTPException(404, "Appointment type not found")
    try:
        start_utc = datetime.fromisoformat(payload.starts_at.replace("Z", "+00:00"))
        if start_utc.tzinfo is None:
            start_utc = start_utc.replace(tzinfo=timezone.utc)
        else:
            start_utc = start_utc.astimezone(timezone.utc)
    except Exception as exc:
        raise HTTPException(400, f"Invalid starts_at: {exc}")

    cfg = await _get_staff_config(db)
    end_utc = start_utc + timedelta(minutes=type_.duration_mins)
    appts = await _appointments_window(db, start_utc - timedelta(hours=2), end_utc + timedelta(hours=2))
    blocks = await _blocked_window(db, start_utc - timedelta(hours=2), end_utc + timedelta(hours=2))
    ok = await _is_slot_available(db, start_utc, type_, cfg, appts, blocks)
    if not ok:
        raise HTTPException(409, "That slot is no longer available. Please pick another time.")

    appt = Appointment(
        lead_id=payload.lead_id,
        appointment_type_id=type_.id,
        appointment_type_name=type_.name,
        client_name=payload.client_name,
        client_email=payload.client_email,
        client_phone=payload.client_phone,
        pet_name=payload.pet_name,
        pet_type=payload.pet_type,
        notes=payload.notes,
        starts_at=start_utc,
        ends_at=end_utc,
        doctor_ends_at=start_utc + timedelta(minutes=type_.doctor_mins),
        tech_ends_at=start_utc + timedelta(minutes=type_.tech_mins),
    )
    db.add(appt)

    # If a logged-in portal user booked for a known pet, mirror the booking into
    # the shared pet appointment history. Admin and client portal surfaces should
    # both reflect the same patient record instead of drifting into separate data.
    if payload.pet_id:
        link_res = await db.execute(
            select(ClientPetLink)
            .join(Client, Client.id == ClientPetLink.client_id)
            .where(ClientPetLink.pet_id == payload.pet_id, Client.email == payload.client_email.lower())
        )
        if not link_res.scalar_one_or_none():
            raise HTTPException(404, "Pet not found for this portal client")
        local_start = start_utc.astimezone(CLINIC_TZ)
        db.add(PetAppointment(
            pet_id=payload.pet_id,
            date=local_start.date().isoformat(),
            reason=type_.name,
            provider="Care Team",
            status="upcoming",
            notes=payload.notes or f"Booked online for {local_start.strftime('%I:%M %p').lstrip('0')}",
        ))

    await db.commit()
    await db.refresh(appt)
    return _appt_to_dict(appt)


def _appt_to_dict(a: Appointment) -> dict:
    return {
        "id": a.id,
        "lead_id": a.lead_id,
        "appointment_type_id": a.appointment_type_id,
        "appointment_type_name": a.appointment_type_name,
        "client_name": a.client_name,
        "client_email": a.client_email,
        "client_phone": a.client_phone,
        "pet_name": a.pet_name,
        "pet_type": a.pet_type,
        "notes": a.notes,
        "starts_at": a.starts_at.isoformat() if a.starts_at else None,
        "ends_at": a.ends_at.isoformat() if a.ends_at else None,
        "status": a.status,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


# ---------- Admin: appointments list ----------

@booking.get("/admin/appointments")
async def admin_list_appointments(
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Appointment).order_by(Appointment.starts_at.desc()).limit(200))
    return [_appt_to_dict(a) for a in res.scalars().all()]


@booking.patch("/admin/appointments/{appt_id}")
async def admin_update_appointment(
    appt_id: str,
    payload: dict,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Appointment).where(Appointment.id == appt_id))
    appt = res.scalar_one_or_none()
    if not appt:
        raise HTTPException(404, "Appointment not found")
    status = payload.get("status")
    if status in ("booked", "confirmed", "cancelled", "completed"):
        appt.status = status
    await db.commit()
    return _appt_to_dict(appt)


# ---------- Admin: calendar configuration ----------

@booking.get("/admin/config")
async def admin_get_config(_admin=Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    cfg = await _get_staff_config(db)
    hours = await _list_hours(db)
    type_res = await db.execute(select(AppointmentType).order_by(AppointmentType.sort_order, AppointmentType.name))
    blocks_res = await db.execute(select(BlockedTime).order_by(BlockedTime.starts_at))
    return {
        "staff": {
            "num_doctors": cfg.num_doctors,
            "num_techs": cfg.num_techs,
            "slot_granularity_mins": cfg.slot_granularity_mins,
            "booking_window_days": cfg.booking_window_days,
            "min_lead_time_hours": cfg.min_lead_time_hours,
        },
        "hours": [
            {
                "day_of_week": d,
                "is_open": (hours[d].is_open if d in hours else False),
                "open_minutes": (hours[d].open_minutes if d in hours else 540),
                "close_minutes": (hours[d].close_minutes if d in hours else 1020),
            }
            for d in range(7)
        ],
        "types": [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "duration_mins": t.duration_mins,
                "doctor_mins": t.doctor_mins,
                "tech_mins": t.tech_mins,
                "color": t.color,
                "sort_order": t.sort_order,
                "active": t.active,
            }
            for t in type_res.scalars().all()
        ],
        "blocked_times": [
            {
                "id": b.id,
                "reason": b.reason,
                "starts_at": b.starts_at.isoformat(),
                "ends_at": b.ends_at.isoformat(),
                "blocks": b.blocks,
            }
            for b in blocks_res.scalars().all()
        ],
    }


class StaffUpdate(BaseModel):
    num_doctors: int = Field(ge=0, le=20)
    num_techs: int = Field(ge=0, le=20)
    slot_granularity_mins: int = Field(ge=5, le=120)
    booking_window_days: int = Field(ge=1, le=90)
    min_lead_time_hours: int = Field(ge=0, le=168)


@booking.patch("/admin/config/staff")
async def admin_update_staff(payload: StaffUpdate, _admin=Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    cfg = await _get_staff_config(db)
    for k, v in payload.model_dump().items():
        setattr(cfg, k, v)
    await db.commit()
    return {"ok": True}


class HourRow(BaseModel):
    day_of_week: int
    is_open: bool
    open_minutes: int
    close_minutes: int


@booking.put("/admin/config/hours")
async def admin_set_hours(payload: list[HourRow], _admin=Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    existing = await _list_hours(db)
    for row in payload:
        if row.day_of_week in existing:
            h = existing[row.day_of_week]
            h.is_open = row.is_open
            h.open_minutes = row.open_minutes
            h.close_minutes = row.close_minutes
        else:
            db.add(ClinicHours(**row.model_dump()))
    await db.commit()
    return {"ok": True}


class TypeIn(BaseModel):
    name: str
    description: Optional[str] = None
    duration_mins: int = Field(ge=5, le=480)
    doctor_mins: int = Field(ge=0, le=480)
    tech_mins: int = Field(ge=0, le=480)
    color: Optional[str] = None
    sort_order: int = 0
    active: bool = True


@booking.post("/admin/config/types")
async def admin_create_type(payload: TypeIn, _admin=Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    t = AppointmentType(**payload.model_dump())
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return {"id": t.id}


@booking.patch("/admin/config/types/{type_id}")
async def admin_update_type(type_id: str, payload: TypeIn, _admin=Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(AppointmentType).where(AppointmentType.id == type_id))
    t = res.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Type not found")
    for k, v in payload.model_dump().items():
        setattr(t, k, v)
    await db.commit()
    return {"ok": True}


@booking.delete("/admin/config/types/{type_id}")
async def admin_delete_type(type_id: str, _admin=Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(AppointmentType).where(AppointmentType.id == type_id))
    t = res.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Type not found")
    await db.delete(t)
    await db.commit()
    return {"ok": True}


class BlockIn(BaseModel):
    reason: Optional[str] = None
    starts_at: str
    ends_at: str
    blocks: str = "all"


@booking.post("/admin/config/blocks")
async def admin_create_block(payload: BlockIn, _admin=Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    def _parse(s: str) -> datetime:
        d = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)

    b = BlockedTime(
        reason=payload.reason,
        starts_at=_parse(payload.starts_at),
        ends_at=_parse(payload.ends_at),
        blocks=payload.blocks if payload.blocks in ("all", "doctor", "tech") else "all",
    )
    db.add(b)
    await db.commit()
    await db.refresh(b)
    return {"id": b.id}


@booking.delete("/admin/config/blocks/{block_id}")
async def admin_delete_block(block_id: str, _admin=Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(BlockedTime).where(BlockedTime.id == block_id))
    b = res.scalar_one_or_none()
    if not b:
        raise HTTPException(404, "Block not found")
    await db.delete(b)
    await db.commit()
    return {"ok": True}
