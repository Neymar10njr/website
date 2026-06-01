// Site-wide footer renderer. Pulls live contact info from /api/admin/operator
// so changes in the admin Operator Profile flow through to every page automatically.
(async function renderSiteFooter() {
    const slot = document.getElementById('siteFooter');
    if (!slot) return;

    const apiBase = (window.TREKNEST_API_BASE_URL) || (window.location.origin + '/api');
    let op = {};
    try {
        const r = await fetch(apiBase + '/admin/operator');
        if (r.ok) op = await r.json();
    } catch (e) { /* graceful: footer still renders with placeholders */ }

    const phone = op.support_phone || '+975-2-322333';
    const whatsapp = (op.whatsapp_number || op.support_phone || '').replace(/\D/g, '');
    const email = op.support_email || 'bookings@treknest.bt';
    const address = op.office_address || 'Norzin Lam, Thimphu, Bhutan';
    const hours = op.business_hours || '9:00 AM – 6:00 PM BST';
    const tagline = op.tagline || 'Authentic treks, hikes, and pilgrimages — organised end to end.';
    const company = op.company_name || 'TrekNest Bhutan';
    const licence = op.licence_number ? `<div class="footer-licence">Licence: ${escHtml(op.licence_number)}</div>` : '';
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const year = new Date().getFullYear();

    slot.className = 'site-footer';
    slot.innerHTML = `
        <div class="site-footer-content">
            <div class="footer-col footer-brand">
                <h4>🏔️ ${escHtml(company)}</h4>
                <p>${escHtml(tagline)}</p>
                <p class="footer-address">📍 ${escHtml(address)}</p>
                ${licence}
            </div>
            <div class="footer-col">
                <h4>Explore</h4>
                <ul>
                    <li><a href="treks.html">Treks</a></li>
                    <li><a href="group-treks.html">Group Tours</a></li>
                    <li><a href="accommodations.html">Stays</a></li>
                    <li><a href="moments.html">Trek Moments</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>Company</h4>
                <ul>
                    <li><a href="about.html">About TrekNest</a></li>
                    <li><a href="contact.html">Contact</a></li>
                    <li><a href="privacy.html">Privacy Policy</a></li>
                    <li><a href="terms.html">Terms of Service</a></li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>Contact</h4>
                <p><a href="tel:${cleanPhone}">📞 ${escHtml(phone)}</a></p>
                ${whatsapp ? `<p><a href="https://wa.me/${whatsapp}" target="_blank" rel="noopener">💬 WhatsApp</a></p>` : ''}
                <p><a href="mailto:${escHtml(email)}">✉️ ${escHtml(email)}</a></p>
                <p class="footer-hours">🕒 ${escHtml(hours)}</p>
            </div>
        </div>
        <div class="site-footer-bottom">
            <p>&copy; ${year} ${escHtml(company)}. All rights reserved.</p>
            <p class="footer-thanks">Made with ❤️ in Bhutan</p>
        </div>
    `;

    function escHtml(s) {
        if (s == null) return '';
        return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
})();
