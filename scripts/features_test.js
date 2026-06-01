// Browser test for the 4 new features: admin accommodation view/delete,
// profile pictures, reviews & ratings, trek moments.
const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch();
    const ctx = await browser.newContext();
    const errors = [];
    const ok = (label, cond) => console.log('  ' + (cond ? '✅' : '❌ FAIL') + '  ' + label);
    const img = path.resolve(__dirname, '..', 'frontend', 'assets', 'treks', 'druk-path.jpg');

    const loginAs = async (page, username, password) => {
        await page.goto('http://localhost:8080/pages/index.html', { waitUntil: 'networkidle' });
        await page.evaluate(async (c) => {
            const r = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c)
            });
            const d = await r.json();
            sessionStorage.setItem('accessToken', d.access_token);
            const u = Object.assign({}, d); delete u.access_token;
            sessionStorage.setItem('currentUser', JSON.stringify(u));
        }, { username, password });
    };

    try {
        // ===== FEATURE 1: Admin accommodation View modal =====
        console.log('FEATURE 1 — Admin accommodation View + Delete');
        const admin = await ctx.newPage();
        admin.on('pageerror', e => errors.push('admin: ' + e.message));
        await loginAs(admin, 'admin', 'TrekNestAdmin!2026');
        await admin.goto('http://localhost:8080/pages/admin.html', { waitUntil: 'networkidle' });
        await admin.click('.admin-nav-btn[data-tab="accommodations"]');
        await admin.waitForTimeout(1500);
        await admin.click('#accList .row-actions button:has-text("View")');
        await admin.waitForTimeout(1500);
        const modalShown = await admin.isVisible('#accViewModal .modal-content');
        const modalHasContent = await admin.$eval('#accViewContent', el => el.textContent.length > 50).catch(() => false);
        ok('View modal opens with accommodation detail', modalShown && modalHasContent);
        const hasVerifyBtn = await admin.$$eval('#accViewContent button', bs => bs.some(b => /Verify|Unverify/.test(b.textContent)));
        const hasDeleteBtn = await admin.$$eval('#accViewContent button', bs => bs.some(b => /Delete/.test(b.textContent)));
        ok('modal has Verify + Delete actions', hasVerifyBtn && hasDeleteBtn);
        // close the modal before continuing
        await admin.click('#accViewModal .close');
        await admin.waitForTimeout(500);

        // ===== FEATURE 4: Admin posts a Trek Moment =====
        console.log('FEATURE 4 — Trek Moments');
        await admin.click('.admin-nav-btn[data-tab="moments"]');
        await admin.waitForTimeout(1000);
        await admin.setInputFiles('#mo_image_file', img);
        await admin.waitForTimeout(2500);
        await admin.fill('#mo_caption', 'Browser-test moment — sunrise on the trail');
        await admin.click('#momentFormCard button[type="submit"]');
        await admin.waitForTimeout(2000);
        const momentMsg = await admin.$eval('#momentMessage', el => el.textContent);
        ok('moment posted: "' + momentMsg.trim() + '"', momentMsg.includes('✅'));
        const momentInApi = await admin.evaluate(async () => {
            const r = await fetch('http://localhost:5000/api/moments/');
            return (await r.json()).some(m => m.caption && m.caption.includes('Browser-test moment'));
        });
        ok('moment appears in public /api/moments/', momentInApi);

        // ===== FEATURE 2 + 3: tourist — avatar upload + post a review =====
        console.log('FEATURE 2 — Profile picture upload');
        const uniq = 'revtest' + Date.now();
        const tourist = await ctx.newPage();
        tourist.on('pageerror', e => errors.push('tourist: ' + e.message));
        await tourist.goto('http://localhost:8080/pages/index.html', { waitUntil: 'networkidle' });
        const reg = await tourist.evaluate(async (u) => {
            const r = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, email: u + '@t.com', password: 'RevPass123',
                                       first_name: 'Rev', last_name: 'Tester', user_type: 'tourist' })
            });
            return { status: r.status, data: await r.json() };
        }, uniq);
        await tourist.evaluate((d) => {
            sessionStorage.setItem('accessToken', d.access_token);
            const u = Object.assign({}, d); delete u.access_token;
            sessionStorage.setItem('currentUser', JSON.stringify(u));
        }, reg.data);
        await tourist.goto('http://localhost:8080/pages/account.html', { waitUntil: 'networkidle' });
        await tourist.setInputFiles('#avatarFile', img);
        await tourist.waitForTimeout(2500);
        const avatarStatus = await tourist.$eval('#avatarStatus', el => el.textContent);
        ok('avatar upload: "' + avatarStatus.trim() + '"', avatarStatus.includes('✅'));

        console.log('FEATURE 3 — Reviews & Ratings');
        await tourist.goto('http://localhost:8080/pages/treks.html', { waitUntil: 'networkidle' });
        await tourist.waitForTimeout(1500);
        await tourist.click('#treksGrid .trek-card button:has-text("View Details")');
        await tourist.waitForTimeout(1500);
        const widgetShown = await tourist.isVisible('#trekReviewsWidget .review-form');
        ok('review widget + write-a-review form shows on trek detail', widgetShown);
        // pick 5 stars + comment + submit
        await tourist.click('#trekReviewsWidget .star-pick[data-v="5"]');
        await tourist.fill('#trekReviewsWidget .review-comment', 'Fantastic trek, well organised!');
        await tourist.click('#trekReviewsWidget .review-form button:has-text("Post Review")');
        await tourist.waitForTimeout(2000);
        const reviewPosted = await tourist.$eval('#trekReviewsWidget', el =>
            el.textContent.includes('Fantastic trek') && el.textContent.includes('Rev Tester'));
        ok('review posted and appears in the list', reviewPosted);
        const avgShown = await tourist.$eval('#trekReviewsWidget .review-avg', el => el.textContent.trim());
        ok('average rating now shows (' + avgShown + ')', avgShown === '5.0');

        console.log('');
        console.log('Console/page errors: ' + (errors.length ? JSON.stringify(errors) : 'none'));
        console.log(errors.length ? '==> ❌ ERRORS DETECTED' : '==> ✅ ALL 4 FEATURES WORK');
    } catch (e) {
        console.log('TEST ERROR:', e.message);
        if (errors.length) console.log('Page errors:', JSON.stringify(errors));
    } finally {
        await browser.close();
    }
})();
