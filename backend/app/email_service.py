"""Lightweight email helper.

If SMTP_HOST is set, sends real emails via smtplib.
Otherwise, prints the message to the application log (dev / staging fallback).
"""
import smtplib
from email.message import EmailMessage
from flask import current_app


def send_email(to_address, subject, body_text, body_html=None):
    cfg = current_app.config
    host = cfg.get('SMTP_HOST')
    port = cfg.get('SMTP_PORT')
    user = cfg.get('SMTP_USER')
    password = cfg.get('SMTP_PASSWORD')
    from_addr = cfg.get('SMTP_FROM') or 'no-reply@treknest.local'
    use_tls = cfg.get('SMTP_USE_TLS', True)

    if not host:
        current_app.logger.info(
            '[EMAIL — SMTP not configured, logging only]\n'
            'To: %s\nFrom: %s\nSubject: %s\n%s',
            to_address, from_addr, subject, body_text
        )
        return False

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = from_addr
    msg['To'] = to_address
    msg.set_content(body_text)
    if body_html:
        msg.add_alternative(body_html, subtype='html')

    try:
        if use_tls:
            with smtplib.SMTP(host, port, timeout=10) as smtp:
                smtp.starttls()
                if user and password:
                    smtp.login(user, password)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP_SSL(host, port, timeout=10) as smtp:
                if user and password:
                    smtp.login(user, password)
                smtp.send_message(msg)
        current_app.logger.info('Email sent to %s (subject: %s)', to_address, subject)
        return True
    except Exception as e:
        current_app.logger.exception('Failed to send email to %s: %s', to_address, e)
        return False
