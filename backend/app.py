from contextlib import asynccontextmanager
import os
import sqlite3
from typing import Annotated

from fastapi import FastAPI, Form
from fastapi.responses import PlainTextResponse

from .notifications import send_quote_notification

DB_PATH = os.environ.get(
    "QUOTES_DB_PATH", "/home/paul/Projects/designandimplement/data/quotes.db"
)


def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS quotes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)


@asynccontextmanager
async def lifespan(app: FastAPI):
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

    send_quote_notification(name, email, phone, message)

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO quotes (name, email, phone, message)
            VALUES (?, ?, ?, ?)
            """,
            (name, email, phone, message)
        )

    

    return "Dziękujemy! Otrzymaliśmy Twoje zgłoszenie."


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=5000)
