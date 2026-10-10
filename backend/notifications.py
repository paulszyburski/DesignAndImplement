import smtplib
import ssl
from email.message import EmailMessage

from .config import SMTP_USER, SMTP_APP_PASSWORD, OWNER_EMAIL

def send_quote_notification(name, email, phone="", message_text=""):
    message = EmailMessage()
    message["Subject"] = "New quote request"
    message["From"] = SMTP_USER
    message["To"] = OWNER_EMAIL

    body = (
        "Nowe zapytanie o wycenę ze strony internetowej.\n\n"
        f"Imię i nazwisko: {name}\n"
        f"E-mail: {email}\n"
        f"Telefon: {phone or 'Nie podano'}\n\n"
        f"Wiadomość:\n{message_text or 'Nie podano'}\n"
    )

    message.set_content(body)

    with smtplib.SMTP_SSL(
        "smtp.gmail.com",
        465,
        context=ssl.create_default_context(),
        timeout=10,
    ) as smtp:
        smtp.login(SMTP_USER, SMTP_APP_PASSWORD)
        smtp.send_message(message)

if __name__ == "__main__":
    send_quote_notification(
        name="Test Customer",
        email="customer@example.com",
        phone="Test phone",
    )