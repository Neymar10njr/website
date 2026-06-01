// Verify two tabs can hold DIFFERENT logged-in users independently,
// and a reload keeps each tab's own user.
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const ctx = await browser.newContext();
    const ok = (label, cond) => console.log('  ' + (cond ? '✅' : '❌ FAIL') + '  ' + label);

    const loginInTab = async (page, username, password) => {
        await page.goto('http://localhost:8080/pages/index.html', { waitUntil: 'networkidle' });
        await page.evaluate(async (cred) => {
            const r = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cred)
            });
            const d = await r.json();
            sessionStorage.setItem('accessToken', d.access_token);
            const u = Object.assign({}, d); delete u.access_token;
            sessionStorage.setItem('currentUser', JSON.stringify(u));
        }, { username, password });
    };
    const whoAmI = async (page) => page.evaluate(() => {
        const u = sessionStorage.getItem('currentUser');
        return u ? JSON.parse(u).user_type + ':' + JSON.parse(u).username : '(none)';
    });

    try {
        // TAB 1 — log in as admin
        const tab1 = await ctx.newPage();
        await loginInTab(tab1, 'admin', 'TrekNestAdmin!2026');
        ok('Tab 1 logged in as admin', (await whoAmI(tab1)) === 'admin:admin');

        // TAB 2 — log in as a staff guide (a DIFFERENT user)
        const tab2 = await ctx.newPage();
        await loginInTab(tab2, 'guide_karma', 'TrekNestGuide!2026');
        ok('Tab 2 logged in as guide_karma', (await whoAmI(tab2)) === 'trek_organiser:guide_karma');

        // Now RELOAD tab 1 — it must STILL be admin (the old bug made it flip to tab 2's user)
        await tab1.reload({ waitUntil: 'networkidle' });
        const tab1After = await whoAmI(tab1);
        ok('After reload, Tab 1 is STILL admin (was: ' + tab1After + ')', tab1After === 'admin:admin');

        // Reload tab 2 — still the guide
        await tab2.reload({ waitUntil: 'networkidle' });
        const tab2After = await whoAmI(tab2);
        ok('After reload, Tab 2 is STILL guide_karma (was: ' + tab2After + ')', tab2After === 'trek_organiser:guide_karma');

        console.log('');
        const passed = tab1After === 'admin:admin' && tab2After === 'trek_organiser:guide_karma';
        console.log(passed
            ? '==> ✅ FIXED — each tab keeps its own user across reloads'
            : '==> ❌ STILL BROKEN');
    } catch (e) {
        console.log('TEST ERROR:', e.message);
    } finally {
        await browser.close();
    }
})();
