"""Optional Nova Site Editor integration for template/client sites.

Prospecting demos can leave this unconfigured. Finalized client sites set the
EDIT_REQUEST_* env vars to submit admin change requests and attachments to Nova.
"""
from __future__ import annotations

import base64
import os
from datetime import datetime, timezone
from secrets import token_urlsafe
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_admin
from database import get_db
from models import SiteEditRequest

nova_site_editor = APIRouter(prefix="/nova-site-editor", tags=["nova-site-editor"])

DEFAULT_NOVA_INTAKE_URL = "https://nova-site-editor-production.up.railway.app/api/site-edit-request"
MAX_ATTACHMENT_BYTES = int(os.environ.get("EDIT_REQUEST_MAX_ATTACHMENT_BYTES", str(10 * 1024 * 1024)))


class NovaIntegrationStatus(BaseModel):
    enabled: bool
    configured: bool
    intakeUrl: str
    siteId: str | None = None
    siteKeyConfigured: bool = False
    callbackConfigured: bool = False
    publicSiteUrl: str | None = None
    notes: list[str] = []


class SiteEditRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    client_request_id: str
    nova_request_id: str | None = None
    nova_thread_id: str | None = None
    status: str
    title: str
    page_requested: str | None = None
    description: str
    submitter_name: str
    submitter_email: str
    approval_required: bool
    nova_response: dict = {}
    callback_payloads: list = []
    error: str | None = None
    created_at: datetime
    updated_at: datetime


def _env(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name, default)
    if value is None:
        return None
    value = value.strip()
    return value or None


def _settings() -> dict:
    return {
        "enabled": (_env("EDIT_REQUEST_ENABLED", "false") or "false").lower() in {"1", "true", "yes", "on"},
        "api_url": _env("EDIT_REQUEST_API_URL", DEFAULT_NOVA_INTAKE_URL),
        "site_id": _env("EDIT_REQUEST_SITE_ID"),
        "site_key": _env("EDIT_REQUEST_SITE_KEY"),
        "callback_auth": _env("EDIT_REQUEST_CALLBACK_AUTH"),
        "public_site_url": _env("PUBLIC_SITE_URL"),
        "client_name": _env("EDIT_REQUEST_CLIENT_NAME") or _env("SITE_NAME") or "Collins Hospital for Animals",
    }


def _integration_status() -> NovaIntegrationStatus:
    s = _settings()
    missing = []
    if not s["site_id"]:
        missing.append("EDIT_REQUEST_SITE_ID")
    if not s["site_key"]:
        missing.append("EDIT_REQUEST_SITE_KEY")
    if not s["public_site_url"]:
        missing.append("PUBLIC_SITE_URL")
    configured = not missing
    notes = []
    if not s["enabled"]:
        notes.append("Set EDIT_REQUEST_ENABLED=true when this finalized client site should submit requests to Nova.")
    if missing:
        notes.append("Missing required env vars: " + ", ".join(missing))
    if not s["callback_auth"]:
        notes.append("EDIT_REQUEST_CALLBACK_AUTH is recommended so Nova callbacks can be authenticated.")
    return NovaIntegrationStatus(
        enabled=s["enabled"],
        configured=configured,
        intakeUrl=s["api_url"],
        siteId=s["site_id"],
        siteKeyConfigured=bool(s["site_key"]),
        callbackConfigured=bool(s["callback_auth"]),
        publicSiteUrl=s["public_site_url"],
        notes=notes,
    )


async def _attachment_payload(files: list[UploadFile]) -> list[dict]:
    attachments: list[dict] = []
    for file in files:
        raw = await file.read()
        if not raw:
            continue
        if len(raw) > MAX_ATTACHMENT_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Attachment {file.filename} exceeds {MAX_ATTACHMENT_BYTES} bytes",
            )
        attachments.append(
            {
                "filename": file.filename or "attachment",
                "contentType": file.content_type or "application/octet-stream",
                "contentBase64": base64.b64encode(raw).decode("ascii"),
            }
        )
    return attachments


@nova_site_editor.get("/status", response_model=NovaIntegrationStatus)
async def status_endpoint(_admin=Depends(get_current_admin)):
    return _integration_status()


@nova_site_editor.get("/requests", response_model=list[SiteEditRequestOut])
async def list_requests(
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = 100,
):
    res = await db.execute(select(SiteEditRequest).order_by(desc(SiteEditRequest.created_at)).limit(limit))
    return [SiteEditRequestOut.model_validate(row) for row in res.scalars().all()]


@nova_site_editor.post("/requests", response_model=SiteEditRequestOut, status_code=201)
async def create_request(
    title: Annotated[str, Form()],
    description: Annotated[str, Form()],
    submitter_name: Annotated[str, Form()],
    submitter_email: Annotated[str, Form()],
    page_requested: Annotated[str | None, Form()] = None,
    approval_required: Annotated[bool, Form()] = True,
    files: Annotated[list[UploadFile], File(description="Optional screenshots/photos/PDFs")] = [],
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    status_info = _integration_status()
    if not status_info.enabled:
        raise HTTPException(status_code=400, detail="Nova Site Editor integration is disabled. Set EDIT_REQUEST_ENABLED=true for finalized sites.")
    if not status_info.configured:
        raise HTTPException(status_code=400, detail={"message": "Nova Site Editor integration is not configured", "notes": status_info.notes})

    s = _settings()
    attachments = await _attachment_payload(files)
    client_request_id = f"{s['site_id']}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{token_urlsafe(5)}"
    callback_url = None
    if s["public_site_url"]:
        callback_url = s["public_site_url"].rstrip("/") + "/api/nova-site-editor/callback"

    payload = {
        "siteId": s["site_id"],
        "siteKey": s["site_key"],
        "clientRequestId": client_request_id,
        "requestType": "new_edit",
        "submitter": {"name": submitter_name, "email": submitter_email},
        "clientName": s["client_name"],
        "website": s["public_site_url"],
        "title": title,
        "pageRequested": page_requested or "/admin",
        "description": description,
        "approvalRequired": approval_required,
        "images": [],
        "attachments": attachments,
        "meta": {"siteId": s["site_id"], "source": "vet-site-admin", "callbackUrl": callback_url},
        "callbackUrl": callback_url,
    }

    row = SiteEditRequest(
        client_request_id=client_request_id,
        status="submitting",
        title=title,
        page_requested=page_requested,
        description=description,
        submitter_name=submitter_name,
        submitter_email=submitter_email,
        approval_required=approval_required,
        nova_payload={**payload, "attachments": [{"filename": a["filename"], "contentType": a["contentType"]} for a in attachments]},
    )
    db.add(row)
    await db.flush()

    try:
        async with httpx.AsyncClient(timeout=45) as client:
            resp = await client.post(s["api_url"], json=payload)
        row.nova_response = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {"text": resp.text}
        if resp.status_code >= 400:
            row.status = "failed"
            row.error = f"Nova intake returned HTTP {resp.status_code}"
            await db.commit()
            raise HTTPException(status_code=502, detail={"message": row.error, "nova": row.nova_response})
        body = row.nova_response
        row.nova_request_id = body.get("requestId") or body.get("id")
        row.nova_thread_id = body.get("threadId")
        row.status = body.get("status") or "queued"
        await db.commit()
        await db.refresh(row)
        return SiteEditRequestOut.model_validate(row)
    except HTTPException:
        raise
    except Exception as exc:
        row.status = "failed"
        row.error = str(exc)
        await db.commit()
        raise HTTPException(status_code=502, detail=f"Failed to submit to Nova Site Editor: {exc}")


@nova_site_editor.post("/callback")
async def nova_callback(
    payload: dict,
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
):
    expected = _settings().get("callback_auth")
    if expected:
        if authorization != f"Bearer {expected}":
            raise HTTPException(status_code=401, detail="Invalid callback authorization")

    client_request_id = payload.get("clientRequestId") or payload.get("client_request_id")
    nova_request_id = payload.get("requestId") or payload.get("request_id") or payload.get("id")
    row = None
    if client_request_id:
        res = await db.execute(select(SiteEditRequest).where(SiteEditRequest.client_request_id == client_request_id))
        row = res.scalar_one_or_none()
    if not row and nova_request_id:
        res = await db.execute(select(SiteEditRequest).where(SiteEditRequest.nova_request_id == nova_request_id))
        row = res.scalar_one_or_none()
    if row:
        row.status = payload.get("status") or row.status
        row.callback_payloads = [*(row.callback_payloads or []), payload]
        await db.commit()
    return {"ok": True, "matched": bool(row)}
