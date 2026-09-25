from flask import Flask, request
import sqlite3

app = Flask(__name__)

DB_PATH = "/home/paul/Projects/designandimplement/data/quotes.db"


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


@app.post("/api/quote")
def submit_quote():
    name = request.form["name"]
    email = request.form["email"]
    phone = request.form.get("phone", "")
    message = request.form.get("message", "")

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
    init_db()
    app.run(host="127.0.0.1", port=5000)