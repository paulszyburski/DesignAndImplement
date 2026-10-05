# Quote backend

Run these commands from the project root, using Python 3.10 or newer:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 5000
```

`python backend/app.py` also starts Uvicorn on the same address and port.
On the Pi, replace any Flask or WSGI launch command in your existing service
with the Uvicorn command above, using the absolute path to its virtualenv
and the project root as the working directory. Restart that service after
installing the dependencies. The existing reverse proxy can continue sending
`/api/quote` requests to port 5000. Static pages are still served by your web server.

The default SQLite database remains:

```text
/home/paul/Projects/designandimplement/data/quotes.db
```

The parent directory must exist and be writable by the service user. Startup
creates the `quotes` table if needed and preserves existing records.
To use the checkout's database for local development, set its path explicitly:

```bash
QUOTES_DB_PATH="$PWD/data/quotes.db" .venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 5000
```

The HTML form continues to POST `name`, `email`, and optional `phone` and
`message` fields to `/api/quote`. FastAPI uses `Form` and `python-multipart`
to receive form submissions: https://fastapi.tiangolo.com/tutorial/request-forms/

Run the test with an isolated temporary database:

```bash
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m unittest backend.test_app
```
