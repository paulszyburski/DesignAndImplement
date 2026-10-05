import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend import app as backend


class QuoteTests(unittest.TestCase):
    def test_form_submission_and_existing_records(self):
        with tempfile.TemporaryDirectory() as directory:
            database = str(Path(directory) / "quotes.db")
            with patch.object(backend, "DB_PATH", database):
                backend.init_db()
                with sqlite3.connect(database) as connection:
                    connection.execute(
                        "INSERT INTO quotes (name, email) VALUES (?, ?)",
                        ("Existing customer", "existing@example.com"),
                    )

                with TestClient(backend.app) as client:
                    response = client.post(
                        "/api/quote",
                        data={"name": "Łukasz", "email": "test@example.com"},
                    )
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(
                        response.text, "Dziękujemy! Otrzymaliśmy Twoje zgłoszenie."
                    )
                    self.assertIn("text/plain", response.headers["content-type"])

                    response = client.post(
                        "/api/quote",
                        data={
                            "name": "Anna",
                            "email": "anna@example.com",
                            "phone": "+48 535 920 800",
                            "message": "Ogród przy domu",
                        },
                    )
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(
                        client.post("/api/quote", data={"name": "Anna"}).status_code,
                        422,
                    )

                with sqlite3.connect(database) as connection:
                    rows = connection.execute(
                        "SELECT name, email, phone, message, created_at FROM quotes ORDER BY id"
                    ).fetchall()
                self.assertEqual(len(rows), 3)
                self.assertEqual(rows[0][0], "Existing customer")
                self.assertEqual(rows[1][:4], ("Łukasz", "test@example.com", "", ""))
                self.assertEqual(
                    rows[2][:4],
                    ("Anna", "anna@example.com", "+48 535 920 800", "Ogród przy domu"),
                )
                self.assertTrue(all(row[4] for row in rows))


if __name__ == "__main__":
    unittest.main()
