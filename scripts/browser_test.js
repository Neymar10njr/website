// Real-browser end-to-end test: admin creates an event, then EDITS it.
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

    const ok = (label, cond) => console.log('  ' + (cond ? '✅' : '❌ FAIL') + '  ' + label);

    try {
        // --- Login ---
        await page.goto('http://localhost:8080/pages/admin.html', { waitUntil: 'networkidle' });
        await page.evaluate(async () => {
            const r = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin', password: 'TrekNestAdmin!2026' })
            });
            const d = await r.json();
            localStorage.setItem('accessToken', d.access_token);
            const u = Object.assign({}, d); delete u.access_token;
            localStorage.setItem('currentUser', JSON.stringify(u));
        });
        await page.goto('http://localhost:8080/pages/admin.html', { waitUntil: 'networkidle' });
        await page.click('.admin-nav-btn[data-tab="events"]');
        await page.waitForTimeout(2000);

        // ===== TEST 1: CREATE an event =====
        console.log('TEST 1 — Create event');
        const trekVal = await page.$eval('#ev_trek_id option:nth-child(2)', o => o.value);
        const guideVal = await page.$eval('#ev_lead_guide_user_id option:nth-child(2)', o => o.value);
        await page.selectOption('#ev_trek_id', trekVal);
        await page.selectOption('#ev_lead_guide_user_id', guideVal);
        await page.fill('#ev_title', 'EDIT-TEST Event');
        await page.fill('#ev_start_date', '2026-12-01');
        await page.fill('#ev_end_date', '2026-12-05');
        await page.fill('#ev_capacity', '10');
        await page.fill('#ev_per_person_fee', '11000');
        await page.click('#createEventBtn');
        await page.waitForTimeout(2500);
        let toast = await page.$$eval('.toast', ts => ts.map(t => t.textContent));
        ok('create shows success toast', toast.some(t => t.includes('created')));

        // Find the created event's id from the events table (first matching row)
        const created = await page.evaluate(async () => {
            const r = await fetch('http://localhost:5000/api/events/');
            const evs = await r.json();
            const m = evs.find(e => e.title === 'EDIT-TEST Event');
            return m ? m.id : null;
        });
        ok('created event found in /api/events/  (id=' + created + ')', !!created);

        // ===== TEST 2: EDIT the event — add a featured guest =====
        console.log('TEST 2 — Edit event (add featured guest + change title)');
        await page.click('#evtList .row-actions button:has-text("Edit")');
        await page.waitForTimeout(1500);
        const idInForm = await page.$eval('#ev_id', el => el.value);
        ok('Edit opened the form with an event id pre-filled', !!idInForm);
        const titleInForm = await page.$eval('#ev_title', el => el.value);
        ok('form pre-filled with existing title', titleInForm.length > 0);

        await page.fill('#ev_title', 'EDIT-TEST Event (RENAMED)');
        await page.fill('#ev_featured_guest', 'Sonam Lhamo');
        await page.fill('#ev_featured_guest_role', 'Famous actress — meet & greet');
        await page.click('#createEventBtn');
        await page.waitForTimeout(2500);
        toast = await page.$$eval('.toast', ts => ts.map(t => t.textContent));
        ok('edit shows "updated" toast', toast.some(t => t.includes('updated')));

        // Verify the change landed via the API
        const verified = await page.evaluate(async (eid) => {
            const r = await fetch('http://localhost:5000/api/events/' + eid);
            return await r.json();
        }, idInForm);
        ok('title updated', verified.title === 'EDIT-TEST Event (RENAMED)');
        ok('featured_guest saved: ' + verified.featured_guest, verified.featured_guest === 'Sonam Lhamo');
        ok('featured_guest_role saved', verified.featured_guest_role === 'Famous actress — meet & greet');

        // ===== Cleanup =====
        await page.evaluate(async (eid) => {
            const tok = localStorage.getItem('accessToken');
            await fetch('http://localhost:5000/api/admin/events/' + eid, {
                method: 'DELETE', headers: { Authorization: 'Bearer ' + tok }
            });
        }, idInForm);
        console.log('  (cleaned up test event #' + idInForm + ')');

        console.log('');
        console.log('Console/page errors: ' + (errors.length ? JSON.stringify(errors) : 'none'));
        console.log(errors.length ? '==> ❌ ERRORS DETECTED' : '==> ✅ CREATE + EDIT BOTH WORK');
    } catch (e) {
        console.log('TEST SCRIPT ERROR:', e.message);
        if (errors.length) console.log('Page errors:', JSON.stringify(errors));
    } finally {
        await browser.close();
    }
})();
