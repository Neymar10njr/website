// Admin dashboard handler. Requires admin login; redirects otherwise.
(function () {
    const me = (typeof requireAuth === 'function') ? requireAuth(['admin']) : null;
    if (!me) return;
    const nameEl = document.getElementById('adminName');
    if (nameEl) nameEl.textContent = (me.first_name && me.last_name) ? `${me.first_name} ${me.last_name}` : me.username;
})();

// ===== Tab switching =====
document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tab) {
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.admin-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tab));
    if (PANE_LOADERS[tab]) PANE_LOADERS[tab]();
}

const PANE_LOADERS = {};

// ===== Initial load =====
document.addEventListener('DOMContentLoaded', () => {
    loadOverview();
    loadOperator();
});

// ===== Overview =====
PANE_LOADERS.overview = loadOverview;
async function loadOverview() {
    const grid = document.getElementById('statGrid');
    try {
        const r = await authFetch(API_BASE_URL + '/admin/overview');
        if (!r.ok) throw new Error('forbidden');
        const s = await r.json();
        grid.innerHTML = `
            ${statCard('👤 Users', s.users_total, [
                ['Tourists', s.users_by_type.tourist || 0],
                ['Local tourists', s.users_by_type.local_tourist || 0],
                ['Hosts', s.users_by_type.host || 0],
                ['Staff', s.users_by_type.trek_organiser || 0]
            ])}
            ${statCard('🏨 Accommodations', s.accommodations_total, [
                ['Verified', s.accommodations_verified],
                ['Pending', s.accommodations_pending]
            ])}
            ${statCard('🗺️ Tour Catalogue', s.tours_total, [
                ['Treks', s.tours_by_type.trek || 0],
                ['Hikes', s.tours_by_type.hike || 0],
                ['Pilgrimages', s.tours_by_type.pilgrimage || 0]
            ])}
            ${statCard('📅 Group Events', s.events_total, [
                ['Open', s.events_open],
                ['Participants', s.event_participants_total]
            ])}
            ${statCard('📋 Bookings', s.bookings_total, [
                ['Pending', s.bookings_by_status.pending || 0],
                ['Confirmed', s.bookings_by_status.confirmed || 0],
                ['Completed', s.bookings_by_status.completed || 0],
                ['Cancelled', s.bookings_by_status.cancelled || 0]
            ])}
            ${statCard('👥 Active Staff', s.staff_active, [])}
        `;
    } catch (e) {
        grid.innerHTML = '<p style="color:#d33">Could not load overview.</p>';
    }
}

function statCard(title, big, breakdown) {
    return `
        <div class="stat-card">
            <div class="stat-title">${title}</div>
            <div class="stat-big">${big}</div>
            ${breakdown.length ? '<ul class="stat-breakdown">' + breakdown.map(([k, v]) => `<li><span>${k}</span><strong>${v}</strong></li>`).join('') + '</ul>' : ''}
        </div>
    `;
}

// ===== Operator profile =====
PANE_LOADERS.operator = loadOperator;
async function loadOperator() {
    try {
        const r = await fetch(API_BASE_URL + '/admin/operator');
        if (!r.ok) return;
        const p = await r.json();
        const fields = ['company_name', 'tagline', 'licence_number', 'logo_url',
            'support_phone', 'whatsapp_number', 'support_email', 'website',
            'office_address', 'business_hours', 'years_active', 'description'];
        fields.forEach(f => {
            const el = document.getElementById('op_' + f);
            if (el) el.value = p[f] != null ? p[f] : '';
        });
    } catch (e) { /* silent */ }
}

async function saveOperator(event) {
    event.preventDefault();
    const msg = document.getElementById('operatorMessage');
    msg.textContent = '';
    const payload = {
        company_name: val('op_company_name'),
        tagline: val('op_tagline'),
        licence_number: val('op_licence_number'),
        logo_url: val('op_logo_url'),
        support_phone: val('op_support_phone'),
        whatsapp_number: val('op_whatsapp_number'),
        support_email: val('op_support_email'),
        website: val('op_website'),
        office_address: val('op_office_address'),
        business_hours: val('op_business_hours'),
        years_active: val('op_years_active') ? parseInt(val('op_years_active'), 10) : null,
        description: val('op_description')
    };
    try {
        const r = await authFetch(API_BASE_URL + '/admin/operator', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await r.json();
        if (!r.ok) { msg.className = 'form-message error'; msg.textContent = data.error || 'Failed to save'; return; }
        msg.className = 'form-message success'; msg.textContent = '✅ Saved.';
    } catch (e) {
        msg.className = 'form-message error'; msg.textContent = 'Network error: ' + e.message;
    }
}

// ===== Staff =====
PANE_LOADERS.staff = loadStaff;
async function loadStaff() {
    const list = document.getElementById('staffList');
    try {
        const r = await authFetch(API_BASE_URL + '/admin/staff');
        const staff = await r.json();
        if (!staff.length) { list.innerHTML = '<p style="color:#888">No staff yet.</p>'; return; }
        list.innerHTML = staff.map(s => `
            <div class="staff-card ${s.is_active ? '' : 'inactive'}">
                <div class="staff-photo">${s.photo_url ? `<img src="${s.photo_url}" alt="${s.display_name}">` : '🧑‍🦱'}</div>
                <div class="staff-name">${esc(s.display_name)}</div>
                <div class="staff-role">${esc(s.role_title || 'Trek Guide')}</div>
                <div class="staff-meta">@${esc(s.username || '')}${s.email ? ' · ' + esc(s.email) : ''}</div>
                ${s.years_experience ? `<div class="staff-meta">${s.years_experience} yrs experience</div>` : ''}
                ${s.languages ? `<div class="staff-meta">${esc(s.languages)}</div>` : ''}
                ${s.guide_licence_no ? `<div class="staff-meta">Licence: ${esc(s.guide_licence_no)}</div>` : ''}
                <div class="staff-actions">
                    <button class="btn-mini" onclick="toggleStaffActive(${s.id}, ${!s.is_active})">${s.is_active ? 'Deactivate' : 'Reactivate'}</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        list.innerHTML = '<p style="color:#d33">Failed to load staff.</p>';
    }
}

async function toggleStaffActive(staffId, makeActive) {
    if (!confirm(`${makeActive ? 'Reactivate' : 'Deactivate'} this staff member?`)) return;
    try {
        const r = await authFetch(`${API_BASE_URL}/admin/staff/${staffId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: makeActive })
        });
        if (!r.ok) { alert('Failed'); return; }
        loadStaff();
    } catch (e) { alert('Network error: ' + e.message); }
}

async function inviteStaff(event) {
    event.preventDefault();
    const msg = document.getElementById('staffMessage');
    msg.textContent = '';
    const payload = {
        username: val('st_username'),
        email: val('st_email'),
        first_name: val('st_first_name'),
        last_name: val('st_last_name'),
        phone: val('st_phone'),
        role_title: val('st_role_title'),
        years_experience: val('st_years_experience') ? parseInt(val('st_years_experience'), 10) : null,
        languages: val('st_languages'),
        guide_licence_no: val('st_licence'),
        photo_url: val('st_photo_url'),
        bio: val('st_bio'),
        certifications: val('st_certifications'),
        password: val('st_password') || undefined
    };
    try {
        const r = await authFetch(API_BASE_URL + '/admin/staff/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await r.json();
        if (!r.ok) { msg.className = 'form-message error'; msg.textContent = data.error || 'Failed'; return; }
        msg.className = 'form-message success';
        msg.innerHTML = `✅ Account created. Share these credentials with ${esc(payload.first_name)}: <code>${esc(data.username)}</code> / <code>${esc(data.temporary_password)}</code>`;
        document.getElementById('inviteCard').open = false;
        ['st_username', 'st_email', 'st_first_name', 'st_last_name', 'st_phone',
         'st_role_title', 'st_years_experience', 'st_languages', 'st_licence',
         'st_photo_url', 'st_bio', 'st_certifications', 'st_password'].forEach(id => {
             const el = document.getElementById(id); if (el) el.value = '';
         });
        loadStaff();
    } catch (e) {
        msg.className = 'form-message error'; msg.textContent = 'Network error: ' + e.message;
    }
}

// ===== Tour Catalogue =====
let tourFilter = '';

PANE_LOADERS.tours = () => loadTours(tourFilter);

async function loadTours(typeFilter) {
    tourFilter = typeFilter || '';
    document.querySelectorAll('[data-pane="tours"] .filter-pill').forEach(b => {
        const m = b.textContent.toLowerCase();
        const matches = (!typeFilter && m === 'all') ||
            (typeFilter === 'trek' && m === 'treks') ||
            (typeFilter === 'hike' && m === 'hikes') ||
            (typeFilter === 'pilgrimage' && m === 'pilgrimages');
        b.classList.toggle('active', !!matches);
    });
    const list = document.getElementById('toursList');
    try {
        const url = API_BASE_URL + '/admin/tours' + (typeFilter ? `?tour_type=${typeFilter}` : '');
        const r = await authFetch(url);
        const tours = await r.json();
        if (!tours.length) { list.innerHTML = '<p style="color:#888">No tours yet. Use the form above to add one.</p>'; return; }
        list.innerHTML = `
            <table class="admin-table">
                <thead><tr><th>Type</th><th>Name</th><th>Region</th><th>Duration</th><th>Difficulty</th><th>Stops</th><th>Events</th><th>Actions</th></tr></thead>
                <tbody>${tours.map(t => {
                    const typeBadge = (typeof tourTypeLabelHtml === 'function')
                        ? `<span class="inline-type">${tourTypeLabelHtml(t.tour_type, 13)}</span>`
                        : t.tour_type;
                    const region = (t.country && t.country !== 'Bhutan') ? t.country : (t.dzongkhag || '—');
                    return `
                    <tr>
                        <td>${typeBadge}</td>
                        <td><strong>${esc(t.name)}</strong>${t.religious_tradition ? `<br><small>${esc(t.religious_tradition)}</small>` : ''}</td>
                        <td>${esc(region)}</td>
                        <td>${t.duration_days || '—'} d${t.distance_km ? `<br><small>${t.distance_km} km</small>` : ''}</td>
                        <td>${esc(t.difficulty || '—')}</td>
                        <td>${t.stops.length}</td>
                        <td>${t.events_count > 0
                            ? '<strong>' + t.events_count + '</strong>'
                            : '<span style="color:#c0392b; font-weight:600;">0 — not bookable</span>'}</td>
                        <td class="row-actions">
                            <button class="btn-mini btn-go" onclick="scheduleEventForTour(${t.id})" title="Publish a dated departure tourists can book">+ Schedule departure</button>
                            <button class="btn-mini" onclick="openTourEdit(${t.id})">Edit</button>
                            <button class="btn-mini btn-warn" onclick="deleteTour(${t.id}, ${t.events_count})">Delete</button>
                        </td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table>`;
    } catch (e) {
        list.innerHTML = '<p style="color:#d33">Failed to load tours.</p>';
    }
}

function onTourTypeChange() {
    const tt = document.getElementById('t_tour_type').value;
    document.getElementById('t_religious_label').style.display = (tt === 'pilgrimage') ? '' : 'none';
    document.getElementById('t_sacred_label').style.display = (tt === 'pilgrimage') ? '' : 'none';
}

// Bridge: from a tour row, jump straight to the Tours & Events tab with the
// create-event form open and this tour pre-selected. This is THE step that
// makes a tour visible to tourists.
async function scheduleEventForTour(tourId) {
    // Switch to the Tours & Events tab
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'events'));
    document.querySelectorAll('.admin-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === 'events'));
    // Load the dropdowns + events list, then preselect the tour
    await populateEventFormDropdowns();
    loadEventsAdmin();
    const sel = document.getElementById('ev_trek_id');
    if (sel) sel.value = String(tourId);
    const card = document.getElementById('newEventCard');
    if (card) { card.open = true; card.scrollIntoView({behavior: 'smooth', block: 'start'}); }
    const titleEl = document.getElementById('ev_title');
    if (titleEl) titleEl.focus();
    const msg = document.getElementById('newEventMessage');
    if (msg) {
        msg.className = 'form-message';
        msg.style.color = '#1565c0';
        msg.textContent = 'Tour pre-selected. Fill in dates, lead guide, capacity & fee, then Create Event to publish it.';
    }
}

function addStopRow(data = {}) {
    const container = document.getElementById('stopsContainer');
    const row = document.createElement('div');
    row.className = 'stop-row';
    row.innerHTML = `
        <input class="stop-name" placeholder="Stop name *" value="${escAttr(data.stop_name || '')}">
        <input class="stop-altitude" type="number" placeholder="Altitude (m)" value="${data.altitude || ''}">
        <textarea class="stop-description" rows="2" placeholder="Short description">${esc(data.description || '')}</textarea>
        <button type="button" class="btn-mini btn-warn stop-remove" title="Remove stop" onclick="this.closest('.stop-row').remove()">✕</button>
    `;
    container.appendChild(row);
}

function gatherStops() {
    return Array.from(document.querySelectorAll('#stopsContainer .stop-row')).map(row => ({
        stop_name: row.querySelector('.stop-name').value.trim(),
        altitude: row.querySelector('.stop-altitude').value || null,
        description: row.querySelector('.stop-description').value.trim()
    })).filter(s => s.stop_name);
}

function resetTourForm() {
    document.getElementById('t_id').value = '';
    ['t_name','t_difficulty','t_dzongkhag','t_religious_tradition','t_duration_days','t_distance_km',
     't_altitude_start','t_altitude_end','t_best_season','t_image_url','t_description','t_sacred_sites'
    ].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('t_tour_type').value = 'trek';
    document.getElementById('t_country').value = 'Bhutan';
    document.getElementById('stopsContainer').innerHTML = '';
    document.getElementById('tourSubmitBtn').textContent = 'Create Tour';
    document.getElementById('tourFormSummary').textContent = '➕ Create a new tour';
    document.getElementById('tourMessage').textContent = '';
    document.getElementById('t_image_file').value = '';
    document.getElementById('t_image_preview').style.display = 'none';
    document.getElementById('t_image_upload_status').textContent = '';
    onTourTypeChange();
    document.getElementById('tourFormCard').open = false;
}

async function uploadTourImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const preview = document.getElementById('t_image_preview');
    const previewImg = document.getElementById('t_image_preview_img');
    const status = document.getElementById('t_image_upload_status');
    previewImg.src = URL.createObjectURL(file);
    preview.style.display = 'block';
    status.textContent = '⏳ Uploading…';
    status.style.color = '#666';
    const fd = new FormData();
    fd.append('image', file);
    try {
        const r = await authFetch(API_BASE_URL + '/admin/upload-image', { method: 'POST', body: fd });
        const data = await r.json();
        if (!r.ok) {
            status.textContent = '❌ ' + (data.error || 'Upload failed');
            status.style.color = '#d33';
            return;
        }
        document.getElementById('t_image_url').value = data.image_url;
        status.textContent = '✅ Uploaded — saved to: ' + data.image_url;
        status.style.color = '#1e7d32';
    } catch (e) {
        status.textContent = '❌ Network error: ' + e.message;
        status.style.color = '#d33';
    }
}

async function openTourEdit(tourId) {
    try {
        const r = await authFetch(`${API_BASE_URL}/admin/tours/${tourId}`);
        const t = await r.json();
        document.getElementById('t_id').value = t.id;
        document.getElementById('t_name').value = t.name || '';
        document.getElementById('t_tour_type').value = t.tour_type || 'trek';
        document.getElementById('t_difficulty').value = t.difficulty || '';
        document.getElementById('t_country').value = t.country || 'Bhutan';
        document.getElementById('t_dzongkhag').value = t.dzongkhag || '';
        document.getElementById('t_religious_tradition').value = t.religious_tradition || '';
        document.getElementById('t_duration_days').value = t.duration_days || '';
        document.getElementById('t_distance_km').value = t.distance_km || '';
        document.getElementById('t_altitude_start').value = t.altitude_start || '';
        document.getElementById('t_altitude_end').value = t.altitude_end || '';
        document.getElementById('t_best_season').value = t.best_season || '';
        document.getElementById('t_image_url').value = t.image_url || '';
        document.getElementById('t_description').value = t.description || '';
        document.getElementById('t_sacred_sites').value = t.sacred_sites || '';
        // Show existing image as preview when editing
        const preview = document.getElementById('t_image_preview');
        const previewImg = document.getElementById('t_image_preview_img');
        const status = document.getElementById('t_image_upload_status');
        if (t.image_url) {
            previewImg.src = t.image_url;
            preview.style.display = 'block';
            status.textContent = 'Current image — upload a new file to replace';
            status.style.color = '#888';
        } else {
            preview.style.display = 'none';
        }
        document.getElementById('t_image_file').value = '';
        onTourTypeChange();
        document.getElementById('stopsContainer').innerHTML = '';
        (t.stops || []).forEach(s => addStopRow(s));
        document.getElementById('tourSubmitBtn').textContent = 'Save Changes';
        document.getElementById('tourFormSummary').textContent = `✏️ Editing: ${t.name}`;
        document.getElementById('tourFormCard').open = true;
        document.getElementById('tourFormCard').scrollIntoView({behavior: 'smooth', block: 'start'});
    } catch (e) {
        alert('Failed to load tour: ' + e.message);
    }
}

async function submitTour(event) {
    event.preventDefault();
    const msg = document.getElementById('tourMessage');
    msg.textContent = ''; msg.className = 'form-message';
    const id = document.getElementById('t_id').value;

    // Explicit validation with a clear, visible message (don't rely only on
    // the browser's easy-to-miss native tooltip).
    const missing = [];
    if (!val('t_name')) missing.push('Name');
    if (!val('t_tour_type')) missing.push('Tour type');
    if (!val('t_dzongkhag')) missing.push('Region / Dzongkhag');
    if (missing.length) {
        msg.className = 'form-message error';
        msg.textContent = '⚠ Please fill in the required field(s): ' + missing.join(', ');
        const firstId = missing[0] === 'Name' ? 't_name' : missing[0] === 'Tour type' ? 't_tour_type' : 't_dzongkhag';
        const el = document.getElementById(firstId);
        if (el) { el.focus(); el.scrollIntoView({behavior:'smooth', block:'center'}); }
        return;
    }

    const payload = {
        name: val('t_name'),
        tour_type: val('t_tour_type'),
        difficulty: val('t_difficulty'),
        country: val('t_country') || 'Bhutan',
        dzongkhag: val('t_dzongkhag'),
        religious_tradition: val('t_religious_tradition'),
        duration_days: val('t_duration_days') ? parseInt(val('t_duration_days'), 10) : null,
        distance_km: val('t_distance_km') ? parseFloat(val('t_distance_km')) : null,
        altitude_start: val('t_altitude_start') ? parseInt(val('t_altitude_start'), 10) : null,
        altitude_end: val('t_altitude_end') ? parseInt(val('t_altitude_end'), 10) : null,
        best_season: val('t_best_season'),
        image_url: val('t_image_url'),
        description: val('t_description'),
        sacred_sites: val('t_sacred_sites'),
        stops: gatherStops()
    };
    try {
        const url = id ? `${API_BASE_URL}/admin/tours/${id}` : `${API_BASE_URL}/admin/tours`;
        const method = id ? 'PATCH' : 'POST';
        const r = await authFetch(url, {
            method, headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await r.json();
        if (!r.ok) { msg.className = 'form-message error'; msg.textContent = data.error || 'Failed'; return; }
        const savedName = payload.name;
        const wasEdit = !!id;
        resetTourForm();
        loadTours(tourFilter);
        // Persistent banner above the tour list (the in-form message gets cleared
        // and hidden when the form collapses).
        const banner = document.getElementById('tourSavedMsg');
        if (banner) {
            banner.style.display = 'block';
            banner.style.background = '#d4f4dd';
            banner.style.color = '#1e7d32';
            banner.innerHTML = wasEdit
                ? `✅ Tour "<strong>${esc(savedName)}</strong>" saved. <strong>Note:</strong> editing a tour does NOT publish it — click the green <strong>“+ Schedule departure”</strong> on its row to make it bookable by tourists.`
                : `✅ Tour "<strong>${esc(savedName)}</strong>" created. <strong>Next step:</strong> click the green <strong>“+ Schedule departure”</strong> on its row below to publish a dated departure tourists can book.`;
        }
    } catch (e) {
        msg.className = 'form-message error';
        msg.textContent = 'Network error: ' + e.message;
    }
}

async function deleteTour(tourId, eventsCount) {
    let warning = 'Delete this tour from the catalogue?\n\nIt will disappear from the Group Tours page, the public catalogue, and all dropdowns.';
    if (eventsCount > 0) {
        warning += `\n\n⚠ ${eventsCount} scheduled event${eventsCount !== 1 ? 's' : ''} reference${eventsCount === 1 ? 's' : ''} this tour and will ALSO be deleted (along with any participants).`;
    }
    warning += '\n\nThis cannot be undone.';
    if (!confirm(warning)) return;
    try {
        const r = await authFetch(`${API_BASE_URL}/admin/tours/${tourId}`, { method: 'DELETE' });
        const data = await r.json();
        if (!r.ok) { alert('Failed: ' + (data.error || r.status)); return; }
        loadTours(tourFilter);
    } catch (e) { alert('Network error: ' + e.message); }
}

function escAttr(s) {
    if (s == null) return '';
    return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// ===== Accommodations =====
let accFilter = '';
PANE_LOADERS.accommodations = () => loadAccommodations(accFilter);
async function loadAccommodations(verified) {
    accFilter = verified;
    document.querySelectorAll('[data-pane="accommodations"] .filter-pill').forEach((b, i) => {
        const want = ['', 'false', 'true'][i];
        b.classList.toggle('active', want === verified);
    });
    const list = document.getElementById('accList');
    try {
        const url = API_BASE_URL + '/admin/accommodations' + (verified ? `?verified=${verified}` : '');
        const r = await authFetch(url);
        const accs = await r.json();
        if (!accs.length) { list.innerHTML = '<p style="color:#888">No accommodations match.</p>'; return; }
        list.innerHTML = `
            <table class="admin-table">
                <thead><tr><th>Name</th><th>Owner</th><th>Region</th><th>Rooms</th><th>Status</th><th></th></tr></thead>
                <tbody>${accs.map(a => `
                    <tr>
                        <td><strong>${esc(a.name)}</strong><br><small>${esc(a.address || '')}</small></td>
                        <td>${esc(a.owner_name || '')}<br><small>${esc(a.owner_email || '')}${a.owner_phone ? ' · ' + esc(a.owner_phone) : ''}</small></td>
                        <td>${esc(a.dzongkhag || '')}</td>
                        <td>${a.rooms_count}</td>
                        <td>${a.is_verified
                            ? '<span class="pill-good">✓ Verified</span>'
                            : '<span class="pill-warn">⚠ Pending</span>'}</td>
                        <td class="row-actions">
                            <button class="btn-mini" onclick="viewAccommodation(${a.id})">View</button>
                            ${a.is_verified
                                ? `<button class="btn-mini" onclick="setAccVerified(${a.id}, false)">Unverify</button>`
                                : `<button class="btn-mini btn-go" onclick="setAccVerified(${a.id}, true)">Verify</button>`}
                            <button class="btn-mini btn-warn" onclick="deleteAccommodation(${a.id})">Delete</button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
    } catch (e) {
        list.innerHTML = '<p style="color:#d33">Failed to load.</p>';
    }
}

async function setAccVerified(id, makeVerified) {
    if (!confirm(`${makeVerified ? 'Verify' : 'Unverify'} this accommodation?`)) return;
    try {
        const r = await authFetch(`${API_BASE_URL}/admin/accommodations/${id}/verify`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_verified: makeVerified })
        });
        if (!r.ok) { alert('Failed'); return; }
        const modal = document.getElementById('accViewModal');
        if (modal) modal.classList.remove('show');
        loadAccommodations(accFilter);
    } catch (e) { alert('Network error: ' + e.message); }
}

async function viewAccommodation(accId) {
    const modal = document.getElementById('accViewModal');
    const content = document.getElementById('accViewContent');
    content.innerHTML = '<p>Loading…</p>';
    modal.classList.add('show');
    try {
        const r = await fetch(API_BASE_URL + '/accommodations/' + accId);
        const a = await r.json();
        const gallery = (a.image_gallery && a.image_gallery.length) ? a.image_gallery : (a.image_url ? [a.image_url] : []);
        content.innerHTML = `
            <h2>${esc(a.name)}</h2>
            <p>${a.is_verified
                ? '<span class="pill-good">✓ Verified</span>'
                : '<span class="pill-warn">⚠ Pending verification</span>'}</p>
            ${typeof buildImageGalleryHtml === 'function' ? buildImageGalleryHtml(gallery) : ''}
            <p style="margin:0.75rem 0; color:#555;">${esc(a.description || 'No description.')}</p>
            <div class="trek-info-detail">
                <p><strong>📍 Region:</strong> ${esc(a.dzongkhag || 'N/A')}</p>
                <p><strong>🏠 Address:</strong> ${esc(a.address || 'N/A')}</p>
                <p><strong>📞 Phone:</strong> ${esc(a.phone || 'N/A')}</p>
                <p><strong>📸 Photos:</strong> ${gallery.length}</p>
                <p><strong>⭐ Rating:</strong> ${a.rating ? a.rating.toFixed(1) + ' / 5' : 'No ratings yet'}</p>
            </div>
            <h3 style="margin-top:1rem">Rooms (${a.rooms.length})</h3>
            ${a.rooms.length
                ? a.rooms.map(rm => `<div class="confirm-section"><strong>${esc(rm.room_type || 'Room')}</strong> — Nu. ${rm.price_per_night}/night · sleeps ${rm.capacity}${rm.amenities ? '<br><small>' + esc(rm.amenities) + '</small>' : ''}</div>`).join('')
                : '<p style="color:#888">No rooms listed.</p>'}
            <div class="admin-form-actions" style="margin-top:1.25rem">
                ${a.is_verified
                    ? `<button class="btn btn-outline-primary" onclick="setAccVerified(${a.id}, false)">Unverify</button>`
                    : `<button class="btn btn-primary" onclick="setAccVerified(${a.id}, true)">✓ Approve / Verify</button>`}
                <button class="btn-mini btn-warn" onclick="deleteAccommodation(${a.id})">🗑 Delete this accommodation</button>
            </div>
        `;
    } catch (e) {
        content.innerHTML = '<p style="color:#d33">Could not load accommodation.</p>';
    }
}

async function deleteAccommodation(accId) {
    if (!confirm('Permanently DELETE this accommodation?\n\nIts rooms and any existing bookings will also be deleted. This cannot be undone.')) return;
    try {
        const r = await authFetch(`${API_BASE_URL}/admin/accommodations/${accId}`, { method: 'DELETE' });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) { alert('Failed: ' + (data.error || r.status)); return; }
        const modal = document.getElementById('accViewModal');
        if (modal) modal.classList.remove('show');
        loadAccommodations(accFilter);
    } catch (e) { alert('Network error: ' + e.message); }
}

// ===== Events =====
PANE_LOADERS.events = () => {
    populateEventFormDropdowns();
    loadEventsAdmin();
};

async function populateEventFormDropdowns() {
    const trekSelect = document.getElementById('ev_trek_id');
    const guideSelect = document.getElementById('ev_lead_guide_user_id');
    if (!trekSelect || !guideSelect) return;
    if (trekSelect.dataset.loaded === '1' && guideSelect.dataset.loaded === '1') return;
    try {
        const [tr, sr] = await Promise.all([
            fetch(API_BASE_URL + '/treks/'),
            authFetch(API_BASE_URL + '/admin/staff')
        ]);
        const treks = await tr.json();
        const staff = await sr.json();

        const typeOrder = { trek: 0, hike: 1, pilgrimage: 2 };
        treks.sort((a, b) => (typeOrder[a.tour_type] - typeOrder[b.tour_type]) || a.name.localeCompare(b.name));
        const typeLabel = (t) => t === 'pilgrimage' ? 'Pilgrimage' : t === 'hike' ? 'Hike' : 'Trek';
        trekSelect.innerHTML = '<option value="">Select tour…</option>' +
            treks.map(t => {
                const region = (t.country && t.country !== 'Bhutan') ? t.country : (t.dzongkhag || 'Bhutan');
                return `<option value="${t.id}">[${typeLabel(t.tour_type)}] ${esc(t.name)} — ${esc(region)}${t.difficulty ? ' · ' + esc(t.difficulty) : ''}</option>`;
            }).join('');
        trekSelect.dataset.loaded = '1';

        const activeStaff = Array.isArray(staff) ? staff.filter(s => s.is_active) : [];
        guideSelect.innerHTML = activeStaff.length
            ? '<option value="">Select staff member…</option>' + activeStaff.map(s =>
                `<option value="${s.user_id}">${esc(s.display_name)} — ${esc(s.role_title || 'Trek Guide')}</option>`).join('')
            : '<option value="">No active staff — invite one in the Staff tab first</option>';
        guideSelect.dataset.loaded = '1';
    } catch (e) {
        // Make failures visible instead of leaving dropdowns stuck on "Loading…"
        if (trekSelect) trekSelect.innerHTML = '<option value="">⚠ Could not load tours — reload the page</option>';
        if (guideSelect) guideSelect.innerHTML = '<option value="">⚠ Could not load staff — reload the page</option>';
        if (typeof showToast === 'function') showToast('Could not load the event form lists. Reload the page (Ctrl+Shift+R).', 'error', 8000);
    }
}

// Floating popup notification — cannot be missed. Used for event creation feedback.
function showToast(message, type, durationMs) {
    type = type || 'info';
    durationMs = durationMs || 6000;
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function () {
        toast.style.opacity = '0';
        setTimeout(function () { toast.remove(); }, 300);
    }, durationMs);
}

// NOTE: must NOT be named "createEvent" — that collides with the built-in
// document.createEvent() in inline on* handler scope and throws before our code runs.
async function submitNewEvent(event) {
    if (event && event.preventDefault) event.preventDefault();

    const msg = document.getElementById('newEventMessage');
    const btn = document.getElementById('createEventBtn');
    // setMsg is null-safe — works even if the message span is missing.
    const setMsg = function (text, color) {
        if (msg) { msg.className = 'form-message'; msg.style.color = color; msg.textContent = text; }
    };

    try {
        setMsg('⏳ Submitting…', '#1565c0');
        if (msg && msg.scrollIntoView) msg.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // --- Validation (always shows a visible toast) ---
        const missing = [];
        if (!val('ev_trek_id')) missing.push('Tour');
        if (!val('ev_lead_guide_user_id')) missing.push('Lead Guide');
        if (!val('ev_title')) missing.push('Event Title');
        if (!val('ev_start_date')) missing.push('Start Date');
        if (!val('ev_end_date')) missing.push('End Date');
        if (!val('ev_capacity')) missing.push('Capacity');
        if (!val('ev_per_person_fee')) missing.push('Per-person Fee');
        if (missing.length) {
            setMsg('⚠ Please fill in: ' + missing.join(', '), '#c0392b');
            showToast('Cannot create event — missing: ' + missing.join(', '), 'error');
            const idMap = {'Tour':'ev_trek_id','Lead Guide':'ev_lead_guide_user_id','Event Title':'ev_title',
                           'Start Date':'ev_start_date','End Date':'ev_end_date','Capacity':'ev_capacity',
                           'Per-person Fee':'ev_per_person_fee'};
            const el = document.getElementById(idMap[missing[0]]);
            if (el) { el.focus(); el.scrollIntoView({behavior:'smooth', block:'center'}); }
            return;
        }
        if (val('ev_end_date') < val('ev_start_date')) {
            setMsg('⚠ End Date must be on or after Start Date.', '#c0392b');
            showToast('End Date must be on or after Start Date.', 'error');
            return;
        }

        const payload = {
            trek_id: parseInt(val('ev_trek_id'), 10),
            lead_guide_user_id: parseInt(val('ev_lead_guide_user_id'), 10),
            title: val('ev_title'),
            start_date: val('ev_start_date'),
            end_date: val('ev_end_date'),
            capacity: parseInt(val('ev_capacity'), 10) || 10,
            per_person_fee: parseFloat(val('ev_per_person_fee')) || 0,
            meeting_point: val('ev_meeting_point'),
            reporting_time: val('ev_reporting_time'),
            contact_phone: val('ev_contact_phone'),
            featured_guest: val('ev_featured_guest'),
            featured_guest_role: val('ev_featured_guest_role'),
            description: val('ev_description'),
            includes: val('ev_includes'),
            excludes: val('ev_excludes')
        };

        const editId = val('ev_id');
        if (btn) { btn.disabled = true; btn.textContent = editId ? '⏳ Saving…' : '⏳ Creating…'; }

        const r = await authFetch(
            API_BASE_URL + '/admin/events' + (editId ? '/' + editId : ''),
            {
                method: editId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }
        );
        const data = await r.json().catch(function () { return {}; });

        if (!r.ok) {
            const err = data.error || ('Server error (HTTP ' + r.status + ')');
            setMsg('❌ ' + err, '#c0392b');
            showToast((editId ? 'Event update' : 'Event creation') + ' failed: ' + err, 'error', 8000);
            return;
        }

        // --- SUCCESS ---
        if (editId) {
            setMsg('✅ Event #' + editId + ' updated — changes are now LIVE everywhere.', '#1e7d32');
            showToast('✅ Event updated — changes are live on the homepage & Group Tours page.', 'success', 8000);
            resetEventForm();
        } else {
            setMsg('✅ Event #' + data.event_id + ' created — now LIVE on homepage, Group Tours & dashboards.', '#1e7d32');
            showToast('✅ Event created: "' + (data.tour_name || 'Tour') + '" is now LIVE on the homepage and Group Tours page.', 'success', 8000);
            ['ev_trek_id', 'ev_lead_guide_user_id', 'ev_title', 'ev_start_date', 'ev_end_date',
             'ev_per_person_fee', 'ev_meeting_point', 'ev_reporting_time', 'ev_contact_phone',
             'ev_featured_guest', 'ev_featured_guest_role',
             'ev_description', 'ev_includes', 'ev_excludes'].forEach(function (id) {
                const el = document.getElementById(id); if (el) el.value = '';
            });
            const cap = document.getElementById('ev_capacity'); if (cap) cap.value = '10';
        }
        await loadEventsAdmin();   // refresh the list below immediately
    } catch (e) {
        setMsg('❌ Unexpected error: ' + e.message, '#c0392b');
        showToast('Unexpected error: ' + e.message, 'error', 8000);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = val('ev_id') ? '💾 Save Changes' : '📅 Create Event';
        }
    }
}

function resetEventForm() {
    const idEl = document.getElementById('ev_id'); if (idEl) idEl.value = '';
    ['ev_trek_id', 'ev_lead_guide_user_id', 'ev_title', 'ev_start_date', 'ev_end_date',
     'ev_per_person_fee', 'ev_meeting_point', 'ev_reporting_time', 'ev_contact_phone',
     'ev_featured_guest', 'ev_featured_guest_role',
     'ev_description', 'ev_includes', 'ev_excludes'].forEach(function (id) {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    const cap = document.getElementById('ev_capacity'); if (cap) cap.value = '10';
    const btn = document.getElementById('createEventBtn'); if (btn) btn.textContent = '📅 Create Event';
    const cancelBtn = document.getElementById('cancelEventEditBtn'); if (cancelBtn) cancelBtn.style.display = 'none';
    const summary = document.getElementById('eventFormSummary'); if (summary) summary.textContent = '➕ Create a new departure';
    const msg = document.getElementById('newEventMessage'); if (msg) msg.textContent = '';
}

async function openEventEdit(eventId) {
    try {
        await populateEventFormDropdowns();   // ensure the tour + guide dropdowns have options
        const r = await fetch(API_BASE_URL + '/events/' + eventId);
        const ev = await r.json();
        if (!r.ok) { showToast('Could not load event #' + eventId, 'error'); return; }

        const setVal = function (id, v) { const el = document.getElementById(id); if (el) el.value = (v == null ? '' : v); };
        setVal('ev_id', ev.id);
        setVal('ev_trek_id', ev.trek_id);
        setVal('ev_lead_guide_user_id', ev.organiser_id);
        setVal('ev_title', ev.title);
        setVal('ev_start_date', ev.start_date);
        setVal('ev_end_date', ev.end_date);
        setVal('ev_capacity', ev.capacity);
        setVal('ev_per_person_fee', ev.per_person_fee);
        setVal('ev_meeting_point', ev.meeting_point);
        setVal('ev_reporting_time', ev.reporting_time);
        setVal('ev_contact_phone', ev.contact_phone);
        setVal('ev_featured_guest', ev.featured_guest);
        setVal('ev_featured_guest_role', ev.featured_guest_role);
        setVal('ev_description', ev.description);
        setVal('ev_includes', ev.includes);
        setVal('ev_excludes', ev.excludes);

        const btn = document.getElementById('createEventBtn'); if (btn) btn.textContent = '💾 Save Changes';
        const cancelBtn = document.getElementById('cancelEventEditBtn'); if (cancelBtn) cancelBtn.style.display = '';
        const summary = document.getElementById('eventFormSummary'); if (summary) summary.textContent = '✏️ Editing: ' + ev.title;
        const card = document.getElementById('newEventCard'); if (card) { card.open = true; card.scrollIntoView({behavior:'smooth', block:'start'}); }
        const msg = document.getElementById('newEventMessage');
        if (msg) { msg.className = 'form-message'; msg.style.color = '#1565c0'; msg.textContent = 'Editing event #' + ev.id + ' — change any field (e.g. add a featured guest) and click Save Changes.'; }
    } catch (e) {
        showToast('Could not load event: ' + e.message, 'error');
    }
}

async function loadEventsAdmin() {
    const list = document.getElementById('evtList');
    try {
        const r = await authFetch(API_BASE_URL + '/admin/events');
        const events = await r.json();
        if (!events.length) { list.innerHTML = '<p style="color:#888">No events scheduled. Staff can create events from their dashboard.</p>'; return; }
        list.innerHTML = `
            <table class="admin-table">
                <thead><tr><th>Title</th><th>Type</th><th>Tour</th><th>Dates</th><th>Spots</th><th>Fee</th><th>Status</th><th></th></tr></thead>
                <tbody>${events.map(e => {
                    const start = new Date(e.start_date).toLocaleDateString('en-US', {month:'short', day:'numeric'});
                    const end = new Date(e.end_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
                    const type = `<span class="inline-type">${tourTypeLabelHtml(e.tour_type, 13)}</span>`;
                    return `
                    <tr>
                        <td><strong>${esc(e.title)}</strong><br><small>by ${esc(e.organiser_name || '')}</small></td>
                        <td>${type}</td>
                        <td>${esc(e.trek_name || '')}<br><small>${esc(e.country || '')}</small></td>
                        <td>${start} → ${end}</td>
                        <td>${e.confirmed_count}/${e.capacity}</td>
                        <td>Nu. ${e.per_person_fee.toLocaleString()}</td>
                        <td><span class="status-pill status-${e.status}">${e.status.toUpperCase()}</span></td>
                        <td class="row-actions">
                            <button class="btn-mini" onclick="openEventEdit(${e.id})" title="Edit this event">Edit</button>
                            ${e.status !== 'cancelled' && e.status !== 'completed' ? `<button class="btn-mini btn-warn" onclick="cancelAdminEvent(${e.id})" title="Mark as cancelled (preserves history)">Cancel</button>` : ''}
                            <button class="btn-mini btn-warn" onclick="deleteAdminEvent(${e.id}, ${e.confirmed_count})" title="Permanently delete from database">Delete</button>
                        </td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table>`;
    } catch (e) {
        list.innerHTML = '<p style="color:#d33">Failed to load events.</p>';
    }
}

async function cancelAdminEvent(eventId) {
    if (!confirm('Cancel this event?\n\nParticipants will see it as CANCELLED but the record is preserved.')) return;
    try {
        const r = await authFetch(`${API_BASE_URL}/events/${eventId}`, { method: 'DELETE' });
        if (!r.ok) {
            const d = await r.json().catch(() => ({}));
            alert('Failed: ' + (d.error || r.status));
            return;
        }
        loadEventsAdmin();
    } catch (e) { alert('Network error: ' + e.message); }
}

async function deleteAdminEvent(eventId, confirmedCount) {
    let warning = `Permanently DELETE event #${eventId} from the database?`;
    if (confirmedCount > 0) {
        warning += `\n\n⚠ This event has ${confirmedCount} participant${confirmedCount !== 1 ? 's' : ''}. Their participation records will also be deleted.`;
    }
    warning += '\n\nThis cannot be undone. Use Cancel instead to preserve history.';
    if (!confirm(warning)) return;
    try {
        const r = await authFetch(`${API_BASE_URL}/admin/events/${eventId}`, { method: 'DELETE' });
        if (!r.ok) {
            const d = await r.json().catch(() => ({}));
            alert('Failed: ' + (d.error || r.status));
            return;
        }
        loadEventsAdmin();
    } catch (e) { alert('Network error: ' + e.message); }
}

// ===== Bookings =====
let bkFilter = '';
PANE_LOADERS.bookings = () => loadBookings(bkFilter);
async function loadBookings(status) {
    bkFilter = status;
    document.querySelectorAll('[data-pane="bookings"] .filter-pill').forEach((b) => {
        const t = b.textContent.toLowerCase();
        b.classList.toggle('active', (!status && t === 'all') || (status && t === status));
    });
    const list = document.getElementById('bkList');
    try {
        const url = API_BASE_URL + '/admin/bookings' + (status ? `?status=${status}` : '');
        const r = await authFetch(url);
        const bookings = await r.json();
        if (!bookings.length) { list.innerHTML = '<p style="color:#888">No bookings match.</p>'; return; }
        list.innerHTML = `
            <table class="admin-table">
                <thead><tr><th>Ref</th><th>Guest</th><th>Stay</th><th>Dates</th><th>Guests</th><th>Total</th><th>Status</th></tr></thead>
                <tbody>${bookings.map(b => {
                    const ci = new Date(b.check_in_date).toLocaleDateString('en-US', {month:'short', day:'numeric'});
                    const co = new Date(b.check_out_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
                    return `
                    <tr>
                        <td>#${b.id}</td>
                        <td>${esc(b.guest_name || '')}<br><small>${esc(b.guest_email || '')}${b.guest_phone ? ' · ' + esc(b.guest_phone) : ''}</small></td>
                        <td>${esc(b.accommodation_name || '')}<br><small>${esc(b.room_type || '')}</small></td>
                        <td>${ci} → ${co}</td>
                        <td>${b.number_of_guests}</td>
                        <td>Nu. ${b.total_price.toLocaleString()}</td>
                        <td><span class="status-pill status-${b.status}">${b.status.toUpperCase()}</span></td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table>`;
    } catch (e) {
        list.innerHTML = '<p style="color:#d33">Failed to load bookings.</p>';
    }
}

// ===== Users =====
let usrFilter = '';
PANE_LOADERS.users = () => loadUsers(usrFilter);
async function loadUsers(userType) {
    usrFilter = userType;
    document.querySelectorAll('[data-pane="users"] .filter-pill').forEach(b => {
        const m = b.textContent.toLowerCase();
        const isAll = m === 'all';
        const matches = isAll && !userType
            || (userType === 'tourist' && m === 'tourist')
            || (userType === 'local_tourist' && m.includes('local'))
            || (userType === 'host' && m === 'host')
            || (userType === 'trek_organiser' && m === 'staff')
            || (userType === 'admin' && m === 'admin');
        b.classList.toggle('active', !!matches);
    });
    const list = document.getElementById('userList');
    try {
        const url = API_BASE_URL + '/admin/users' + (userType ? `?user_type=${userType}` : '');
        const r = await authFetch(url);
        const users = await r.json();
        if (!users.length) { list.innerHTML = '<p style="color:#888">No users match.</p>'; return; }
        list.innerHTML = `
            <table class="admin-table">
                <thead><tr><th>User</th><th>Type</th><th>Email Verified</th><th>Active</th><th>Joined</th><th></th></tr></thead>
                <tbody>${users.map(u => {
                    const joined = u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'}) : '—';
                    return `
                    <tr>
                        <td><strong>${esc(u.first_name || '')} ${esc(u.last_name || '')}</strong><br><small>@${esc(u.username)} · ${esc(u.email)}${u.phone ? ' · ' + esc(u.phone) : ''}</small></td>
                        <td><span class="role-pill role-${u.user_type}">${u.user_type}</span></td>
                        <td>${u.email_verified ? '✓' : '—'}</td>
                        <td>${u.is_active ? '✓' : '✗'}</td>
                        <td>${joined}</td>
                        <td>${u.user_type !== 'admin'
                            ? `<button class="btn-mini ${u.is_active ? 'btn-warn' : 'btn-go'}" onclick="setUserActive(${u.id}, ${!u.is_active})">${u.is_active ? 'Suspend' : 'Reactivate'}</button>`
                            : ''}</td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table>`;
    } catch (e) {
        list.innerHTML = '<p style="color:#d33">Failed to load.</p>';
    }
}

async function setUserActive(userId, makeActive) {
    if (!confirm(`${makeActive ? 'Reactivate' : 'Suspend'} this user account?`)) return;
    try {
        const r = await authFetch(`${API_BASE_URL}/admin/users/${userId}/active`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: makeActive })
        });
        if (!r.ok) { const d = await r.json(); alert('Failed: ' + (d.error || '')); return; }
        loadUsers(usrFilter);
    } catch (e) { alert('Network error: ' + e.message); }
}

// ===== Images =====
PANE_LOADERS.images = loadImages;
async function loadImages() {
    const list = document.getElementById('imagesList');
    try {
        const r = await fetch(API_BASE_URL + '/admin/images');
        const imgs = await r.json();
        if (!imgs.length) { list.innerHTML = '<p style="color:#888">No images yet.</p>'; return; }
        list.innerHTML = imgs.map(img => `
            <div class="image-card">
                <img src="${esc(img.image_path)}" alt="${esc(img.image_name)}" onerror="this.style.display='none'">
                <div class="image-info">
                    <strong>${esc(img.image_name)}</strong>
                    <small>${esc(img.section)}</small>
                    ${img.description ? `<p>${esc(img.description)}</p>` : ''}
                </div>
                <button class="btn-mini btn-warn" onclick="deleteImage(${img.id})">Delete</button>
            </div>
        `).join('');
    } catch (e) {
        list.innerHTML = '<p style="color:#d33">Failed to load images.</p>';
    }
}

async function uploadImage(event) {
    event.preventDefault();
    const msg = document.getElementById('imageMessage');
    msg.textContent = '';
    const file = document.getElementById('imageFile').files[0];
    const section = document.getElementById('imageSection').value;
    const description = document.getElementById('imageDescription').value;
    if (!file || !section) return;
    const fd = new FormData();
    fd.append('image', file);
    fd.append('section', section);
    fd.append('description', description);
    try {
        const r = await authFetch(API_BASE_URL + '/admin/images/upload', {
            method: 'POST',
            body: fd
        });
        const data = await r.json();
        if (!r.ok) { msg.className = 'form-message error'; msg.textContent = data.error || 'Failed'; return; }
        msg.className = 'form-message success'; msg.textContent = '✅ Uploaded.';
        document.getElementById('imageFile').value = '';
        document.getElementById('imageSection').value = '';
        document.getElementById('imageDescription').value = '';
        loadImages();
    } catch (e) {
        msg.className = 'form-message error'; msg.textContent = 'Network error: ' + e.message;
    }
}

async function deleteImage(id) {
    if (!confirm('Delete this image?')) return;
    try {
        const r = await authFetch(`${API_BASE_URL}/admin/images/${id}`, { method: 'DELETE' });
        if (!r.ok) { alert('Failed'); return; }
        loadImages();
    } catch (e) { alert('Network error: ' + e.message); }
}

// ===== Trek Moments =====
PANE_LOADERS.moments = () => {
    populateMomentTrekDropdown();
    loadMoments();
};

async function populateMomentTrekDropdown() {
    const sel = document.getElementById('mo_trek_id');
    if (!sel || sel.dataset.loaded === '1') return;
    try {
        const r = await fetch(API_BASE_URL + '/treks/');
        const treks = await r.json();
        sel.innerHTML = '<option value="">— none —</option>' +
            treks.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
        sel.dataset.loaded = '1';
    } catch (e) { /* silent */ }
}

async function uploadMomentImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const status = document.getElementById('mo_upload_status');
    const preview = document.getElementById('mo_preview');
    const previewImg = document.getElementById('mo_preview_img');
    previewImg.src = URL.createObjectURL(file);
    preview.style.display = 'block';
    status.textContent = '⏳ Uploading…';
    status.style.color = '#666';
    const fd = new FormData();
    fd.append('image', file);
    try {
        const r = await authFetch(API_BASE_URL + '/admin/upload-image', { method: 'POST', body: fd });
        const data = await r.json();
        if (!r.ok) { status.textContent = '❌ ' + (data.error || 'Upload failed'); status.style.color = '#d33'; return; }
        document.getElementById('mo_image_url').value = data.image_url;
        status.textContent = '✅ Photo ready';
        status.style.color = '#1e7d32';
    } catch (e) {
        status.textContent = '❌ Network error'; status.style.color = '#d33';
    }
}

async function submitMoment(event) {
    event.preventDefault();
    const msg = document.getElementById('momentMessage');
    msg.className = 'form-message';
    const imageUrl = val('mo_image_url');
    if (!imageUrl) {
        msg.classList.add('error');
        msg.textContent = '⚠ Upload a photo first.';
        return;
    }
    const payload = {
        image_url: imageUrl,
        caption: val('mo_caption'),
        trek_id: val('mo_trek_id') ? parseInt(val('mo_trek_id'), 10) : null
    };
    try {
        const r = await authFetch(API_BASE_URL + '/admin/moments', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await r.json();
        if (!r.ok) { msg.className = 'form-message error'; msg.textContent = data.error || 'Failed'; return; }
        msg.className = 'form-message success';
        msg.textContent = '✅ Moment posted — now live in the public gallery.';
        ['mo_image_url', 'mo_caption'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        document.getElementById('mo_trek_id').value = '';
        document.getElementById('mo_image_file').value = '';
        document.getElementById('mo_preview').style.display = 'none';
        loadMoments();
    } catch (e) {
        msg.className = 'form-message error';
        msg.textContent = 'Network error: ' + e.message;
    }
}

async function loadMoments() {
    const list = document.getElementById('momentsList');
    try {
        const r = await fetch(API_BASE_URL + '/moments/');
        const moments = await r.json();
        if (!moments.length) { list.innerHTML = '<p style="color:#888">No moments posted yet.</p>'; return; }
        list.innerHTML = moments.map(m => `
            <div class="moment-card">
                <img src="${esc(m.image_url)}" alt="" onerror="this.style.display='none'">
                <div class="moment-body">
                    ${m.trek_name ? `<div class="moment-trek">${esc(m.trek_name)}</div>` : ''}
                    ${m.caption ? `<div class="moment-caption">${esc(m.caption)}</div>` : ''}
                    <button class="btn-mini btn-warn" style="margin-top:0.5rem" onclick="deleteMoment(${m.id})">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        list.innerHTML = '<p style="color:#d33">Failed to load moments.</p>';
    }
}

async function deleteMoment(momentId) {
    if (!confirm('Delete this moment from the gallery?')) return;
    try {
        const r = await authFetch(`${API_BASE_URL}/admin/moments/${momentId}`, { method: 'DELETE' });
        if (!r.ok) { alert('Failed'); return; }
        loadMoments();
    } catch (e) { alert('Network error: ' + e.message); }
}

// ===== Helpers =====
function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}
