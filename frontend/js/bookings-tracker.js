async function loadMyBookings(userId) {
    const container = document.getElementById('myBookingsList');
    if (!container) return;
    try {
        const r = await authFetch(API_BASE_URL + '/bookings/?scope=mine');
        const list = await r.json();
        renderBookings(container, list, { isHost: false, actorId: userId });
    } catch (e) {
        container.innerHTML = '<p style="color:#d33">Failed to load bookings.</p>';
    }
}

async function loadHostBookings(hostId) {
    const container = document.getElementById('hostBookingsList');
    if (!container) return;
    try {
        const r = await authFetch(API_BASE_URL + '/bookings/?scope=host');
        const list = await r.json();
        renderBookings(container, list, { isHost: true, actorId: hostId });
    } catch (e) {
        container.innerHTML = '<p style="color:#d33">Failed to load bookings.</p>';
    }
}

function renderBookings(container, list, opts) {
    if (!list || list.length === 0) {
        container.innerHTML = `<p style="color:#999; padding: 1.5rem; background: #fafafa; border-radius: 8px; text-align: center;">${opts.isHost ? 'No booking requests yet.' : "You haven't booked anything yet. Browse Stays to make your first booking!"}</p>`;
        return;
    }

    container.innerHTML = list.map(b => {
        const checkIn = new Date(b.check_in_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
        const checkOut = new Date(b.check_out_date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
        const nights = Math.ceil((new Date(b.check_out_date) - new Date(b.check_in_date)) / 86400000);

        let actions = '';
        if (opts.isHost) {
            actions = `
                <div class="booking-actions-buttons">
                    ${b.status === 'pending' ? `<button class="btn-confirm-host" onclick="updateBookingStatus(${b.id}, 'confirmed', ${opts.isHost})">Confirm</button>` : ''}
                    ${b.status !== 'cancelled' && b.status !== 'completed' ? `<button class="btn-cancel-host" onclick="updateBookingStatus(${b.id}, 'cancelled', ${opts.isHost})">Decline</button>` : ''}
                    ${b.status === 'confirmed' ? `<button class="btn-confirm-host" onclick="updateBookingStatus(${b.id}, 'completed', ${opts.isHost})">Mark Completed</button>` : ''}
                </div>
            `;
        } else {
            actions = `
                <div class="booking-actions-buttons">
                    <button onclick="window.location.href='booking-confirmed.html?id=${b.id}'" style="background: var(--primary-color); color: white;">View</button>
                    ${b.status !== 'cancelled' && b.status !== 'completed' ? `<button class="btn-cancel-host" onclick="updateBookingStatus(${b.id}, 'cancelled', ${opts.isHost})">Cancel</button>` : ''}
                </div>
            `;
        }

        const guestLine = opts.isHost
            ? `<p>👤 Guest: <strong>${b.guest_name}</strong>${b.guest_phone ? ' · ' + b.guest_phone : ''}</p>`
            : '';

        return `
            <div class="booking-row">
                <div class="booking-row-info">
                    <h4>${b.accommodation_name} <span style="font-weight: 400; color: #888; font-size: 0.85rem;">· #${b.id}</span></h4>
                    <p>🛏️ ${b.room_type || 'Room'} · ${b.number_of_guests} guest${b.number_of_guests !== 1 ? 's' : ''}</p>
                    <p>📅 ${checkIn} → ${checkOut} · ${nights} night${nights !== 1 ? 's' : ''}</p>
                    ${guestLine}
                </div>
                <div class="booking-row-actions">
                    <span class="booking-status-badge status-${b.status}">${b.status.toUpperCase()}</span>
                    <span class="booking-price">Nu. ${b.total_price.toLocaleString()}</span>
                    ${actions}
                </div>
            </div>
        `;
    }).join('');
}

async function loadUpcomingEvents(limit = 6) {
    const container = document.getElementById('upcomingEventsList');
    if (!container) return;
    try {
        const r = await fetch(API_BASE_URL + '/events/?upcoming=true&status=open');
        const events = await r.json();
        if (!Array.isArray(events) || events.length === 0) {
            container.innerHTML = '<p style="color:#999; padding:1.25rem; background:#fafafa; border-radius:8px; text-align:center;">No group tours scheduled right now. Check back soon — TrekNest publishes new departures regularly.</p>';
            return;
        }
        const list = events.slice(0, limit);
        container.innerHTML = list.map(ev => {
            const start = new Date(ev.start_date).toLocaleDateString('en-US', {month:'short', day:'numeric'});
            const end = new Date(ev.end_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
            const region = ev.is_international ? `🌏 ${ev.country}` : `📍 ${ev.trek_dzongkhag || 'Bhutan'}`;
            const op = ev.operator || {};
            const typeLabel = (typeof tourTypeLabelHtml === 'function')
                ? `<span class="inline-type">${tourTypeLabelHtml(ev.tour_type, 13)}</span>`
                : '';
            return `
                <div class="upcoming-event-card">
                    ${ev.trek_image_url ? `<img src="${ev.trek_image_url}" alt="${ev.trek_name}" onerror="this.style.display='none'">` : ''}
                    <div class="upcoming-event-body">
                        <div class="upcoming-event-meta">${typeLabel} · ${region}</div>
                        <h4>${ev.title}</h4>
                        <p style="color:#555; font-size:0.85rem;">${ev.trek_name}</p>
                        <div class="upcoming-event-footer">
                            <span>📅 ${start} → ${end}</span>
                            <span>👥 ${ev.spots_left}/${ev.capacity}</span>
                            <strong>Nu. ${ev.per_person_fee.toLocaleString()}</strong>
                        </div>
                        ${ev.featured_guest ? `<div class="featured-guest-badge">⭐ Special guest: <strong>${ev.featured_guest}</strong></div>` : ''}
                        <div class="upcoming-event-operator">By <strong>${op.company_name || 'TrekNest Bhutan'}</strong>${op.is_verified ? ' · ✓ Verified' : ''}</div>
                        <a href="group-treks.html" class="btn btn-outline-primary btn-small upcoming-event-cta">View &amp; Reserve →</a>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        container.innerHTML = '<p style="color:#d33">Could not load upcoming tours.</p>';
    }
}

async function loadMyEvents() {
    const container = document.getElementById('myEventsList');
    if (!container) return;
    try {
        const r = await authFetch(API_BASE_URL + '/events/mine');
        const events = await r.json();
        if (!events.length) {
            container.innerHTML = '<p style="color:#999; padding:1.5rem; background:#fafafa; border-radius:8px; text-align:center;">You haven\'t joined any tours yet. <a href="group-treks.html" style="color:var(--primary-color)">Browse group tours →</a></p>';
            return;
        }
        container.innerHTML = events.map(ev => {
            const start = new Date(ev.start_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
            const end = new Date(ev.end_date).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
            const myStatus = (ev.my_participation && ev.my_participation.status) || 'unknown';
            const partId = ev.my_participation && ev.my_participation.participant_id;
            const badge = myStatus === 'paid' ? 'confirmed' : myStatus === 'pending' ? 'pending' : 'cancelled';
            const canCancel = myStatus !== 'cancelled' && ev.status !== 'completed' && ev.status !== 'cancelled';
            const op = ev.operator || {};
            const guide = ev.lead_guide || {};
            const region = ev.is_international ? `🌏 ${ev.country}` : `📍 ${ev.trek_dzongkhag || 'Bhutan'}`;
            const typeLabel = `<span class="inline-type">${tourTypeLabelHtml(ev.tour_type, 13)}</span>`;
            const bookingRef = partId ? `TNB-EVT-${String(ev.id).padStart(4,'0')}-P${String(partId).padStart(4,'0')}` : '';
            return `
                <div class="booking-row">
                    <div class="booking-row-info">
                        <h4>${ev.title} <span style="font-weight:400; color:#888; font-size:0.85rem;">· ${typeLabel}</span></h4>
                        <p>${region} · ${ev.trek_name}</p>
                        <p>📅 ${start} → ${end}</p>
                        <p>🏔️ Operated by <strong>${op.company_name || 'TrekNest Bhutan'}</strong>${guide.display_name ? ' · Lead: ' + guide.display_name : ''}</p>
                        ${bookingRef ? `<p style="font-size:0.8rem; color:#888;">Booking ref: <code>${bookingRef}</code></p>` : ''}
                        ${op.support_phone ? `<p style="font-size:0.8rem; color:#888;">Contact: ${op.support_phone}${op.support_email ? ' · ' + op.support_email : ''}</p>` : ''}
                    </div>
                    <div class="booking-row-actions">
                        <span class="booking-status-badge status-${badge}">${myStatus.toUpperCase()}</span>
                        <span class="booking-price">Nu. ${ev.per_person_fee.toLocaleString()}</span>
                        <div class="booking-actions-buttons">
                            <button onclick="window.location.href='group-treks.html'" style="background: var(--primary-color); color: white;">View</button>
                            ${canCancel ? `<button class="btn-cancel-host" onclick="cancelMyParticipation(${ev.id}, ${partId})">Cancel</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        container.innerHTML = '<p style="color:#d33">Failed to load events.</p>';
    }
}

async function cancelMyParticipation(eventId, participantId) {
    if (!confirm('Cancel your spot on this group trek?')) return;
    try {
        const r = await authFetch(`${API_BASE_URL}/events/${eventId}/participants/${participantId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'cancelled' })
        });
        const data = await r.json();
        if (!r.ok) { alert('Failed: ' + (data.error || 'Unknown')); return; }
        loadMyEvents();
    } catch (e) { alert('Network error: ' + e.message); }
}

async function updateBookingStatus(bookingId, status, isHost) {
    const action = status === 'cancelled' ? (isHost ? 'decline' : 'cancel') : status;
    if (!confirm(`Are you sure you want to ${action} this booking?`)) return;

    try {
        const r = await authFetch(API_BASE_URL + '/bookings/' + bookingId + '/status', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        const data = await r.json();
        if (!r.ok) {
            alert('Failed: ' + (data.error || 'Unknown error'));
            return;
        }
        const user = getCurrentUser();
        if (isHost) loadHostBookings(user.user_id || user.id);
        else loadMyBookings(user.user_id || user.id);
    } catch (e) {
        alert('Network error: ' + e.message);
    }
}
