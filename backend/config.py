import os
from pathlib import Path

from dotenv import load_dotenv

project_root = Path(__file__).resolve().parent.parent
load_dotenv(project_root / ".env")

SMTP_USER = os.environ["SMTP_USER"]
OWNER_EMAIL = os.environ["OWNER_EMAIL"]
SMTP_APP_PASSWORD = os.environ["SMTP_APP_PASSWORD"]