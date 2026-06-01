let organiserUser = null;
let allTreksForSelect = [];

async function initOrganiser(user) {
    organiserUser = user;
    await loadTreksForSelect();
    await loadMyEvents();
}

async function loadTreksForSelect() {
    try {
        const r = await fetch(API_BASE_URL + '/treks/');
        allTreksForSelect = await r.json();
        const select = document.getElementById('evTrek');
        if (!select) return;
        select.innerHTML = '<option value="">Choose a trek route…</option>'
            + allTreksForSelect.map(t => `<option value="${t.id}">${t.name} — ${t.dzongkhag} (${t.difficulty})</option>`).join('');
    } catch (e) {
        console.error('Failed to load treks for select', e);
    }
}

async function loadMyEvents() {
    const container = document.getElementById('myEventsList');
    try {
        const r = await authFetch(API_BASE_URL + '/events/mine');
        const events = await r.json();
        if (!events.length) {
            container.innerHTML = '<p style="color:#999; padding:1.5rem; background:#fafafa; border-radius:8px; text-align:center;">No events yet. Create your first one above!</p>';
            return;
        }
        container.innerHTML = events.map(renderEventCard).join('');
    } catch (e) {
        container.innerHTML = '<p style="color:#d33">Failed to load events.</p>';
    }
}

function renderEventCard(ev) {
    const start = new Date(ev.start_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
    const end = new Date(ev.end_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});

    const participants = ev.participants || [];
    const pendingCount = participants.filter(p => p.status === 'pending').length;
    const paidCount = participants.filter(p => p.status === 'paid').length;
    const cancelledCount = participants.filter(p => p.status === 'cancelled').length;

    const partsHtml = participants.length
        ? participants.map(p => `
            <div class="participant-row">
                <div>
                    <strong>${p.guest_name}</strong>
                    <span style="color:#888; font-size:0.85rem;"> · ${p.guest_phone || p.guest_email || ''}</span>
                    ${p.booking_ref ? `<div style="font-size:0.75rem; color:#666;">Ref: <code>${p.booking_ref}</code></div>` : ''}
                </div>
                <div style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap;">
                    <span class="booking-status-badge status-${p.status === 'paid' ? 'confirmed' : p.status === 'pending' ? 'pending' : 'cancelled'}">${p.status.toUpperCase()}</span>
                    ${p.status === 'pending' ? `<button class="btn-confirm-host" onclick="markParticipant(${ev.id}, ${p.id}, 'paid')">Mark Paid</button>` : ''}
                    ${p.status !== 'cancelled' ? `<button class="btn-cancel-host" onclick="markParticipant(${ev.id}, ${p.id}, 'cancelled')">Remove</button>` : ''}
                </div>
            </div>
        `).join('')
        : '<p style="color:#888; font-size:0.9rem; margin-top:0.5rem;">No one has joined yet.</p>';

    const fillCount = pendingCount + paidCount;
    const totalRevenuePotential = fillCount * ev.per_person_fee;
    const collected = paidCount * ev.per_person_fee;

    return `
        <div class="booking-row" style="grid-template-columns: 1fr; padding: 0;">
            <div style="padding: 1.25rem; border-bottom: 1px solid #f0f0f0;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; flex-wrap:wrap;">
                    <div>
                        <h4>${ev.title} <span class="event-meta-tag" style="font-weight:400; color:#888; font-size:0.85rem;">· #${ev.id} · <span class="inline-type">${tourTypeLabelHtml(ev.tour_type, 13)}</span></span></h4>
                        <p style="color:#666; font-size:0.9rem;">${ev.is_international ? '🌏 ' + ev.country : '📍 ' + (ev.trek_dzongkhag || 'Bhutan')} · ${ev.trek_name}</p>
                        <p style="color:#666; font-size:0.9rem;">📅 ${start} → ${end}</p>
                        <p style="color:#666; font-size:0.9rem;">🪙 Nu. ${ev.per_person_fee.toLocaleString()} per person · ${fillCount}/${ev.capacity} spots filled</p>
                        <p style="color:#666; font-size:0.9rem;">💰 Collected: <strong style="color:var(--primary-color)">Nu. ${collected.toLocaleString()}</strong> of potential Nu. ${totalRevenuePotential.toLocaleString()}</p>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:0.4rem; align-items:flex-end;">
                        <span class="booking-status-badge status-${ev.status === 'open' ? 'confirmed' : ev.status === 'cancelled' ? 'cancelled' : 'pending'}">${ev.status.toUpperCase()}</span>
                        ${ev.status === 'open' ? `<button class="btn-cancel-host" onclick="cancelEvent(${ev.id})">Cancel Event</button>` : ''}
                        ${ev.status === 'open' && fillCount > 0 ? `<button class="btn-confirm-host" onclick="markEventStatus(${ev.id}, 'in_progress')">Start Trek</button>` : ''}
                        ${ev.status === 'in_progress' ? `<button class="btn-confirm-host" onclick="markEventStatus(${ev.id}, 'completed')">Mark Completed</button>` : ''}
                    </div>
                </div>
            </div>
            <div style="padding: 1rem 1.25rem; background: #fafafa;">
                <strong style="font-size:0.9rem;">Participants (${pendingCount} pending · ${paidCount} paid${cancelledCount ? ' · ' + cancelledCount + ' cancelled' : ''})</strong>
                ${partsHtml}
            </div>
        </div>
    `;
}

async function submitEvent(event) {
    event.preventDefault();
    const msg = document.getElementById('eventFormMessage');
    msg.className = 'host-form-message';
    msg.textContent = '';

    const payload = {
        trek_id: parseInt(document.getElementById('evTrek').value, 10),
        title: document.getElementById('evTitle').value.trim(),
        start_date: document.getElementById('evStart').value,
        end_date: document.getElementById('evEnd').value,
        capacity: parseInt(document.getElementById('evCapacity').value, 10),
        per_person_fee: parseFloat(document.getElementById('evFee').value),
        meeting_point: document.getElementById('evMeeting').value.trim(),
        reporting_time: document.getElementById('evReportingTime').value,
        contact_phone: document.getElementById('evPhone').value.trim(),
        description: document.getElementById('evDescription').value.trim(),
        includes: document.getElementById('evIncludes').value.trim(),
        excludes: document.getElementById('evExcludes').value.trim()
    };

    try {
        const r = await authFetch(API_BASE_URL + '/events/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await r.json();
        if (!r.ok) {
            msg.className = 'host-form-message error';
            msg.textContent = data.error || 'Failed to create event';
            return;
        }
        msg.className = 'host-form-message success';
        msg.textContent = '✅ Event created! Participants can now find it on the Group Treks page.';
        document.getElementById('newEventForm').reset();
        document.getElementById('evCapacity').value = '10';
        document.getElementById('evPhone').value = organiserUser.phone || '';
        loadMyEvents();
    } catch (e) {
        msg.className = 'host-form-message error';
        msg.textContent = 'Network error: ' + e.message;
    }
}

async function markParticipant(eventId, participantId, status) {
    const action = status === 'paid' ? 'mark this participant as paid' : 'remove this participant';
    if (!confirm(`Are you sure you want to ${action}?`)) return;
    try {
        const r = await authFetch(`${API_BASE_URL}/events/${eventId}/participants/${participantId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, payment_method: status === 'paid' ? 'manual' : undefined })
        });
        const data = await r.json();
        if (!r.ok) { alert('Failed: ' + (data.error || 'Unknown')); return; }
        loadMyEvents();
    } catch (e) { alert('Network error: ' + e.message); }
}

async function markEventStatus(eventId, status) {
    const labels = { in_progress: 'mark this event as in progress', completed: 'mark this event as completed' };
    if (!confirm(`Are you sure you want to ${labels[status] || status}?`)) return;
    try {
        const r = await authFetch(`${API_BASE_URL}/events/${eventId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const data = await r.json();
        if (!r.ok) { alert('Failed: ' + (data.error || 'Unknown')); return; }
        loadMyEvents();
    } catch (e) { alert('Network error: ' + e.message); }
}

async function cancelEvent(eventId) {
    if (!confirm('Cancel this event? All participants will see it as cancelled.')) return;
    try {
        const r = await authFetch(`${API_BASE_URL}/events/${eventId}`, { method: 'DELETE' });
        const data = await r.json();
        if (!r.ok) { alert('Failed: ' + (data.error || 'Unknown')); return; }
        loadMyEvents();
    } catch (e) { alert('Network error: ' + e.message); }
}
