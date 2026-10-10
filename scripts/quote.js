(() => {
    "use strict";

    const cookieName = "quote_sent";
    const cookieAge = 30 * 24 * 60 * 60;
    const form = document.querySelector(".quote-form");
    const button = form?.querySelector('button[type="submit"]');
    const status = document.querySelector("#quote-status");
    const remember = document.querySelector("#quote-remember");
    const policyPath = new URL("../pages/policy.html", document.currentScript.src).pathname;
    const contactPath = new URL("contact.html", location.origin + policyPath).pathname;
    let sentThisVisit = false;
    let sending = false;
    let notice;

    function wasSent() {
        try {
            return document.cookie.split(";").some(item => item.trim() === `${cookieName}=1`);
        } catch {
            return false;
        }
    }

    function writeCookie(maxAge) {
        try {
            const secure = location.protocol === "https:" ? "; Secure" : "";
            document.cookie = `${cookieName}=1; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
        } catch {
            // Saving a quote must still work when cookies are unavailable.
        }
    }

    function showNotice() {
        if (notice) {
            notice.hidden = false;
            return;
        }
        notice = document.createElement("aside");
        notice.className = "quote-notice";
        notice.setAttribute("aria-label", "Status zapytania o wycenę");
        const close = document.createElement("button");
        close.type = "button";
        close.className = "quote-notice-close";
        close.setAttribute("aria-label", "Zamknij powiadomienie");
        close.textContent = "×";
        close.addEventListener("click", () => {
            notice.hidden = true;
            (button && !button.disabled ? button : document.querySelector(".brand"))?.focus();
        });
        const content = document.createElement("div");
        content.setAttribute("role", "status");
        content.setAttribute("aria-live", "polite");
        const title = document.createElement("strong");
        title.textContent = "Zapytanie zostało już wysłane";
        const description = document.createElement("p");
        description.textContent = "Dziękujemy! Skontaktujemy się z Tobą w sprawie wyceny. Nie musisz wysyłać formularza ponownie.";
        const contact = document.createElement("a");
        contact.href = contactPath;
        contact.textContent = "Chcesz coś dodać? Skontaktuj się z nami";
        content.append(title, description, contact);
        notice.append(close, content);
        document.body.append(notice);
    }

    function showSent() {
        if (button) {
            button.disabled = true;
            button.textContent = "Zapytanie wysłane";
        }
        if (status) status.textContent = "Twoje zapytanie zostało już wysłane. Dziękujemy!";
        showNotice();
    }

    if (remember) remember.closest("label").hidden = false;
    if (wasSent()) showSent();

    // Recheck when returning through browser history or from another tab.
    window.addEventListener("pageshow", () => {
        if (wasSent() || sentThisVisit) showSent();
        else if (button && !sending) {
            button.disabled = false;
            button.textContent = "Poproś o bezpłatną wycenę";
            status.textContent = "";
            if (notice) notice.hidden = true;
        }
    });

    form?.addEventListener("submit", async event => {
        event.preventDefault();
        if (sending) return;
        if (sentThisVisit || wasSent()) {
            showSent();
            return;
        }
        if (!form.reportValidity()) return;
        sending = true;
        button.disabled = true;
        button.textContent = "Wysyłanie…";
        status.textContent = "Wysyłamy Twoje zapytanie…";
        form.setAttribute("aria-busy", "true");
        const shouldRemember = remember.checked;
        try {
            const response = await fetch(form.action, {
                method: "POST",
                body: new FormData(form),
                credentials: "same-origin",
                headers: { Accept: "text/plain" },
            });
            if (!response.ok) throw new Error("Submission failed");
            sentThisVisit = true;
            if (shouldRemember) writeCookie(cookieAge);
            form.reset();
            showSent();
            if (shouldRemember && !wasSent()) {
                status.textContent = "Zapytanie zostało wysłane, ale przeglądarka nie pozwoliła zapamiętać tego w pliku cookie.";
            }
        } catch {
            status.textContent = "Nie udało się potwierdzić wysłania. Sprawdź połączenie. Jeśli problem się powtarza, skontaktuj się z nami telefonicznie lub e-mailem.";
            button.disabled = false;
            button.textContent = "Poproś o bezpłatną wycenę";
        } finally {
            sending = false;
            form.removeAttribute("aria-busy");
        }
    });

    const forget = document.querySelector("#forget-quote-cookie");
    if (forget) {
        forget.hidden = false;
        forget.addEventListener("click", () => {
            writeCookie(0);
            document.querySelector("#cookie-status").textContent = wasSent()
                ? "Nie udało się usunąć zapamiętania. Usuń plik cookie w ustawieniach przeglądarki."
                : "Usunięto zapamiętanie w tej przeglądarce. Zapisane zapytanie pozostaje u nas — w sprawie jego usunięcia skontaktuj się z nami.";
            if (notice && !wasSent()) notice.hidden = true;
        });
    }
})();
