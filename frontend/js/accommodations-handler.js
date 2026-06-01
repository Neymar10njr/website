let allAccs = [];
let filteredAccs = [];

document.addEventListener('DOMContentLoaded', function() {
    loadAccsForPage();
});

async function loadAccsForPage() {
    try {
        const response = await fetch(API_BASE_URL + '/accommodations');
        allAccs = await response.json();
        filteredAccs = [...allAccs];
        displayAccCards(filteredAccs);
        updateAccResultsCount();
    } catch (error) {
        console.error('Error loading accommodations:', error);
        document.getElementById('accommodationContainer').innerHTML =
            '<p class="treks-empty-state">Could not load accommodations. Please make sure the backend is running.</p>';
    }
}

function handleAccSearch(event) {
    event.preventDefault();
    runAccSearch();
}

function runAccSearch() {
    const term = document.getElementById('accSearchInput').value.trim().toLowerCase();
    const dzongkhag = document.getElementById('accDzongkhagFilter').value;
    const minRating = parseFloat(document.getElementById('accRatingFilter').value) || 0;
    const maxPrice = parseFloat(document.getElementById('accPriceFilter').value) || Infinity;

    filteredAccs = allAccs.filter(acc => {
        if (term && !acc.name.toLowerCase().includes(term)) return false;
        if (dzongkhag && acc.dzongkhag !== dzongkhag) return false;
        if (minRating && (acc.rating || 0) < minRating) return false;
        if (maxPrice !== Infinity && (acc.price_min == null || acc.price_min > maxPrice)) return false;
        return true;
    });

    document.getElementById('accResultsHeading').textContent =
        dzongkhag ? `Stays in ${dzongkhag}` : 'Available Stays';
    displayAccCards(filteredAccs);
    updateAccResultsCount();
    document.querySelector('.trek-results-section').scrollIntoView({ behavior: 'smooth' });
}

function displayAccCards(accs) {
    const container = document.getElementById('accommodationContainer');
    if (!container) return;

    if (accs.length === 0) {
        container.innerHTML = '<p class="treks-empty-state">No stays match your filters. Try adjusting your search.</p>';
        return;
    }

    container.innerHTML = accs.map(acc => {
        const price = acc.price_min != null
            ? (acc.price_min === acc.price_max
                ? `Nu. ${acc.price_min}`
                : `Nu. ${acc.price_min} – ${acc.price_max}`)
            : 'Price on request';
        return `
            <div class="trek-card">
                <div class="trek-card-image">
                    ${acc.image_url ? `<img src="${acc.image_url}" alt="${acc.name}" onerror="this.parentElement.classList.add('no-image-acc'); this.remove();">` : ''}
                </div>
                <div class="trek-card-content">
                    <div class="trek-card-header">
                        <h3>${acc.name}</h3>
                        <span class="rating-pill">⭐ ${acc.rating ? acc.rating.toFixed(1) : 'New'}</span>
                    </div>
                    ${acc.is_verified ? '<div class="verified-badge">✓ TrekNest Verified Partner</div>' : ''}
                    <p class="trek-description">${acc.description ? truncateText(acc.description, 130) : ''}</p>
                    <div class="trek-info">
                        <span>📍 ${acc.dzongkhag || 'N/A'}</span>
                        <span>🛏️ ${acc.rooms_count} room${acc.rooms_count !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="trek-info">
                        <span>💰 ${price} / night</span>
                    </div>
                    ${acc.phone ? `
                        <div class="contact-buttons-mini">
                            <a href="tel:${acc.phone.replace(/[^\d+]/g, '')}" class="btn-contact-mini btn-call" title="Call ${acc.phone}" onclick="event.stopPropagation()">${phoneIconSvg(18)}</a>
                            <a href="https://wa.me/${acc.phone.replace(/\D/g, '')}" target="_blank" rel="noopener" class="btn-contact-mini btn-whatsapp" title="Chat on WhatsApp" onclick="event.stopPropagation()">${whatsappIconSvg(18)}</a>
                        </div>
                    ` : ''}
                    <button class="btn btn-primary mt-2 full-width" onclick="viewAccDetail(${acc.id})">View Details</button>
                </div>
            </div>
        `;
    }).join('');
}

function truncateText(str, len) {
    return str.length > len ? str.substring(0, len) + '…' : str;
}

function updateAccResultsCount() {
    const el = document.getElementById('accResultsCount');
    if (el) {
        const n = filteredAccs.length;
        el.textContent = `${n} stay${n !== 1 ? 's' : ''} found`;
    }
}

function resetAccSearch() {
    document.getElementById('accSearchInput').value = '';
    document.getElementById('accDzongkhagFilter').value = '';
    document.getElementById('accRatingFilter').value = '';
    document.getElementById('accPriceFilter').value = '';
    filteredAccs = [...allAccs];
    document.getElementById('accResultsHeading').textContent = 'Available Stays';
    displayAccCards(filteredAccs);
    updateAccResultsCount();
}

async function viewAccDetail(accId) {
    const modal = document.getElementById('accDetailModal');
    if (!modal) return;
    const content = document.getElementById('accDetailContent');
    content.innerHTML = '<p>Loading…</p>';
    modal.classList.add('show');

    try {
        const r = await fetch(API_BASE_URL + '/accommodations/' + accId);
        const acc = await r.json();
        const galleryUrls = (acc.image_gallery && acc.image_gallery.length)
            ? acc.image_gallery
            : (acc.image_url ? [acc.image_url] : []);
        content.innerHTML = `
            <h2>${acc.name}</h2>
            ${acc.is_verified ? '<div class="verified-badge verified-badge-lg">✓ TrekNest Verified Partner</div>' : ''}
            ${typeof buildImageGalleryHtml === 'function'
                ? buildImageGalleryHtml(galleryUrls)
                : (acc.image_url ? `<div class="trek-detail-image"><img src="${acc.image_url}" alt="${acc.name}" onerror="this.parentElement.style.display='none'"></div>` : '')}
            <p>${acc.description || ''}</p>
            <div class="trek-info-detail">
                <p><strong>📍 Region:</strong> ${acc.dzongkhag || 'N/A'}</p>
                <p><strong>🏠 Address:</strong> ${acc.address || 'N/A'}</p>
                <p><strong>⭐ Rating:</strong> ${acc.rating ? acc.rating.toFixed(1) + ' / 5' : 'No ratings yet'}</p>
                <p><strong>📸 Photos:</strong> ${galleryUrls.length}</p>
            </div>
            ${buildContactButtons(acc.phone)}
            <h3 style="margin-top:1.5rem">Available Rooms</h3>
            ${acc.rooms.length === 0
                ? '<p style="color:#999">No rooms listed yet.</p>'
                : `<div class="rooms-grid">
                    ${acc.rooms.map(r => `
                        <div class="room-card">
                            <div class="room-card-header">
                                <strong>${r.room_type || 'Room'}</strong>
                                <span class="price-tag">Nu. ${r.price_per_night}/night</span>
                            </div>
                            <p class="room-meta">🛏️ Sleeps ${r.capacity} · Room ${r.room_number}</p>
                            ${r.amenities ? `<p class="room-amenities">✨ ${r.amenities}</p>` : ''}
                            <button class="btn btn-primary btn-small full-width mt-2" onclick="window.location.href='booking.html?room=${r.id}&acc=${acc.id}'">Book This Room</button>
                        </div>
                    `).join('')}
                </div>`
            }
            <h3 style="margin-top:1.5rem">Guest Reviews</h3>
            <div id="accReviewsWidget"></div>
        `;
        if (typeof renderReviewWidget === 'function') {
            renderReviewWidget('accommodation', accId, document.getElementById('accReviewsWidget'));
        }
    } catch (e) {
        content.innerHTML = '<p style="color:red">Could not load details.</p>';
    }
}

function buildContactButtons(phone) {
    if (!phone) return '';
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const waPhone = phone.replace(/\D/g, '');
    return `
        <div class="contact-buttons">
            <a href="tel:${cleanPhone}" class="btn-contact btn-call">${phoneIconSvg(18)}<span>Call ${phone}</span></a>
            <a href="https://wa.me/${waPhone}" target="_blank" rel="noopener" class="btn-contact btn-whatsapp">${whatsappIconSvg(18)}<span>WhatsApp</span></a>
        </div>
    `;
}

function closeAccModal() {
    const modal = document.getElementById('accDetailModal');
    if (modal) modal.classList.remove('show');
}
