# Design and Implement

Website for a Polish garden design and landscaping business. It presents the
company, its services, contact details, and a quote request form.

![Garden website preview](assets/garden-banner-v5.png)

## Features

- Responsive multi-page layout
- Accessible navigation and form feedback
- Quote requests stored in SQLite
- Email notifications through Gmail SMTP
- Optional cookie that prevents accidental duplicate submissions
- Automated backend and browser-script tests

## Technology

- HTML and CSS
- Vanilla JavaScript
- FastAPI
- SQLite

## Local setup

Create a virtual environment and install the dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and enter the SMTP credentials. Gmail accounts
require an app password.

Start the API:

```bash
uvicorn backend.app:app --reload
```

The production web server should serve the static files and forward `/api`
requests to FastAPI. For a frontend-only preview, run `python -m http.server`
and open `http://127.0.0.1:8000`.

## Tests

Install the development dependencies, then run both test suites:

```bash
pip install -r requirements-dev.txt
python -m unittest
node --test tests/quote.test.cjs
```

## License

Copyright 2026 Design and Implement. All rights reserved. See [LICENSE](LICENSE).
