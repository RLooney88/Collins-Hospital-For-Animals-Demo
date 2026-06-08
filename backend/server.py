"""Veterinary Site Template, FastAPI server.

Public routes handle anonymous visitor tracking, dynamic surface content, and
lead submissions. Admin routes (JWT-protected) expose CRUD over Surfaces,
Switches, Leads and basic analytics.
"""
from __future__ import annotations

import logging
import os
import re
import json
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import create_access_token, get_current_admin, verify_password
from database import get_db
from email_service import send_lead_notification
from intent_engine import match_switch, resolve_parent_intent, resolve_sub_intent
from models import LeadSubmission, SignalEvent, Surface, Switch, User, VisitorSession, WebhookConfig, ChatbotConfig, ChatMessage, ChatBooking
from schemas import (
    AnalyticsOverview,
    ChatRequest,
    ChatResponse,
    ChatbotConfigOut,
    ChatbotConfigUpdate,
    LeadCreateRequest,
    LeadOut,
    LeadStatusUpdate,
    LoginRequest,
    SessionInitRequest,
    SessionOut,
    SignalEventOut,
    SignalTrackRequest,
    SurfaceContentResponse,
    SurfaceCreate,
    SurfaceOut,
    SurfaceUpdate,
    SwitchCreate,
    SwitchOut,
    SwitchUpdate,
    TokenResponse,
    VisitorSessionOut,
    WebhookCreate,
    WebhookOut,
    WebhookTestResponse,
    WebhookUpdate,
)
from seed import seed as seed_db
from seed_portal import seed_portal
from portal import portal as portal_router
from booking import booking as booking_router
from nova_site_editor import nova_site_editor as nova_site_editor_router

from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


# ---------- Signal â†’ intent scoring ----------

# Strength multipliers for signal types
SIGNAL_STRENGTH_MULT = {
    "intent_select": 5,       # explicit click on parent-intent card
    "sub_intent_select": 5,   # explicit sub-intent pick
    "chat_intent": 8,         # chat conversation - highest weight signal
    "form_start": 3,
    "form_submit": 4,
    "cta_click": 2,
    "page_view": 1,
    "faq_open": 1,
}


async def _ensure_session(db: AsyncSession, session_token: str | None) -> VisitorSession:
    """Look up (or create) a visitor session by token."""
    if session_token:
        res = await db.execute(select(VisitorSession).where(VisitorSession.session_token == session_token))
        sess = res.scalar_one_or_none()
        if sess:
            return sess
    sess = VisitorSession(session_token=token_urlsafe(24))
    db.add(sess)
    await db.flush()
    return sess


# Per-signal recency decay. Each new tracked signal shrinks all prior scores
# by this factor before the new delta is added. Lower = more aggressive bias
# toward the most recent clicks. 0.75 means after ~5 signals, an earlier
# score is down to ~24% of its original weight.
SIGNAL_DECAY_FACTOR = 0.75
SIGNAL_FLOOR = 0.3  # drop scores below this to keep the state clean


def _decay_scores(scores: dict | None) -> dict:
    """Apply a fixed per-signal decay to all scores."""
    if not scores:
        return {}
    decayed: dict = {}
    for k, v in scores.items():
        try:
            nv = float(v) * SIGNAL_DECAY_FACTOR
        except (TypeError, ValueError):
            continue
        if nv >= SIGNAL_FLOOR:
            decayed[k] = round(nv, 3)
    return decayed


def _apply_signal(sess: VisitorSession, ev: SignalEvent) -> None:
    """Update session intent from a new event, decaying older scores first by click order."""
    if ev.signal_type == "page_view":
        sess.page_view_count = (sess.page_view_count or 0) + 1
    mult = SIGNAL_STRENGTH_MULT.get(ev.signal_type, 1)
    delta = max(1, int(ev.strength or 1)) * mult

    # Decay everything the visitor has accumulated so far by one "tick".
    scores = _decay_scores(sess.intent_scores or {})
    sub_scores = _decay_scores(sess.sub_intent_scores or {})

    if ev.intent:
        scores[ev.intent] = scores.get(ev.intent, 0) + delta
    if ev.sub_intent:
        sub_scores[ev.sub_intent] = sub_scores.get(ev.sub_intent, 0) + delta

    sess.intent_scores = scores
    sess.sub_intent_scores = sub_scores
    sess.parent_intent = resolve_parent_intent(scores)
    sess.sub_intent = resolve_sub_intent(sub_scores)
    sess.last_seen_at = datetime.now(timezone.utc)


# ---------- Lifespan ----------
@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        await seed_db()
        await seed_portal()
    except Exception:
        logger.exception("Seed failed")
    yield


app = FastAPI(title="Veterinary Site Template API", lifespan=lifespan)
api = APIRouter(prefix="/api")


# ---------- Health ----------
@api.get("/")
async def root():
    return {"service": "veterinary-site-template", "status": "ok"}


@api.get("/health")
async def health():
    return {"status": "ok"}


# ---------- Session / Signals (public) ----------
@api.post("/sessions/init", response_model=SessionOut)
async def init_session(payload: SessionInitRequest, db: AsyncSession = Depends(get_db)):
    sess = await _ensure_session(db, payload.existing_token)
    if payload.referrer and not sess.first_referrer:
        sess.first_referrer = payload.referrer
    if payload.user_agent and not sess.user_agent:
        sess.user_agent = payload.user_agent
    sess.last_seen_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(sess)
    return SessionOut.model_validate(sess)


@api.post("/signals/track", response_model=SessionOut)
async def track_signal(payload: SignalTrackRequest, db: AsyncSession = Depends(get_db)):
    sess = await _ensure_session(db, payload.session_token)
    ev = SignalEvent(
        session_id=sess.id,
        signal_type=payload.signal_type,
        page_path=payload.page_path,
        label=payload.label,
        intent=payload.intent,
        sub_intent=payload.sub_intent,
        strength=payload.strength,
        meta=payload.meta,
    )
    db.add(ev)
    _apply_signal(sess, ev)
    await db.commit()
    await db.refresh(sess)
    return SessionOut.model_validate(sess)


@api.get("/sessions/me", response_model=SessionOut)
async def get_my_session(token: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(VisitorSession).where(VisitorSession.session_token == token))
    sess = res.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="session not found")
    return SessionOut.model_validate(sess)


# ---------- Surfaces (public content resolution) ----------
@api.get("/surfaces/{slug}/content", response_model=SurfaceContentResponse)
async def get_surface_content(
    slug: str,
    session_token: str | None = None,
    force_intent: str | None = None,
    force_sub_intent: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Surface).options(selectinload(Surface.switches)).where(Surface.slug == slug)
    )
    surface = res.scalar_one_or_none()
    if not surface or not surface.active:
        raise HTTPException(status_code=404, detail="surface not found")

    sess: VisitorSession | None = None
    if session_token:
        res = await db.execute(
            select(VisitorSession).where(VisitorSession.session_token == session_token)
        )
        sess = res.scalar_one_or_none()

    # force_intent is used by pet-specific pages (e.g. dog service details) that
    # MUST show their animal's CTA regardless of the visitor's accumulated signals.
    intent = force_intent or (sess.parent_intent if sess else None)
    sub_intent = force_sub_intent or (sess.sub_intent if sess else None)
    page_views = sess.page_view_count if sess else 0

    match = match_switch(surface.switches, intent, sub_intent, page_views)
    if match:
        return SurfaceContentResponse(
            surface_slug=slug,
            matched_switch_id=match.id,
            matched_switch_name=match.name,
            content=match.content or surface.default_content or {},
            inferred_intent=intent,
            inferred_sub_intent=sub_intent,
        )
    return SurfaceContentResponse(
        surface_slug=slug,
        matched_switch_id=None,
        matched_switch_name=None,
        content=surface.default_content or {},
        inferred_intent=intent,
        inferred_sub_intent=sub_intent,
    )


# ---------- Leads (public submit) ----------
INTENT_LABELS = {"dogs": "Dogs", "cats": "Cats", "critters": "Small & Exotic Pets"}
SUB_INTENT_LABELS = {
    "new_puppy": "New puppy care",
    "new_kitten": "New kitten care",
    "wellness": "Routine wellness",
    "health_concerns": "Illness or injury concern",
    "senior": "Senior pet care",
    "treatments": "Specific treatments (dental / surgery / laser)",
    "husbandry": "Habitat and diet guidance",
}


async def _generate_lead_narrative(
    lead: LeadSubmission,
    sess: VisitorSession | None,
    trail: list[dict],
) -> str | None:
    """Use the LLM to turn the signal trail + form data into a short, human-readable summary."""
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        return None

    parent = (sess.parent_intent if sess else None) or lead.pet_type
    sub = sess.sub_intent if sess else None
    parent_label = INTENT_LABELS.get(parent or "", parent or "unknown")
    sub_label = SUB_INTENT_LABELS.get(sub or "", sub or "none")

    pages_visited: list[str] = []
    clicks: list[str] = []
    chat_snippets: list[str] = []
    for ev in trail:
        if ev.get("signal_type") == "page_view" and ev.get("page_path"):
            pages_visited.append(ev["page_path"])
        elif ev.get("signal_type") in ("cta_click", "service_click", "nav_click") and ev.get("label"):
            clicks.append(ev["label"])
        elif ev.get("signal_type") == "chat_intent" and ev.get("label"):
            chat_snippets.append(ev["label"])

    trail_desc = {
        "parent_intent": parent_label,
        "sub_intent": sub_label,
        "pages_visited": pages_visited[:15],
        "clicks_and_selections": clicks[:15],
        "chat_topics": chat_snippets[:5],
        "total_events": len(trail),
    }

    user_prompt = f"""Write a concise 1-2 paragraph narrative summary (not a list) describing this visitor's experience on Collins Hospital for Animals's website before submitting the contact form. Write it in third person, present tense, warm but factual. Mention which animal(s) they focused on, what specific concerns or services drew their attention, and the reason they've reached out now. If they chatted with the bot, weave that in naturally. Do not use bullet points or em-dashes.

Visitor session data:
{json.dumps(trail_desc, indent=2)}

Form they just submitted:
- Name: {lead.name}
- Pet: {lead.pet_name or 'unspecified'} ({lead.pet_type or 'unspecified'})
- Reason for visit: {lead.service_interest or 'not specified'}
- Preferred time: {lead.preferred_time or 'flexible'}
- Their note: {lead.comment or '(none)'}

Return only the narrative. No preface, no headings."""

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key)
        completion = await client.chat.completions.create(
            model=os.environ.get("LEAD_NARRATIVE_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": "You produce short, honest, readable summaries of website visitor journeys for a veterinary clinic's front desk team. Never invent details that are not supported by the data."},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=300,
        )
        reply = completion.choices[0].message.content or ""
        return reply.strip() if reply else None
    except Exception:
        logger.exception("lead narrative LLM call failed")
        return None


@api.post("/leads", response_model=LeadOut)
async def create_lead(payload: LeadCreateRequest, db: AsyncSession = Depends(get_db)):
    sess: VisitorSession | None = None
    if payload.session_token:
        res = await db.execute(
            select(VisitorSession).where(VisitorSession.session_token == payload.session_token)
        )
        sess = res.scalar_one_or_none()

    trail: list[dict] = []
    summary: dict = {}
    if sess:
        ev_res = await db.execute(
            select(SignalEvent)
            .where(SignalEvent.session_id == sess.id)
            .order_by(SignalEvent.created_at)
            .limit(50)
        )
        events = ev_res.scalars().all()
        trail = [
            {
                "signal_type": e.signal_type,
                "page_path": e.page_path,
                "label": e.label,
                "intent": e.intent,
                "sub_intent": e.sub_intent,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ]
        summary = {
            "parent_intent": sess.parent_intent,
            "sub_intent": sess.sub_intent,
            "intent_scores": sess.intent_scores or {},
            "sub_intent_scores": sess.sub_intent_scores or {},
            "page_views": sess.page_view_count or 0,
            "first_referrer": sess.first_referrer,
            "session_id": sess.id,
        }

    lead = LeadSubmission(
        session_id=sess.id if sess else None,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        pet_name=payload.pet_name,
        pet_type=payload.pet_type,
        service_interest=payload.service_interest,
        comment=payload.comment,
        preferred_time=payload.preferred_time,
        source_page=payload.source_page,
        intent_summary=summary,
        signal_trail=trail,
    )
    db.add(lead)
    # Also track a form_submit signal to boost intent weight
    if sess:
        submit_ev = SignalEvent(
            session_id=sess.id,
            signal_type="form_submit",
            page_path=payload.source_page,
            label=f"lead:{payload.service_interest or 'general'}",
            intent=payload.pet_type if payload.pet_type in ("dogs", "cats", "critters") else None,
            strength=2,
        )
        db.add(submit_ev)
        _apply_signal(sess, submit_ev)

    await db.commit()
    await db.refresh(lead)

    # Build a natural-language summary of the visitor's journey using the LLM.
    try:
        summary_text = await _generate_lead_narrative(lead, sess, trail)
        if summary_text:
            lead.narrative_summary = summary_text
            await db.commit()
            await db.refresh(lead)
    except Exception:
        logger.exception("Lead narrative generation failed (non-fatal)")

    # Build notification payload
    lead_data = {
        "id": lead.id,
        "name": lead.name,
        "email": lead.email,
        "phone": lead.phone,
        "pet_name": lead.pet_name,
        "pet_type": lead.pet_type,
        "service_interest": lead.service_interest,
        "comment": lead.comment,
        "preferred_time": lead.preferred_time,
        "source_page": lead.source_page,
        "intent_summary": lead.intent_summary,
        "signal_trail": lead.signal_trail,
        "narrative_summary": lead.narrative_summary,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
    }

    # Fire-and-forget email
    try:
        send_lead_notification(lead_data)
    except Exception:
        logger.exception("Email notification failed (non-fatal)")

    # Fire webhooks
    try:
        await _fire_webhooks("lead_created", lead_data, db)
    except Exception:
        logger.exception("Webhook firing failed (non-fatal)")

    return LeadOut.model_validate(lead)


# ---------- Admin auth ----------
@api.post("/admin/login", response_model=TokenResponse)
async def admin_login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = res.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not an admin")
    token = create_access_token(subject=user.id, extra={"email": user.email, "role": user.role})
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "email": user.email, "name": user.name, "role": user.role},
    )


@api.get("/admin/me")
async def admin_me(current=Depends(get_current_admin)):
    return {"id": current.id, "email": current.email, "name": current.name, "role": current.role}


# ---------- Admin: Surfaces ----------
@api.get("/admin/surfaces", response_model=list[SurfaceOut])
async def list_surfaces(
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Surface).options(selectinload(Surface.switches)).order_by(Surface.page, Surface.slug)
    )
    return [SurfaceOut.model_validate(s) for s in res.scalars().all()]


@api.post("/admin/surfaces", response_model=SurfaceOut)
async def create_surface(
    payload: SurfaceCreate,
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    surface = Surface(**payload.model_dump())
    db.add(surface)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=400, detail="slug must be unique")
    await db.refresh(surface)
    res = await db.execute(
        select(Surface).options(selectinload(Surface.switches)).where(Surface.id == surface.id)
    )
    return SurfaceOut.model_validate(res.scalar_one())


@api.patch("/admin/surfaces/{surface_id}", response_model=SurfaceOut)
async def update_surface(
    surface_id: str,
    payload: SurfaceUpdate,
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Surface).options(selectinload(Surface.switches)).where(Surface.id == surface_id)
    )
    surface = res.scalar_one_or_none()
    if not surface:
        raise HTTPException(status_code=404, detail="not found")
    data = payload.model_dump(exclude_none=True)
    for k, v in data.items():
        setattr(surface, k, v)
    await db.commit()
    await db.refresh(surface)
    return SurfaceOut.model_validate(surface)


@api.delete("/admin/surfaces/{surface_id}")
async def delete_surface(
    surface_id: str,
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Surface).where(Surface.id == surface_id))
    surface = res.scalar_one_or_none()
    if not surface:
        raise HTTPException(status_code=404, detail="not found")
    await db.delete(surface)
    await db.commit()
    return {"ok": True}


# ---------- Admin: Switches ----------
@api.post("/admin/switches", response_model=SwitchOut)
async def create_switch(
    payload: SwitchCreate,
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Surface).where(Surface.id == payload.surface_id))
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="surface not found")
    sw = Switch(**payload.model_dump())
    db.add(sw)
    await db.commit()
    await db.refresh(sw)
    return SwitchOut.model_validate(sw)


@api.patch("/admin/switches/{switch_id}", response_model=SwitchOut)
async def update_switch(
    switch_id: str,
    payload: SwitchUpdate,
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Switch).where(Switch.id == switch_id))
    sw = res.scalar_one_or_none()
    if not sw:
        raise HTTPException(status_code=404, detail="not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(sw, k, v)
    await db.commit()
    await db.refresh(sw)
    return SwitchOut.model_validate(sw)


@api.delete("/admin/switches/{switch_id}")
async def delete_switch(
    switch_id: str,
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Switch).where(Switch.id == switch_id))
    sw = res.scalar_one_or_none()
    if not sw:
        raise HTTPException(status_code=404, detail="not found")
    await db.delete(sw)
    await db.commit()
    return {"ok": True}


# ---------- Admin: Leads ----------
@api.get("/admin/leads", response_model=list[LeadOut])
async def list_leads(
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = 200,
):
    res = await db.execute(
        select(LeadSubmission).order_by(desc(LeadSubmission.created_at)).limit(limit)
    )
    return [LeadOut.model_validate(l) for l in res.scalars().all()]


@api.get("/admin/leads/{lead_id}", response_model=LeadOut)
async def get_lead(
    lead_id: str,
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(LeadSubmission).where(LeadSubmission.id == lead_id))
    lead = res.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="not found")
    return LeadOut.model_validate(lead)


@api.patch("/admin/leads/{lead_id}", response_model=LeadOut)
async def update_lead_status(
    lead_id: str,
    payload: LeadStatusUpdate,
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(LeadSubmission).where(LeadSubmission.id == lead_id))
    lead = res.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="not found")
    lead.status = payload.status
    await db.commit()
    await db.refresh(lead)
    return LeadOut.model_validate(lead)


# ---------- Admin: Sessions / Analytics ----------
@api.get("/admin/sessions", response_model=list[VisitorSessionOut])
async def list_sessions(
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = 100,
):
    res = await db.execute(
        select(VisitorSession).order_by(desc(VisitorSession.last_seen_at)).limit(limit)
    )
    sessions = res.scalars().all()
    out = []
    for s in sessions:
        cnt_res = await db.execute(
            select(func.count(SignalEvent.id)).where(SignalEvent.session_id == s.id)
        )
        count = cnt_res.scalar() or 0
        item = VisitorSessionOut.model_validate(s)
        item.event_count = count
        out.append(item)
    return out


@api.get("/admin/sessions/{session_id}/events", response_model=list[SignalEventOut])
async def list_session_events(
    session_id: str,
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(SignalEvent).where(SignalEvent.session_id == session_id).order_by(SignalEvent.created_at)
    )
    return [SignalEventOut.model_validate(e) for e in res.scalars().all()]


@api.get("/admin/analytics/overview", response_model=AnalyticsOverview)
async def analytics_overview(
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    total_sessions = (await db.execute(select(func.count(VisitorSession.id)))).scalar() or 0
    total_leads = (await db.execute(select(func.count(LeadSubmission.id)))).scalar() or 0
    total_signals = (await db.execute(select(func.count(SignalEvent.id)))).scalar() or 0
    since = datetime.now(timezone.utc) - timedelta(days=7)
    leads_7d = (
        await db.execute(select(func.count(LeadSubmission.id)).where(LeadSubmission.created_at >= since))
    ).scalar() or 0

    intent_res = await db.execute(
        select(VisitorSession.parent_intent, func.count(VisitorSession.id)).group_by(
            VisitorSession.parent_intent
        )
    )
    intent_breakdown: dict[str, int] = {}
    for intent, count in intent_res.all():
        intent_breakdown[intent or "unknown"] = count

    sub_res = await db.execute(
        select(VisitorSession.sub_intent, func.count(VisitorSession.id)).group_by(VisitorSession.sub_intent)
    )
    sub_breakdown: dict[str, int] = {}
    for sub, count in sub_res.all():
        sub_breakdown[sub or "unknown"] = count

    pages_res = await db.execute(
        select(SignalEvent.page_path, func.count(SignalEvent.id))
        .where(SignalEvent.signal_type == "page_view")
        .group_by(SignalEvent.page_path)
        .order_by(desc(func.count(SignalEvent.id)))
        .limit(10)
    )
    top_pages = [{"page": p or "/", "views": c} for p, c in pages_res.all()]

    return AnalyticsOverview(
        total_sessions=total_sessions,
        total_leads=total_leads,
        total_signals=total_signals,
        leads_last_7d=leads_7d,
        intent_breakdown=intent_breakdown,
        sub_intent_breakdown=sub_breakdown,
        top_pages=top_pages,
    )


# ---------- Webhook helpers ----------
import httpx

async def _fire_webhooks(event_type: str, payload: dict, db: AsyncSession):
    """Fire all active webhooks for the given event type."""
    res = await db.execute(
        select(WebhookConfig).where(
            WebhookConfig.event_type == event_type,
            WebhookConfig.active == True,
        )
    )
    hooks = res.scalars().all()
    for hook in hooks:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    hook.url,
                    json=payload,
                    headers={
                        "Content-Type": "application/json",
                        "X-Webhook-Event": event_type,
                        **hook.headers,
                    },
                )
            hook.last_fired_at = datetime.now(timezone.utc)
            hook.last_status_code = resp.status_code
            hook.last_error = None if resp.is_success else resp.text[:500]
        except Exception as exc:
            hook.last_fired_at = datetime.now(timezone.utc)
            hook.last_status_code = None
            hook.last_error = str(exc)[:500]
            logger.warning(f"Webhook {hook.name} failed: {exc}")
    if hooks:
        await db.commit()


# ---------- Admin: Webhooks ----------
@api.get("/admin/webhooks", response_model=list[WebhookOut])
async def list_webhooks(
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(WebhookConfig).order_by(WebhookConfig.created_at))
    return [WebhookOut.model_validate(w) for w in res.scalars().all()]


@api.post("/admin/webhooks", response_model=WebhookOut, status_code=201)
async def create_webhook(
    payload: WebhookCreate,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    hook = WebhookConfig(
        name=payload.name,
        url=payload.url,
        event_type=payload.event_type,
        headers=payload.headers,
        active=payload.active,
    )
    db.add(hook)
    await db.commit()
    await db.refresh(hook)
    return WebhookOut.model_validate(hook)


@api.patch("/admin/webhooks/{webhook_id}", response_model=WebhookOut)
async def update_webhook(
    webhook_id: str,
    payload: WebhookUpdate,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(WebhookConfig).where(WebhookConfig.id == webhook_id))
    hook = res.scalar_one_or_none()
    if not hook:
        raise HTTPException(404, "Webhook not found")
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(hook, field, val)
    await db.commit()
    await db.refresh(hook)
    return WebhookOut.model_validate(hook)


@api.delete("/admin/webhooks/{webhook_id}", status_code=204)
async def delete_webhook(
    webhook_id: str,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(WebhookConfig).where(WebhookConfig.id == webhook_id))
    hook = res.scalar_one_or_none()
    if not hook:
        raise HTTPException(404, "Webhook not found")
    await db.delete(hook)
    await db.commit()


@api.post("/admin/webhooks/{webhook_id}/test", response_model=WebhookTestResponse)
async def test_webhook(
    webhook_id: str,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(WebhookConfig).where(WebhookConfig.id == webhook_id))
    hook = res.scalar_one_or_none()
    if not hook:
        raise HTTPException(404, "Webhook not found")
    test_payload = {
        "event": "test",
        "message": "This is a test webhook from Veterinary Site Template.",
        "webhook_name": hook.name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                hook.url,
                json=test_payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Webhook-Event": "test",
                    **hook.headers,
                },
            )
        hook.last_fired_at = datetime.now(timezone.utc)
        hook.last_status_code = resp.status_code
        hook.last_error = None if resp.is_success else resp.text[:500]
        await db.commit()
        return WebhookTestResponse(
            success=resp.is_success,
            status_code=resp.status_code,
            error=None if resp.is_success else resp.text[:500],
        )
    except Exception as exc:
        hook.last_fired_at = datetime.now(timezone.utc)
        hook.last_status_code = None
        hook.last_error = str(exc)[:500]
        await db.commit()
        return WebhookTestResponse(success=False, error=str(exc)[:500])


# ---------- Chatbot ----------
DEFAULT_SYSTEM_PROMPT = """You are the virtual assistant for Collins Hospital for Animals in Washington, DC. You help visitors learn about the hospital, answer common veterinary care questions, and guide them to call for appointments.

CLINIC INFO:
- Practice: Collins Hospital for Animals
- Address: 1808 Wisconsin Ave NW, Washington, DC 20007
- Phone: (202) 659-8830
- Public email: no public email found on the source site, direct visitors to call or use online forms/contact pages.
- Website: https://www.collinsanimalhospital.net
- Demo URL: https://cha.rclintegrated.com
- Hours by appointment only: Monday 8:00 AM-7:00 PM, Tuesday 8:00 AM-7:00 PM, Wednesday 9:00 AM-3:00 PM, Thursday 8:00 AM-7:00 PM, Friday 8:00 AM-7:00 PM, Saturday closed, Sunday closed.
- History: Collins Hospital for Animals has provided veterinary care to the District of Columbia community since 1917.
- Ownership context: source site says Dr. Lynne D. Cabaniss bought the practice in 1987, and as of January 2026 it is owned and operated by Dr. Kristen Fischer.
- Veterinarians listed on the source site: Dr. Lynne D. Cabaniss, V.M.D.; Dr. Abby Littleton, V.M.D.; Dr. Kristen Fischer, V.M.D.

ANIMALS WE TREAT:
- Dogs and cats.
- Rabbits and guinea pigs, small rodents, birds, and reptiles. Exotic pets are seen by specific veterinarians only, so callers should confirm availability.

SERVICES:
- Full-service wellness and sick-pet exams, urgent/work-in appointments during normal hospital hours when possible, technician appointments for routine services, drop-off services, in-house and outside laboratory testing, digital radiography, surgery, dentistry including rabbit and rodent dentistry, international and domestic health certificates, ISO-compatible microchips, boarding, and daycare.
- Emergency guidance: Collins has personnel on duty five days a week but does not always have a veterinarian on premises. For life-threatening emergencies, tell visitors to call first; if Collins is not properly staffed they may refer to the closest emergency hospital.

CLIENT PORTAL: logged-in demo clients can view pet records at /portal/login.

TONE: Warm, professional, concise, a trusted DC veterinary hospital. Never use em-dashes. Use 2-4 sentences for most replies.

BOOKING FLOW:
Appointments are scheduled Monday through Friday by the receptionist team by calling (202) 659-8830. If a visitor wants to book in chat, collect their name, phone, email, pet name/species, reason for visit, and preferred day/time, then explain that Collins will call to confirm. Do not promise a confirmed appointment time.

After you have collected ALL SIX fields and confirmed them back to the visitor, finish your reply with EXACTLY this marker block on its own line at the very end (no code fences, no quotes around it):

<<BOOKING>>{"client_name":"...","client_phone":"...","client_email":"...","pet_name":"...","pet_breed":"...","preferred_time":"...","notes":"brief reason for visit or wellness if unspecified"}<<END>>

The marker must be valid JSON on a single line. Do not emit the marker until you have all six fields. Before the marker, write a short friendly confirmation sentence. Do not mention the marker to the visitor."""

DEFAULT_GUARDRAILS = """RULES:
- Only answer questions related to Collins Hospital for Animals, pet care, veterinary medicine, or appointment guidance.
- If someone asks about unrelated topics, politely redirect to pet care or Collins Hospital for Animals.
- Never provide specific medical diagnoses. For medical concerns, recommend a visit or, for urgent signs, calling (202) 659-8830 right away.
- Never discuss pricing specifics. Say Collins can provide accurate pricing by phone at (202) 659-8830 or at check-in.
- Do not make up doctors, services, emails, pricing, or appointment availability.
- For exotic pets, say they are seen by specific veterinarians only and recommend calling to confirm availability.
- Keep responses concise, 2-4 sentences for simple questions.
- Never use em-dashes. Use commas, hyphens, colons, or periods."""


async def _get_chatbot_config(db: AsyncSession) -> ChatbotConfig:
    res = await db.execute(select(ChatbotConfig).limit(1))
    config = res.scalar_one_or_none()
    if not config:
        config = ChatbotConfig(
            system_prompt=DEFAULT_SYSTEM_PROMPT,
            guardrails=DEFAULT_GUARDRAILS,
            training_context="",
            provider=os.environ.get("CHATBOT_PROVIDER", "openai"),
            model=os.environ.get("CHATBOT_MODEL", "gpt-4o-mini"),
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config


@api.post("/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest, db: AsyncSession = Depends(get_db)):
    config = await _get_chatbot_config(db)
    if not config.active:
        return ChatResponse(reply="Chat is currently unavailable. Please call us at (202) 659-8830.", session_token=payload.session_token)

    parts = [config.system_prompt]
    if config.training_context:
        parts.append(f"\nADDITIONAL TRAINING CONTEXT:\n{config.training_context}")
    if config.guardrails:
        parts.append(f"\n{config.guardrails}")
    system_msg = "\n".join(parts)

    hist_res = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_token == payload.session_token)
        .order_by(ChatMessage.created_at.desc())
        .limit(20)
    )
    history = list(reversed(hist_res.scalars().all()))

    messages = [{"role": "system", "content": system_msg}]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": payload.message})

    try:
        from openai import AsyncOpenAI
        api_key = os.environ.get("OPENAI_API_KEY", "")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        client = AsyncOpenAI(api_key=api_key)
        completion = await client.chat.completions.create(
            model=os.environ.get("CHATBOT_MODEL", config.model or "gpt-4o-mini"),
            messages=messages,
            temperature=0.4,
            max_tokens=700,
        )
        reply = completion.choices[0].message.content or "Please call us at (202) 659-8830 and we'll be happy to help."
    except Exception as exc:
        logger.exception("Chatbot error")
        reply = "I'm having trouble right now. Please call us at (202) 659-8830 and we'll be happy to help."

    # --- Detect and persist an in-chat booking ---
    booking_saved = False
    booking_error = None
    match = re.search(r"<<BOOKING>>(.+?)<<END>>", reply, flags=re.DOTALL)
    if match:
        raw_json = match.group(1).strip()
        try:
            data = json.loads(raw_json)
            required = ("client_name", "client_phone", "client_email", "pet_name", "pet_breed", "preferred_time")
            if all(data.get(k) for k in required):
                booking = ChatBooking(
                    session_token=payload.session_token,
                    client_name=str(data["client_name"])[:160],
                    client_phone=str(data["client_phone"])[:64],
                    client_email=str(data["client_email"])[:255],
                    pet_name=str(data["pet_name"])[:120],
                    pet_breed=str(data["pet_breed"])[:160],
                    preferred_time=str(data["preferred_time"])[:160],
                    notes=str(data.get("notes") or "")[:2000] or None,
                )
                db.add(booking)
                booking_saved = True
            else:
                booking_error = "missing_required_fields"
        except Exception as exc:
            logger.exception("Booking parse failed")
            booking_error = str(exc)[:200]
        # Strip the marker block from the visitor-facing reply regardless
        reply = re.sub(r"\s*<<BOOKING>>.+?<<END>>\s*", "", reply, flags=re.DOTALL).strip()
        if booking_saved:
            reply = (reply + "\n\nâœ“ Booking received. We'll call you shortly to confirm.").strip()

    # Save messages
    db.add(ChatMessage(session_token=payload.session_token, role="user", content=payload.message))
    db.add(ChatMessage(session_token=payload.session_token, role="assistant", content=reply))

    # --- Detect intent from conversation and fire signals ---
    combined = f"{payload.message} {reply}".lower()
    detected_intent = None
    detected_sub = None

    # Parent intent detection
    dog_kw = ("dog", "puppy", "puppies", "canine", "pup ", "pups", "golden retriever", "labrador", "beagle", "terrier", "bulldog", "shepherd")
    cat_kw = ("cat", "kitten", "kittens", "feline", "kitty", "kitties", "tabby")
    critter_kw = ("rabbit", "bunny", "guinea pig", "hamster", "exotic", "small mammal", "reptile", "bird", "ferret")

    dog_hits = sum(1 for kw in dog_kw if kw in combined)
    cat_hits = sum(1 for kw in cat_kw if kw in combined)
    critter_hits = sum(1 for kw in critter_kw if kw in combined)

    if dog_hits > cat_hits and dog_hits > critter_hits and dog_hits > 0:
        detected_intent = "dogs"
    elif cat_hits > dog_hits and cat_hits > critter_hits and cat_hits > 0:
        detected_intent = "cats"
    elif critter_hits > 0:
        detected_intent = "critters"

    # Sub-intent detection
    sub_kw_map = {
        "new_puppy": ("new puppy", "puppy visit", "first puppy", "just got a puppy", "adopted a puppy", "puppy vaccine"),
        "new_kitten": ("new kitten", "kitten visit", "first kitten", "just got a kitten", "adopted a kitten", "kitten vaccine"),
        "senior": ("senior", "older dog", "older cat", "aging", "arthritis", "joint", "mobility", "stiff"),
        "health_concerns": ("sick", "emergency", "vomiting", "diarrhea", "not eating", "lethargic", "bleeding", "pain", "limping", "swelling", "lump", "breathing", "cough"),
        "treatments": ("dental", "surgery", "spay", "neuter", "laser", "prp", "cleaning", "extraction", "procedure"),
        "wellness": ("wellness", "checkup", "check-up", "vaccine", "annual", "exam", "prevention", "parasite", "flea", "tick", "heartworm"),
    }
    for sub_key, keywords in sub_kw_map.items():
        if any(kw in combined for kw in keywords):
            detected_sub = sub_key
            break

    # Fire signal into the visitor session if we detected intent
    if detected_intent:
        sess = None
        if payload.session_token:
            res = await db.execute(
                select(VisitorSession).where(VisitorSession.session_token == payload.session_token)
            )
            sess = res.scalar_one_or_none()
        if sess:
            ev = SignalEvent(
                session_id=sess.id,
                signal_type="chat_intent",
                page_path="/chat",
                label=f"chat:{payload.message[:80]}",
                intent=detected_intent,
                sub_intent=detected_sub,
                strength=3,  # base strength 3 x multiplier 8 = 24 points per chat message
            )
            db.add(ev)
            _apply_signal(sess, ev)

    await db.commit()

    return ChatResponse(reply=reply, session_token=payload.session_token)


@api.get("/admin/chatbot-config", response_model=ChatbotConfigOut)
async def get_chatbot_config(
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    config = await _get_chatbot_config(db)
    return ChatbotConfigOut.model_validate(config)


@api.patch("/admin/chatbot-config", response_model=ChatbotConfigOut)
async def update_chatbot_config(
    payload: ChatbotConfigUpdate,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    config = await _get_chatbot_config(db)
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(config, field, val)
    await db.commit()
    await db.refresh(config)
    return ChatbotConfigOut.model_validate(config)


# ---------- Admin: Chat Bookings ----------
@api.get("/admin/chat-bookings")
async def list_chat_bookings(
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(ChatBooking).order_by(desc(ChatBooking.created_at)).limit(200)
    )
    bookings = res.scalars().all()
    return [
        {
            "id": b.id,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "client_name": b.client_name,
            "client_phone": b.client_phone,
            "client_email": b.client_email,
            "pet_name": b.pet_name,
            "pet_breed": b.pet_breed,
            "preferred_time": b.preferred_time,
            "notes": b.notes,
            "status": b.status,
            "session_token": b.session_token,
        }
        for b in bookings
    ]


@api.patch("/admin/chat-bookings/{booking_id}")
async def update_chat_booking(
    booking_id: str,
    payload: dict,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(ChatBooking).where(ChatBooking.id == booking_id))
    booking = res.scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Booking not found")
    new_status = payload.get("status")
    if new_status in ("new", "confirmed", "cancelled"):
        booking.status = new_status
    await db.commit()
    return {"ok": True, "status": booking.status}


# ---------- Wire it up ----------
app.include_router(api)
app.include_router(portal_router, prefix="/api")
app.include_router(booking_router, prefix="/api")
app.include_router(nova_site_editor_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the React build when deployed as a single Railway service.
FRONTEND_BUILD_DIR = Path(__file__).resolve().parent.parent / "frontend" / "build"
if FRONTEND_BUILD_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_BUILD_DIR), html=True), name="frontend")
else:
    logger.warning("Frontend build directory not found at %s; API-only mode enabled", FRONTEND_BUILD_DIR)

