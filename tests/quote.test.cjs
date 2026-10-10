const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const script = fs.readFileSync('scripts/quote.js', 'utf8');

function setup({ cookie = '', checked = false, ok = true, blocked = false, noForm = false } = {}) {
    function element() {
        return {
            handlers: {}, children: [], hidden: false, disabled: false, textContent: '',
            addEventListener(name, fn) { this.handlers[name] = fn; },
            setAttribute() {}, removeAttribute() {}, focus() {},
            append(...children) { this.children.push(...children); },
        };
    }
    const button = element(), status = element(), label = element();
    const remember = { checked, closest: () => label };
    const form = Object.assign(element(), {
        action: 'https://example.com/api/quote',
        querySelector: () => button,
        reportValidity: () => true,
        reset() { remember.checked = false; },
    });
    const forget = element(), cookieStatus = element();
    const elements = { '.quote-form': noForm ? null : form, '#quote-status': status,
        '#quote-remember': noForm ? null : remember, '#forget-quote-cookie': forget, '#cookie-status': cookieStatus };
    const document = { querySelector: key => elements[key] ?? null,
        currentScript: { src: 'https://example.com/scripts/quote.js?v=1' },
        createElement: element, body: element(),
    };
    const writes = [];
    Object.defineProperty(document, 'cookie', {
        get() { return cookie; },
        set(value) {
            writes.push(value);
            if (!blocked) cookie = value.includes('Max-Age=0;') ? '' : value.split(';')[0];
        },
    });
    let requests = 0;
    const window = element();
    vm.runInNewContext(script, {
        document, window, URL, location: { origin: 'https://example.com', protocol: 'https:' },
        FormData: class {},
        fetch: async () => { requests++; return { ok }; },
    });
    return { button, status, document, writes, forget, cookieStatus,
        submit: () => form.handlers.submit({ preventDefault() {} }),
        requests: () => requests,
    };
}

test('successful opted-in submission saves only a flag with 30-day secure cookie', async () => {
    const app = setup({ checked: true });
    await app.submit();
    assert.deepEqual(app.writes, ['quote_sent=1; Max-Age=2592000; Path=/; SameSite=Lax; Secure']);
    assert.equal(app.button.disabled, true);
    assert.equal(app.document.body.children.length, 1);
    await app.submit();
    assert.equal(app.requests(), 1);
});

test('no opt-in still submits without a cookie', async () => {
    const app = setup();
    await app.submit();
    assert.equal(app.requests(), 1);
    assert.equal(app.writes.length, 0);
    assert.equal(app.button.disabled, true);
});

test('server failure leaves form available and creates no cookie or success popup', async () => {
    const app = setup({ checked: true, ok: false });
    await app.submit();
    assert.equal(app.writes.length, 0);
    assert.equal(app.button.disabled, false);
    assert.equal(app.document.body.children.length, 0);
    assert.match(app.status.textContent, /Nie udało się/);
});

test('returning visitor sees notice and does not submit a duplicate', async () => {
    const app = setup({ cookie: 'another=2; quote_sent=1' });
    assert.equal(app.document.body.children.length, 1);
    await app.submit();
    assert.equal(app.requests(), 0);
});

test('double click while sending produces one request', async () => {
    const app = setup();
    await Promise.all([app.submit(), app.submit()]);
    assert.equal(app.requests(), 1);
});

test('blocked cookies do not turn a saved quote into a failed submission', async () => {
    const app = setup({ checked: true, blocked: true });
    await app.submit();
    assert.equal(app.button.disabled, true);
    assert.match(app.status.textContent, /nie pozwoliła/);
});

test('policy can clear cookie and hide reminder without deleting the quote', () => {
    const app = setup({ cookie: 'quote_sent=1', noForm: true });
    app.forget.handlers.click();
    assert.match(app.writes[0], /Max-Age=0;/);
    assert.equal(app.document.body.children[0].hidden, true);
    assert.match(app.cookieStatus.textContent, /Zapisan[e] zapytanie pozostaje/);
});

test('popup dismisses accessibly without deleting the cookie', () => {
    const app = setup({ cookie: 'quote_sent=1', noForm: true });
    const notice = app.document.body.children[0];
    notice.children[0].handlers.click();
    assert.equal(notice.hidden, true);
    assert.equal(app.writes.length, 0);
});
