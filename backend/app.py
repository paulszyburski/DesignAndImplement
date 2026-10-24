from contextlib import asynccontextmanager
import logging
import os
import smtplib
import sqlite3
from pathlib import Path
from typing import Annotated

from fastapi import FastAPI, Form
from fastapi.responses import PlainTextResponse

from .notifications import send_quote_notification

logger = logging.getLogger(__name__)

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "quotes.db"
DB_PATH = Path(os.environ.get("QUOTES_DB_PATH", DEFAULT_DB_PATH))


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS quotes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)


@app.post("/api/quote", response_class=PlainTextResponse)
def submit_quote(
    name: Annotated[str, Form(min_length=1)],
    email: Annotated[str, Form(min_length=1)],
    phone: Annotated[str, Form()] = "",
    message: Annotated[str, Form()] = "",
):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO quotes (name, email, phone, message)
            VALUES (?, ?, ?, ?)
            """,
            (name, email, phone, message),
        )

    try:
        send_quote_notification(name, email, phone, message)
    except (smtplib.SMTPException, OSError):
        logger.error("Quote saved, but notification email failed")

    return "Dziękujemy! Otrzymaliśmy Twoje zgłoszenie."


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=5000)
