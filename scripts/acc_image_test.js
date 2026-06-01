// Browser test: host adds an accommodation with MULTIPLE images.
const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    const ok = (label, cond) => console.log('  ' + (cond ? '✅' : '❌ FAIL') + '  ' + label);

    const imgDir = path.resolve(__dirname, '..', 'frontend', 'assets', 'treks');
    const testImages = [
        path.join(imgDir, 'druk-path.jpg'),
        path.join(imgDir, 'druk-path-2.jpg'),
        path.join(imgDir, 'druk-path-3.jpg'),
    ];

    try {
        // Register a fresh host via API
        const uniq = 'hosttest' + Date.now();
        await page.goto('http://localhost:8080/pages/index.html', { waitUntil: 'networkidle' });
        const reg = await page.evaluate(async (u) => {
            const r = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, email: u + '@test.com', password: 'HostPass123',
                                       first_name: 'Host', last_name: 'Tester', user_type: 'host' })
            });
            return { status: r.status, data: await r.json() };
        }, uniq);
        ok('host registered', reg.status === 201);

        // Store token + user, go to host dashboard
        await page.evaluate((d) => {
            localStorage.setItem('accessToken', d.access_token);
            const u = Object.assign({}, d); delete u.access_token;
            localStorage.setItem('currentUser', JSON.stringify(u));
        }, reg.data);
        await page.goto('http://localhost:8080/pages/dashboard-host.html', { waitUntil: 'networkidle' });

        // Upload 3 images at once
        console.log('Uploading 3 images…');
        await page.setInputFiles('#accImageFile', testImages);
        await page.waitForTimeout(4000);
        const status = await page.$eval('#imageUploadStatus', el => el.textContent);
        const thumbs = await page.$$eval('#imagePreviewGrid img', els => els.length);
        ok('upload status: "' + status + '"', status.includes('3 photo'));
        ok('3 preview thumbnails shown', thumbs === 3);

        // Fill the rest of the form
        await page.fill('#accName', 'Multi-Photo Test Lodge');
        await page.selectOption('#accDzongkhag', 'Paro');
        await page.fill('#accAddress', 'Test address, Paro');
        await page.fill('#accDescription', 'A test lodge with multiple photos.');
        await page.fill('#accStartingPrice', '2000');
        await page.click('#addAccForm button[type="submit"]');
        await page.waitForTimeout(2500);
        const msg = await page.$eval('#accFormMessage', el => el.textContent);
        ok('submit success message: "' + msg.trim() + '"', msg.includes('✅'));

        // Verify via API the accommodation has a multi-image gallery
        const check = await page.evaluate(async () => {
            const r = await fetch('http://localhost:5000/api/accommodations/');
            const list = await r.json();
            const m = list.find(a => a.name === 'Multi-Photo Test Lodge');
            return m || null;
        });
        ok('accommodation found via API', !!check);
        if (check) {
            ok('image_gallery has 3 images (got ' + (check.image_gallery || []).length + ')', (check.image_gallery || []).length === 3);
            ok('cover image_url set', !!check.image_url);
            ok('is_verified = false (pending admin)', check.is_verified === false);
        }

        console.log('');
        console.log('Console errors: ' + (errors.length ? JSON.stringify(errors) : 'none'));
        console.log(errors.length ? '==> ❌ ERRORS' : '==> ✅ MULTI-IMAGE UPLOAD WORKS');
    } catch (e) {
        console.log('TEST ERROR:', e.message);
        if (errors.length) console.log('Page errors:', JSON.stringify(errors));
    } finally {
        await browser.close();
    }
})();
