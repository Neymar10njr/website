let filteredTreks = [];

document.addEventListener('DOMContentLoaded', function() {
    loadTreksForPage();
});

async function loadTreksForPage() {
    try {
        const response = await fetch(API_BASE_URL + '/treks');
        allTreks = await response.json();
        filteredTreks = [...allTreks];

        const params = new URLSearchParams(window.location.search);
        const dzongkhag = params.get('dzongkhag');
        if (dzongkhag) {
            const select = document.getElementById('dzongkhagFilter');
            if (select) select.value = dzongkhag;
            runSearch();
        } else {
            displayTrekCards(filteredTreks);
            updateResultsCount();
        }
    } catch (error) {
        console.error('Error loading treks:', error);
        document.getElementById('treksGrid').innerHTML =
            '<p class="treks-empty-state">Could not load treks. Please make sure the backend is running.</p>';
    }
}

function handleTrekSearch(event) {
    event.preventDefault();
    runSearch();
}

function runSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const dzongkhag = document.getElementById('dzongkhagFilter').value;
    const difficulty = document.getElementById('difficultyFilter').value;
    const duration = document.getElementById('durationFilter').value;

    filteredTreks = allTreks.filter(trek => {
        if (searchTerm && !(
            trek.name.toLowerCase().includes(searchTerm) ||
            (trek.dzongkhag && trek.dzongkhag.toLowerCase().includes(searchTerm))
        )) return false;

        if (dzongkhag && trek.dzongkhag !== dzongkhag) return false;
        if (difficulty && trek.difficulty !== difficulty) return false;

        if (duration) {
            const d = trek.duration_days;
            if (duration === '1-3' && !(d >= 1 && d <= 3)) return false;
            if (duration === '4-6' && !(d >= 4 && d <= 6)) return false;
            if (duration === '7+' && !(d >= 7)) return false;
        }

        return true;
    });

    updateResultsHeading(dzongkhag);
    displayTrekCards(filteredTreks);
    updateResultsCount();

    document.querySelector('.trek-results-section').scrollIntoView({ behavior: 'smooth' });
}

function updateResultsHeading(dzongkhag) {
    const heading = document.getElementById('resultsHeading');
    if (!heading) return;
    heading.textContent = dzongkhag
        ? `Treks in ${dzongkhag}`
        : 'Available Treks';
}

function displayTrekCards(treks) {
    const container = document.getElementById('treksGrid');
    if (!container) return;

    if (treks.length === 0) {
        container.innerHTML = '<p class="treks-empty-state">No treks match your search. Try adjusting your filters.</p>';
        return;
    }

    container.innerHTML = treks.map(trek => `
        <div class="trek-card">
            <div class="trek-card-image">
                ${trek.image_url
                    ? `<img src="${trek.image_url}" alt="${trek.name}" onerror="this.parentElement.classList.add('no-image'); this.remove();">`
                    : ''}
            </div>
            <div class="trek-card-content">
                <div class="trek-card-header">
                    <h3>${trek.name}</h3>
                    <span class="difficulty-pill difficulty-${(trek.difficulty || '').toLowerCase()}">${trek.difficulty || 'N/A'}</span>
                </div>
                <p class="trek-description">${trek.description ? truncate(trek.description, 140) : 'No description'}</p>
                <div class="trek-info">
                    <span>📍 ${trek.dzongkhag}</span>
                    <span>⏱️ ${trek.duration_days} days</span>
                </div>
                <div class="trek-info">
                    <span>📏 ${trek.distance_km} km</span>
                    <span>🌤️ ${trek.best_season || 'Any season'}</span>
                </div>
                <button class="btn btn-primary mt-2 full-width" onclick="viewTrekDetail(${trek.id})">View Details</button>
            </div>
        </div>
    `).join('');
}

function truncate(str, len) {
    return str.length > len ? str.substring(0, len) + '…' : str;
}

function updateResultsCount() {
    const el = document.getElementById('resultsCount');
    if (el) {
        const n = filteredTreks.length;
        el.textContent = `${n} trek${n !== 1 ? 's' : ''} found`;
    }
}

function resetSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('dzongkhagFilter').value = '';
    document.getElementById('difficultyFilter').value = '';
    document.getElementById('durationFilter').value = '';
    filteredTreks = [...allTreks];
    updateResultsHeading('');
    displayTrekCards(filteredTreks);
    updateResultsCount();
}

function viewTrekDetail(trekId) {
    const trek = allTreks.find(t => t.id === trekId);
    if (!trek) return;

    const modal = document.getElementById('trekDetailModal');
    if (!modal) return;

    document.getElementById('trekDetailContent').innerHTML = `
        <h2>${trek.name}</h2>
        ${buildTrekGalleryHtml(trek.image_url)}
        <p>${trek.description}</p>
        <div class="trek-info-detail">
            <p><strong>Difficulty:</strong> ${trek.difficulty}</p>
            <p><strong>Duration:</strong> ${trek.duration_days} days</p>
            <p><strong>Distance:</strong> ${trek.distance_km} km</p>
            <p><strong>Region:</strong> ${trek.dzongkhag}</p>
            <p><strong>Best Season:</strong> ${trek.best_season || 'Any season'}</p>
        </div>
        ${buildRouteStopsHtml(trek.stops)}
        <button class="btn btn-primary mt-2 full-width" onclick="window.location.href='booking.html?trek=${trek.id}'">Book This Trek</button>
        <h3 style="margin-top:1.75rem">Reviews</h3>
        <div id="trekReviewsWidget"></div>
    `;
    modal.classList.add('show');
    if (typeof renderReviewWidget === 'function') {
        renderReviewWidget('tour', trek.id, document.getElementById('trekReviewsWidget'));
    }
}

function closeTrekModal() {
    const modal = document.getElementById('trekDetailModal');
    if (modal) modal.classList.remove('show');
}
