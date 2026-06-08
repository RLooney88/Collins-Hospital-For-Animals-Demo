"""Seed smart-site template surfaces/switches from canonical JSON.

The source of truth is backend/seeds/smart_site_template.json. Keep smart-site
content there so every template instance starts from the same validated data.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any

from sqlalchemy import select

from auth import hash_password
from database import AsyncSessionLocal, Base, engine
from models import Surface, Switch, User, AppointmentType, ClinicHours, StaffConfig

logger = logging.getLogger(__name__)

SEED_PATH = Path(__file__).parent / "seeds" / "smart_site_template.json"
_FALSE_VALUES = {"0", "false", "no", "off"}


def _load_seed(path: Path = SEED_PATH) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data.get("surfaces"), list):
        raise ValueError(f"Seed file {path} must contain a surfaces list")
    return data


def _refresh_enabled(seed_data: dict[str, Any]) -> bool:
    default = seed_data.get("refreshExistingByDefault", True)
    raw = os.environ.get("SEED_REFRESH_CONTENT")
    if raw is None:
        return bool(default)
    return raw.strip().lower() not in _FALSE_VALUES


def _surface_spec(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "slug": raw["slug"],
        "name": raw["name"],
        "page": raw.get("page", "home"),
        "description": raw.get("description"),
        "default_content": raw.get("default_content", {}),
        "active": raw.get("active", True),
    }


async def seed() -> None:
    seed_data = _load_seed()
    refresh_existing = _refresh_enabled(seed_data)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    admin_email = os.environ["ADMIN_EMAIL"]
    admin_password = os.environ["ADMIN_PASSWORD"]

    async with AsyncSessionLocal() as db:
        # --- Admin users ---
        admin_accounts = [
            (admin_email, admin_password, "Collins Admin"),
            ("rlooney@rodericklooney.com", "Athen@2025!", "Roddy Looney"),
            ("demo@demo.com", "Demo2026!", "Demo Prospect"),
        ]
        for email, password, name in admin_accounts:
            res = await db.execute(select(User).where(User.email == email.lower()))
            user = res.scalar_one_or_none()
            if not user:
                user = User(
                    email=email.lower(),
                    password_hash=hash_password(password),
                    name=name,
                    role="admin",
                )
                db.add(user)
                logger.info("Seeded admin user %s", email.lower())

        # --- Surfaces ---
        surface_by_slug: dict[str, Surface] = {}
        for raw_surface in seed_data["surfaces"]:
            spec = _surface_spec(raw_surface)
            res = await db.execute(select(Surface).where(Surface.slug == spec["slug"]))
            existing = res.scalar_one_or_none()
            if existing:
                if refresh_existing:
                    existing.name = spec["name"]
                    existing.page = spec["page"]
                    existing.description = spec["description"]
                    existing.default_content = spec["default_content"]
                    existing.active = spec["active"]
                surface_by_slug[spec["slug"]] = existing
                continue

            surface = Surface(**spec)
            db.add(surface)
            await db.flush()
            surface_by_slug[spec["slug"]] = surface
            logger.info("Seeded surface %s", spec["slug"])

        await db.flush()

        # --- Switches ---
        for raw_surface in seed_data["surfaces"]:
            surface = surface_by_slug.get(raw_surface["slug"])
            if not surface:
                continue

            for sw_spec in raw_surface.get("switches", []):
                res = await db.execute(
                    select(Switch).where(
                        Switch.surface_id == surface.id,
                        Switch.name == sw_spec["name"],
                    )
                )
                existing = res.scalar_one_or_none()

                # Display names may change during template cleanup; rule identity is
                # stable enough for refresh matching and prevents stale DB rows.
                if not existing:
                    res = await db.execute(select(Switch).where(Switch.surface_id == surface.id))
                    for candidate in res.scalars().all():
                        if candidate.rule == sw_spec.get("rule", {}):
                            existing = candidate
                            break

                if existing:
                    if refresh_existing:
                        existing.name = sw_spec["name"]
                        existing.rule = sw_spec.get("rule", {})
                        existing.priority = sw_spec.get("priority", 100)
                        existing.content = sw_spec.get("content", {})
                        existing.active = sw_spec.get("active", True)
                    continue

                switch = Switch(surface_id=surface.id, **sw_spec)
                db.add(switch)


        # --- Collins booking configuration ---
        booking_types = [
            ("Wellness Exam", "Full-service appointment for healthy pets, annual care, vaccines, and prevention.", 45, 30, 45, "#A98243", 10),
            ("Sick or Urgent Visit", "Same-day or work-in request for illness, injury, or urgent concerns during normal hours when available.", 45, 30, 45, "#111111", 20),
            ("Technician Appointment", "Routine services such as nail trims, anal glands, or subcutaneous fluids when a doctor is not required.", 20, 0, 20, "#6E552F", 30),
            ("Dental Consultation", "Dental evaluation, cleaning planning, or rabbit and rodent dental discussion.", 45, 30, 45, "#8A6A3A", 40),
            ("Exotic Pet Exam", "Rabbit, guinea pig, small rodent, bird, or reptile exam, specific veterinarians only, call to confirm.", 45, 30, 45, "#A98243", 50),
        ]
        for name, desc, duration, doctor_mins, tech_mins, color, order in booking_types:
            res = await db.execute(select(AppointmentType).where(AppointmentType.name == name))
            appt = res.scalar_one_or_none()
            if not appt:
                db.add(AppointmentType(name=name, description=desc, duration_mins=duration, doctor_mins=doctor_mins, tech_mins=tech_mins, color=color, sort_order=order, active=True))
            else:
                appt.description = desc; appt.duration_mins = duration; appt.doctor_mins = doctor_mins; appt.tech_mins = tech_mins; appt.color = color; appt.sort_order = order; appt.active = True

        hours = {0:(True,480,1140),1:(True,480,1140),2:(True,540,900),3:(True,480,1140),4:(True,480,1140),5:(False,0,0),6:(False,0,0)}
        for day,(is_open,open_mins,close_mins) in hours.items():
            res = await db.execute(select(ClinicHours).where(ClinicHours.day_of_week == day))
            row = res.scalar_one_or_none()
            if not row:
                db.add(ClinicHours(day_of_week=day, is_open=is_open, open_minutes=open_mins, close_minutes=close_mins))
            else:
                row.is_open=is_open; row.open_minutes=open_mins; row.close_minutes=close_mins

        res = await db.execute(select(StaffConfig).limit(1))
        staff_cfg = res.scalar_one_or_none()
        if not staff_cfg:
            db.add(StaffConfig(num_doctors=2, num_techs=3, slot_granularity_mins=30, booking_window_days=21, min_lead_time_hours=4))
        else:
            staff_cfg.num_doctors=2; staff_cfg.num_techs=3; staff_cfg.slot_granularity_mins=30; staff_cfg.booking_window_days=21; staff_cfg.min_lead_time_hours=4

        await db.commit()
        logger.info("Seed complete from %s (refresh_existing=%s).", SEED_PATH, refresh_existing)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed())
