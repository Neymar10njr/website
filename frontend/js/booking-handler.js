let currentRoom = null;
let currentAcc = null;

document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const roomId = parseInt(params.get('room'), 10);
    const accId = parseInt(params.get('acc'), 10);

    if (!roomId || !accId) {
        showRoomError('No room selected. Please pick a room from the Stays page.');
        return;
    }

    loadRoomInfo(accId, roomId);

    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    document.getElementById('checkIn').min = toISODate(today);
    document.getElementById('checkIn').value = toISODate(today);
    document.getElementById('checkOut').min = toISODate(tomorrow);
    document.getElementById('checkOut').value = toISODate(tomorrow);

    document.getElementById('checkIn').addEventListener('change', calculatePrice);
    document.getElementById('checkOut').addEventListener('change', calculatePrice);
});

function toISODate(d) {
    return d.toISOString().split('T')[0];
}

async function loadRoomInfo(accId, roomId) {
    try {
        const r = await fetch(API_BASE_URL + '/accommodations/' + accId);
        if (!r.ok) throw new Error('Accommodation not found');
        currentAcc = await r.json();
        currentRoom = currentAcc.rooms.find(rm => rm.id === roomId);
        if (!currentRoom) throw new Error('Room not found');
        renderRoomInfo();
        calculatePrice();
    } catch (e) {
        showRoomError(e.message);
    }
}

function renderRoomInfo() {
    document.getElementById('roomInfoCard').innerHTML = `
        ${currentAcc.image_url ? `<img src="${currentAcc.image_url}" class="room-info-image" alt="${currentAcc.name}" onerror="this.style.display='none'">` : ''}
        <div class="room-info-text">
            <h3>${currentAcc.name}</h3>
            <p class="room-info-meta">📍 ${currentAcc.dzongkhag || ''} ${currentAcc.address ? '· ' + currentAcc.address : ''}</p>
            <div class="room-info-divider"></div>
            <p><strong>${currentRoom.room_type || 'Room'}</strong> · Sleeps ${currentRoom.capacity} · Room ${currentRoom.room_number}</p>
            ${currentRoom.amenities ? `<p class="room-info-amenities">✨ ${currentRoom.amenities}</p>` : ''}
            <p class="room-info-price">Nu. ${currentRoom.price_per_night} <span style="font-weight:400;color:#666;font-size:0.9rem">per night</span></p>
        </div>
    `;
}

function showRoomError(msg) {
    document.getElementById('roomInfoCard').innerHTML =
        `<p style="color:#d33; padding: 1rem;">⚠️ ${msg}</p>`;
    document.getElementById('confirmBtn').disabled = true;
}

function calculatePrice() {
    if (!currentRoom) return;
    const checkIn = new Date(document.getElementById('checkIn').value);
    const checkOut = new Date(document.getElementById('checkOut').value);
    const pricePerNight = currentRoom.price_per_night;

    document.getElementById('pricePerNight').textContent = 'Nu. ' + pricePerNight;

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkOut <= checkIn) {
        document.getElementById('numNights').textContent = '0';
        document.getElementById('totalPrice').textContent = 'Nu. 0';
        return;
    }

    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const total = nights * pricePerNight;
    document.getElementById('numNights').textContent = nights;
    document.getElementById('totalPrice').textContent = 'Nu. ' + total.toLocaleString();
}

async function submitBooking(event) {
    event.preventDefault();
    const errEl = document.getElementById('bookingError');
    errEl.style.display = 'none';
    errEl.textContent = '';

    const user = getCurrentUser();
    if (!user) {
        errEl.textContent = 'Please sign in or register before booking.';
        errEl.style.display = 'block';
        toggleAuthModal();
        return;
    }

    if (!currentRoom) {
        errEl.textContent = 'Room information missing.';
        errEl.style.display = 'block';
        return;
    }

    const payload = {
        room_id: currentRoom.id,
        check_in_date: document.getElementById('checkIn').value,
        check_out_date: document.getElementById('checkOut').value,
        number_of_guests: parseInt(document.getElementById('guests').value, 10) || 1,
        special_requests: document.getElementById('specialRequests').value.trim()
    };

    const btn = document.getElementById('confirmBtn');
    btn.disabled = true;
    btn.textContent = 'Confirming...';

    try {
        const r = await authFetch(API_BASE_URL + '/bookings/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await r.json();
        if (!r.ok) {
            errEl.textContent = data.error || 'Booking failed';
            errEl.style.display = 'block';
            btn.disabled = false;
            btn.textContent = '✅ Confirm Booking';
            return;
        }
        window.location.href = 'booking-confirmed.html?id=' + data.booking_id;
    } catch (e) {
        errEl.textContent = 'Network error: ' + e.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = '✅ Confirm Booking';
    }
}
