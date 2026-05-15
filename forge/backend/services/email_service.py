import os
import smtplib
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")


def _send(subject: str, html: str):
    if not all([SMTP_USER, SMTP_PASS, ADMIN_EMAIL]):
        print(f"[email] skipped (env not configured): {subject}")
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_USER
        msg["To"] = ADMIN_EMAIL
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.starttls()
            s.login(SMTP_USER, SMTP_PASS)
            s.sendmail(SMTP_USER, ADMIN_EMAIL, msg.as_string())
        print(f"[email] sent: {subject}")
    except Exception as e:
        print(f"[email] failed: {e}")


def send_flag_alert(triggered_by: str, reason: str, idea_title: str, idea_id: str,
                    reporter_username: str = None, reason_detail: str = None):
    if triggered_by == "user":
        subject = f"Crucible - User Report: {reason}"
        reporter_row = f"<tr><td style='color:#666;padding:6px 0;padding-right:24px'>Reported by</td><td><strong>{reporter_username or 'unknown'}</strong></td></tr>"
    else:
        subject = f"Crucible - Auto-flag: {reason}"
        reporter_row = "<tr><td style='color:#666;padding:6px 0;padding-right:24px'>Triggered by</td><td><strong>system</strong></td></tr>"

    detail_row = f"<tr><td style='color:#666;padding:6px 0;padding-right:24px'>Detail</td><td><strong>{reason_detail}</strong></td></tr>" if reason_detail else ""
    frontend_url = os.getenv("FRONTEND_URL", "")

    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#C46000;margin-top:0">Crucible Admin Alert</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
        <tr><td style="color:#666;padding:6px 0;padding-right:24px">Idea</td><td><strong>{idea_title}</strong></td></tr>
        <tr><td style="color:#666;padding:6px 0;padding-right:24px">Reason</td><td><strong style="color:#C00">{reason}</strong></td></tr>
        {detail_row}
        {reporter_row}
      </table>
      <a href="{frontend_url}/admin"
         style="background:#C46000;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
        Review in Admin Panel &rarr;
      </a>
    </div>
    """
    threading.Thread(target=_send, args=(subject, html), daemon=True).start()
