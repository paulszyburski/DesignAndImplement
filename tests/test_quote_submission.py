"""Submission checks use a temporary database and never send email."""
import importlib
import os
import smtplib
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient


class QuoteSubmissionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = str(Path(self.temp.name) / 'quotes.db')
        self.environment = patch.dict(os.environ, {
            'SMTP_USER': 'test@example.com',
            'SMTP_APP_PASSWORD': 'test-only',
            'OWNER_EMAIL': 'owner@example.com',
        })
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.module = importlib.import_module('backend.app')
        self.database = patch.object(self.module, 'DB_PATH', self.path)
        self.database.start()
        self.addCleanup(self.database.stop)
        self.mail = patch.object(self.module, 'send_quote_notification')
        self.send = self.mail.start()
        self.addCleanup(self.mail.stop)
        self.client = self.enterContext(TestClient(self.module.app))

    def count(self):
        with sqlite3.connect(self.path) as db:
            return db.execute('SELECT COUNT(*) FROM quotes').fetchone()[0]

    def test_save_commits_before_email_and_does_not_set_cookie_without_browser_consent(self):
        self.send.side_effect = lambda *args: self.assertEqual(self.count(), 1)
        response = self.client.post('/api/quote', data={'name': 'Test', 'email': 'test@example.com'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.count(), 1)
        self.send.assert_called_once()
        self.assertNotIn('set-cookie', response.headers)

    def test_email_failure_does_not_report_saved_quote_as_failed(self):
        self.send.side_effect = smtplib.SMTPException('Test failure')
        with self.assertLogs(self.module.logger, level='ERROR'):
            response = self.client.post('/api/quote', data={'name': 'Test', 'email': 'test@example.com'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.count(), 1)

    def test_invalid_submission_is_not_saved_or_emailed(self):
        response = self.client.post('/api/quote', data={'name': 'Test'})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.count(), 0)
        self.send.assert_not_called()

    def test_database_failure_does_not_send_email(self):
        with patch.object(self.module.sqlite3, 'connect', side_effect=sqlite3.OperationalError('Test')):
            with self.assertRaises(sqlite3.OperationalError):
                self.client.post('/api/quote', data={'name': 'Test', 'email': 'test@example.com'})
        self.send.assert_not_called()


if __name__ == '__main__':
    unittest.main()
