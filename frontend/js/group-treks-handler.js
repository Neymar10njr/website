let allEvents = [];
let filteredEvents = [];

document.addEventListener('DOMContentLoaded', loadEvents);

async function loadEvents() {
    try {
        const r = await fetch(API_BASE_URL + '/events/');
        allEvents = await r.json();
        filteredEvents = [...allEvents];
        displayEvents(filteredEvents);
        updateEventCount();
    } catch (e) {
        document.getElementById('eventsContainer').innerHTML =
            '<p class="treks-empty-state">Could not load group tours.</p>';
    }
}

function handleEventSearch(event) {
    event.preventDefault();
    const dzongkhag = document.getElementById('evDzongkhag').value;
    const difficulty = document.getElementById('evDifficulty').value;
    const tourType = document.getElementById('evTourType') ? document.getElementById('evTourType').value : '';
    const region = document.getElementById('evRegion') ? document.getElementById('evRegion').value : '';

    filteredEvents = allEvents.filter(ev => {
        if (tourType && ev.tour_type !== tourType) return false;
        if (region === 'bhutan' && ev.is_international) return false;
        if (region === 'international' && !ev.is_international) return false;
        if (dzongkhag && ev.trek_dzongkhag !== dzongkhag) return false;
        if (difficulty && ev.trek_difficulty !== difficulty) return false;
        return true;
    });

    let heading = 'Upcoming Group Tours';
    if (tourType === 'pilgrimage') heading = 'Upcoming Pilgrimage Tours';
    else if (tourType === 'trek') heading = 'Upcoming Treks';
    else if (tourType === 'hike') heading = 'Upcoming Hikes';
    if (region === 'international') heading += ' — International';
    else if (dzongkhag) heading += ` in ${dzongkhag}`;

    document.getElementById('evResultsHeading').textContent = heading;
    displayEvents(filteredEvents);
    updateEventCount();
}

function resetEventSearch() {
    document.getElementById('evDzongkhag').value = '';
    document.getElementById('evDifficulty').value = '';
    if (document.getElementById('evTourType')) document.getElementById('evTourType').value = '';
    if (document.getElementById('evRegion')) document.getElementById('evRegion').value = '';
    filteredEvents = [...allEvents];
    document.getElementById('evResultsHeading').textContent = 'Upcoming Group Tours';
    displayEvents(filteredEvents);
    updateEventCount();
}

function tourTypeBadge(ev) {
    const cls = ev.tour_type === 'pilgrimage' ? 'pill-pilgrimage'
              : ev.tour_type === 'hike' ? 'pill-hike'
              : 'pill-trek';
    return `<span class="tour-pill ${cls}">${tourTypeLabelHtml(ev.tour_type)}</span>`;
}

function regionLabel(ev) {
    if (ev.is_international) return `🌏 ${ev.country}`;
    return `📍 ${ev.trek_dzongkhag || 'Bhutan'}`;
}

function displayEvents(events) {
    const container = document.getElementById('eventsContainer');
    if (!events.length) {
        container.innerHTML = '<p class="treks-empty-state">No upcoming tours match these filters. Try clearing them or check back soon.</p>';
        return;
    }
    container.innerHTML = events.map(ev => {
        const start = new Date(ev.start_date).toLocaleDateString('en-US', {month:'short', day:'numeric'});
        const end = new Date(ev.end_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
        const statusClass = ev.status === 'open' ? 'difficulty-easy' : ev.status === 'full' ? 'difficulty-moderate' : 'difficulty-difficult';
        const op = ev.operator || {};
        const opBadge = op.is_verified ? '<span class="op-badge">✓ Verified Operator</span>' : '';
        return `
            <div class="trek-card">
                <div class="trek-card-image">
                    ${ev.trek_image_url ? `<img src="${ev.trek_image_url}" alt="${ev.trek_name}" onerror="this.parentElement.classList.add('no-image'); this.remove();">` : ''}
                    <div class="card-pill-stack">${tourTypeBadge(ev)}</div>
                </div>
                <div class="trek-card-content">
                    <div class="operator-strip">
                        <strong>${op.company_name || 'TrekNest Bhutan'}</strong>${opBadge}
                    </div>
                    <div class="trek-card-header">
                        <h3>${ev.title}</h3>
                        <span class="difficulty-pill ${statusClass}">${ev.status.toUpperCase()}</span>
                    </div>
                    <p class="trek-description">${regionLabel(ev)} · ${ev.trek_name}</p>
                    <div class="trek-info">
                        <span>📅 ${start} → ${end}</span>
                        <span>👥 ${ev.spots_left}/${ev.capacity} spots left</span>
                    </div>
                    <div class="trek-info">
                        <span style="color:var(--primary-color); font-weight:700; font-size:1.1rem;">Nu. ${ev.per_person_fee.toLocaleString()}</span>
                        <span>per person · all-inclusive</span>
                    </div>
                    ${ev.featured_guest ? `<div class="featured-guest-badge">⭐ Special guest: <strong>${ev.featured_guest}</strong>${ev.featured_guest_role ? ` — ${ev.featured_guest_role}` : ''}</div>` : ''}
                    <button class="btn btn-primary mt-2 full-width" onclick="viewEvent(${ev.id})">View Details & Book</button>
                </div>
            </div>
        `;
    }).join('');
}

function updateEventCount() {
    const el = document.getElementById('evResultsCount');
    if (el) {
        const n = filteredEvents.length;
        el.textContent = `${n} tour${n !== 1 ? 's' : ''} found`;
    }
}

async function viewEvent(eventId) {
    const modal = document.getElementById('eventDetailModal');
    const content = document.getElementById('eventDetailContent');
    content.innerHTML = '<p>Loading…</p>';
    modal.classList.add('show');

    try {
        const r = await fetch(API_BASE_URL + '/events/' + eventId);
        const ev = await r.json();
        renderEventDetail(ev);
    } catch (e) {
        content.innerHTML = '<p style="color:#d33">Could not load tour.</p>';
    }
}

function renderEventDetail(ev) {
    const content = document.getElementById('eventDetailContent');
    const start = new Date(ev.start_date).toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric', year:'numeric'});
    const end = new Date(ev.end_date).toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric', year:'numeric'});
    const op = ev.operator || {};
    const guide = ev.lead_guide || {};
    const supportPhone = op.support_phone || '';
    const waPhone = (op.whatsapp_number || op.support_phone || '').replace(/\D/g, '');
    const cleanPhone = supportPhone.replace(/[^\d+]/g, '');

    const me = getCurrentUser();
    const canJoin = ev.status === 'open' && ev.spots_left > 0 && (!me || (me.user_type !== 'trek_organiser' && me.user_id !== ev.organiser_id));

    const sites = ev.sacred_sites
        ? `<p><strong>🛕 Sacred sites visited:</strong> ${ev.sacred_sites}</p>`
        : '';

    content.innerHTML = `
        <div class="op-banner">
            ${op.logo_url ? `<img src="${op.logo_url}" alt="${op.company_name}" onerror="this.style.display='none'">` : ''}
            <div>
                <div class="op-name">${op.company_name || 'TrekNest Bhutan'} ${op.is_verified ? '<span class="op-badge">✓ Verified</span>' : ''}</div>
                <div class="op-tagline">${op.tagline || 'Tours organised end to end'}</div>
                ${op.licence_number ? `<div class="op-licence">Licence: ${op.licence_number}</div>` : ''}
            </div>
        </div>

        <h2>${tourTypeBadge(ev)} ${ev.title}</h2>
        ${typeof buildTrekGalleryHtml === 'function' ? buildTrekGalleryHtml(ev.trek_image_url) : (ev.trek_image_url ? `<div class="trek-detail-image"><img src="${ev.trek_image_url}" alt="${ev.trek_name}" onerror="this.parentElement.style.display='none'"></div>` : '')}

        <div class="trek-info-detail">
            <p><strong>📍 Tour:</strong> ${ev.trek_name} ${ev.is_international ? `(${ev.country})` : `(${ev.trek_dzongkhag})`}</p>
            <p><strong>📅 Dates:</strong> ${start} → ${end}</p>
            <p><strong>💪 Physical demand:</strong> ${ev.trek_difficulty || 'N/A'}</p>
            ${ev.religious_tradition ? `<p><strong>☸️ Tradition:</strong> ${ev.religious_tradition}</p>` : ''}
            ${sites}
            <p><strong>👥 Capacity:</strong> ${ev.spots_left} of ${ev.capacity} spots remaining</p>
            <p><strong>🪙 Fee:</strong> Nu. ${ev.per_person_fee.toLocaleString()} per person <em>(all-inclusive)</em></p>
            ${guide.display_name ? `<p><strong>🧑‍🦱 Lead Guide:</strong> ${guide.display_name}${guide.role_title ? ` — ${guide.role_title}` : ''}${guide.years_experience ? ` (${guide.years_experience} yrs experience)` : ''}</p>` : ''}
            ${ev.meeting_point ? `<p><strong>📍 Meeting point:</strong> ${ev.meeting_point}</p>` : ''}
            ${ev.reporting_time ? `<p><strong>⏰ Reporting time:</strong> ${ev.reporting_time}</p>` : ''}
        </div>

        ${ev.featured_guest ? `
            <div class="featured-guest-panel">
                <div class="fg-star">⭐</div>
                <div>
                    <div class="fg-label">Special guest joining this departure</div>
                    <div class="fg-name">${ev.featured_guest}</div>
                    ${ev.featured_guest_role ? `<div class="fg-role">${ev.featured_guest_role}</div>` : ''}
                </div>
            </div>
        ` : ''}

        ${ev.description ? `<p style="margin: 1rem 0; color:#555;">${ev.description}</p>` : ''}

        ${ev.includes ? `<div class="confirm-section"><strong>✅ What's included</strong><p>${ev.includes}</p></div>` : ''}
        ${ev.excludes ? `<div class="confirm-section"><strong>❌ Not included</strong><p>${ev.excludes}</p></div>` : ''}

        <div class="op-contact-card">
            <strong>Contact ${op.company_name || 'TrekNest Bhutan'}</strong>
            ${op.business_hours ? `<div class="op-hours">${op.business_hours}</div>` : ''}
            <div class="contact-buttons" style="margin-top:0.75rem">
                ${supportPhone ? `<a href="tel:${cleanPhone}" class="btn-contact btn-call">${typeof phoneIconSvg === 'function' ? phoneIconSvg(18) : '📞'}<span>${supportPhone}</span></a>` : ''}
                ${waPhone ? `<a href="https://wa.me/${waPhone}" target="_blank" rel="noopener" class="btn-contact btn-whatsapp">${typeof whatsappIconSvg === 'function' ? whatsappIconSvg(18) : '💬'}<span>WhatsApp</span></a>` : ''}
                ${op.support_email ? `<a href="mailto:${op.support_email}" class="btn-contact btn-email">✉️<span>${op.support_email}</span></a>` : ''}
            </div>
        </div>

        <div id="joinResult" class="auth-error" style="margin-top:1rem"></div>

        ${canJoin ? `
            <button id="joinBtn" class="btn btn-primary btn-large full-width mt-2" onclick="joinEvent(${ev.id})">📩 Reserve My Spot</button>
        ` : ev.status !== 'open'
            ? `<p style="text-align:center; color:#888; margin-top:1rem; padding:0.75rem; background:#fafafa; border-radius:8px;">This tour is <strong>${ev.status.toUpperCase()}</strong> and not accepting new participants.</p>`
            : ev.spots_left <= 0
                ? `<p style="text-align:center; color:#d33; margin-top:1rem; padding:0.75rem; background:#fde2e2; border-radius:8px;">⚠️ Fully booked</p>`
                : me && me.user_id === ev.organiser_id
                    ? `<p style="text-align:center; color:#888; margin-top:1rem;">This is your tour. Manage participants from your dashboard.</p>`
                    : me && me.user_type === 'trek_organiser'
                        ? `<p style="text-align:center; color:#888; margin-top:1rem;">Staff cannot join tours as participants.</p>`
                        : ''
        }
    `;
}

async function joinEvent(eventId) {
    const me = getCurrentUser();
    const result = document.getElementById('joinResult');
    result.style.display = 'none';

    if (!me) {
        result.style.display = 'block';
        result.style.background = '#fde2e2';
        result.style.color = '#d33';
        result.textContent = 'Please sign in or register to reserve a spot.';
        toggleAuthModal();
        return;
    }

    if (!confirm('Reserve a spot on this tour? TrekNest Bhutan will reach out shortly with payment instructions.')) return;

    try {
        const r = await authFetch(API_BASE_URL + '/events/' + eventId + '/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const data = await r.json();
        if (!r.ok) {
            result.style.display = 'block';
            result.style.background = '#fde2e2';
            result.style.color = '#d33';
            result.textContent = data.error || 'Failed to reserve';
            return;
        }
        result.style.display = 'block';
        result.style.background = '#d4f4dd';
        result.style.color = '#1e7d32';
        const op = data.operator || {};
        result.innerHTML = `
            ✅ ${data.message}<br>
            <strong>Your booking reference:</strong> <code>${data.booking_ref}</code><br>
            <small>Quote this when ${op.company_name || 'TrekNest'} contacts you${op.support_phone ? ` (${op.support_phone})` : ''}.</small>
        `;
        const btn = document.getElementById('joinBtn');
        if (btn) { btn.disabled = true; btn.textContent = 'Reserved ✓'; }
        loadEvents();
    } catch (e) {
        result.style.display = 'block';
        result.style.background = '#fde2e2';
        result.style.color = '#d33';
        result.textContent = 'Network error: ' + e.message;
    }
}

function closeEventModal() {
    document.getElementById('eventDetailModal').classList.remove('show');
}
