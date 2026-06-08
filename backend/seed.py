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
from models import Surface, Switch, User

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
            (admin_email, admin_password, "Vet Clinic Admin"),
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

        await db.commit()
        logger.info("Seed complete from %s (refresh_existing=%s).", SEED_PATH, refresh_existing)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed())
