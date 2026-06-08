"""SendGrid email helper. Silently skips if SENDGRID_API_KEY is not configured."""
from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)


def send_lead_notification(lead: dict) -> bool:
    """Send a lead-notification email via SendGrid.
    Returns True if sent, False if skipped or failed (never raises)."""
    api_key = os.environ.get("SENDGRID_API_KEY", "").strip()
    to_email = os.environ.get("LEAD_NOTIFICATION_EMAIL", "").strip()
    from_email = os.environ.get("SENDGRID_FROM_EMAIL", "no-reply@cha.rclintegrated.com").strip()

    if not api_key or not to_email:
        logger.info("SendGrid not configured -- skipping email for lead %s", lead.get("id"))
        return False

    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        subject = f"New lead from Smart Site: {lead.get('name', 'Unknown')}"
        intent = lead.get("intent_summary", {}) or {}
        trail = lead.get("signal_trail", []) or []

        intent_html = "<ul>"
        for k, v in intent.items():
            intent_html += f"<li><strong>{k}:</strong> {v}</li>"
        intent_html += "</ul>"

        trail_html = "<ol>"
        for ev in trail[-20:]:
            trail_html += (
                f"<li>{ev.get('created_at', '')} &mdash; "
                f"<em>{ev.get('signal_type', '')}</em> "
                f"{ev.get('label') or ev.get('page_path') or ''}</li>"
            )
        trail_html += "</ol>"

        html = f"""
        <h2>New Lead from Veterinary Site Template</h2>
        <p><strong>Name:</strong> {lead.get('name', '')}</p>
        <p><strong>Email:</strong> {lead.get('email', '')}</p>
        <p><strong>Phone:</strong> {lead.get('phone', '')}</p>
        <p><strong>Pet:</strong> {lead.get('pet_name', '')} ({lead.get('pet_type', '')})</p>
        <p><strong>Service of interest:</strong> {lead.get('service_interest', '')}</p>
        <p><strong>Preferred time:</strong> {lead.get('preferred_time', '')}</p>
        <p><strong>Source page:</strong> {lead.get('source_page', '')}</p>
        <p><strong>Comment:</strong><br/>{lead.get('comment', '') or ''}</p>
        <hr/>
        <h3>Intent Summary</h3>
        {intent_html}
        <h3>Signal Trail (last 20)</h3>
        {trail_html}
        """

        message = Mail(
            from_email=from_email,
            to_emails=to_email,
            subject=subject,
            html_content=html,
        )
        SendGridAPIClient(api_key).send(message)
        logger.info("Sent lead notification email for %s", lead.get("id"))
        return True
    except Exception as exc:  # noqa: BLE001
        logger.exception("SendGrid send failed: %s", exc)
        return False
