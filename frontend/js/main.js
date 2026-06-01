const API_BASE_URL = (window.TREKNEST_API_BASE_URL) || (window.location.origin + '/api');
let currentUser = null;
let allTreks = [];
let allAccommodations = [];

document.addEventListener('DOMContentLoaded', function() {
    loadTreks();
    loadAccommodations();
    checkUserLogin();
    refreshAuthUI();
});

window.addEventListener('pageshow', function() {
    refreshAuthUI();
});

function getCurrentUser() {
    const stored = sessionStorage.getItem('currentUser');
    if (!stored) return null;
    try { return JSON.parse(stored); } catch (e) {
        sessionStorage.removeItem('currentUser');
        return null;
    }
}

function getAuthToken() {
    return sessionStorage.getItem('accessToken');
}

async function authFetch(url, options = {}) {
    const token = getAuthToken();
    const headers = Object.assign({}, options.headers || {});
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const response = await fetch(url, Object.assign({}, options, { headers }));
    if (response.status === 401 || response.status === 422) {
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('accessToken');
        if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
            alert('Your session expired. Please sign in again.');
            window.location.href = 'index.html';
        }
    }
    return response;
}

function refreshAuthUI() {
    updateAuthNavLink();
    showWelcomeBanner();
}

function updateAuthNavLink() {
    const navMenu = document.querySelector('.nav-menu');
    if (!navMenu) return;

    const user = getCurrentUser();

    Array.from(navMenu.querySelectorAll('li[data-auth-injected]')).forEach(li => li.remove());

    const links = navMenu.querySelectorAll('a');
    let signInLink = null;
    let logoutLink = null;
    links.forEach(link => {
        const text = link.textContent.trim();
        if (text === 'Sign In' || text === 'Login' || text === 'Login/Register') signInLink = link;
        if (text === 'Logout' || text.includes('🚪')) logoutLink = link;
    });

    if (!user) {
        if (logoutLink) {
            logoutLink.textContent = 'Sign In';
            logoutLink.setAttribute('href', '#');
            logoutLink.onclick = function(e) { e.preventDefault(); toggleAuthModal(); };
        }
        return;
    }

    const userName = user.first_name || user.username || 'User';
    const dashboardHref = (DASHBOARD_BY_TYPE && DASHBOARD_BY_TYPE[user.user_type]) || 'profile.html';

    if (signInLink) {
        signInLink.textContent = '🚪 Logout';
        signInLink.setAttribute('href', '#');
        signInLink.onclick = function(e) { e.preventDefault(); logout(); };
    } else if (logoutLink) {
        logoutLink.textContent = '🚪 Logout';
        logoutLink.setAttribute('href', '#');
        logoutLink.onclick = function(e) { e.preventDefault(); logout(); };
    } else {
        const logoutLi = document.createElement('li');
        logoutLi.setAttribute('data-auth-injected', 'true');
        const logoutA = document.createElement('a');
        logoutA.href = '#';
        logoutA.textContent = '🚪 Logout';
        logoutA.onclick = function(e) { e.preventDefault(); logout(); };
        logoutLi.appendChild(logoutA);
        navMenu.appendChild(logoutLi);
    }

    const hasUserLink = Array.from(navMenu.querySelectorAll('a'))
        .some(a => a.textContent.includes('👤'));
    if (!hasUserLink) {
        const dashLi = document.createElement('li');
        dashLi.setAttribute('data-auth-injected', 'true');
        dashLi.innerHTML = `<a href="${dashboardHref}">👤 ${userName}</a>`;
        const targetLogout = signInLink || logoutLink;
        const insertBefore = targetLogout ? targetLogout.parentElement : navMenu.lastElementChild;
        navMenu.insertBefore(dashLi, insertBefore);
    }
}

function showWelcomeBanner() {
    const existing = document.getElementById('authBanner');
    if (existing) existing.remove();

    const user = getCurrentUser();
    if (!user) return;

    const banner = document.createElement('div');
    banner.id = 'authBanner';
    banner.className = 'auth-banner';
    const dashboardHref = (DASHBOARD_BY_TYPE && DASHBOARD_BY_TYPE[user.user_type]) || 'profile.html';
    const roleLabels = {
        tourist: 'Tourist',
        local_tourist: 'Local Tourist',
        host: 'Guest House Owner',
        trek_organiser: 'Trek Organiser'
    };
    banner.innerHTML = `
        <span>✅ Logged in as <strong>${user.first_name || user.username}</strong> · ${roleLabels[user.user_type] || user.user_type}</span>
        <span class="auth-banner-actions">
            <a href="${dashboardHref}" class="auth-banner-link">My Dashboard</a>
        </span>
    `;
    const nav = document.querySelector('.navbar');
    if (nav && nav.parentNode) {
        nav.parentNode.insertBefore(banner, nav.nextSibling);
    } else {
        document.body.insertBefore(banner, document.body.firstChild);
    }
}

async function loadTreks() {
    try {
        const response = await fetch(API_BASE_URL + '/treks', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            allTreks = await response.json();
            displayFeaturedTreks();
        } else {
            console.warn('API returned status:', response.status);
            displayFeaturedTreks();
        }
    } catch (error) {
        console.error('Error loading treks:', error);
        displayFeaturedTreks();
    }
}

async function loadAccommodations() {
    try {
        const response = await fetch(API_BASE_URL + '/accommodations', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            allAccommodations = await response.json();
        }
    } catch (error) {
        console.error('Error loading accommodations:', error);
    }
}

function displayFeaturedTreks() {
    const container = document.getElementById('featuredTreksContainer');
    if (container) renderTrekCards(container, allTreks.slice(0, 6));

    const topContainer = document.getElementById('topTreksContainer');
    if (topContainer) {
        const sorted = [...allTreks].sort((a, b) => {
            const aHas = a.image_url ? 0 : 1;
            const bHas = b.image_url ? 0 : 1;
            return aHas - bHas;
        });
        renderTrekCards(topContainer, sorted.slice(0, 6));
    }
}

function renderTrekCards(container, treks) {
    if (treks.length === 0) {
        container.innerHTML = '<p class="treks-empty-state">No treks available yet.</p>';
        return;
    }
    container.innerHTML = treks.map(trek => `
        <div class="trek-card">
            <div class="trek-card-image">
                ${trek.image_url ? `<img src="${trek.image_url}" alt="${trek.name}" onerror="this.parentElement.classList.add('no-image'); this.remove();">` : ''}
            </div>
            <div class="trek-card-content">
                <h3>${trek.name}</h3>
                <p>${trek.description ? trek.description.substring(0, 110) : 'No description'}...</p>
                <div class="trek-info">
                    <span>📍 ${trek.dzongkhag}</span>
                    <span>⏱️ ${trek.duration_days} days</span>
                </div>
                <button class="btn btn-primary mt-2 full-width" onclick="viewTrekDetail(${trek.id})">View Details</button>
            </div>
        </div>
    `).join('');
}

function filterTreksByDzongkhag(dzongkhag) {
    window.location.href = 'treks.html?dzongkhag=' + encodeURIComponent(dzongkhag);
}

function scrollToTreks() {
    const section = document.getElementById('allTreksSection');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function searchTreksFromHero() {
    const searchTerm = document.getElementById('heroSearch').value.toLowerCase();
    if (searchTerm.length > 0) {
        const filtered = allTreks.filter(trek => 
            trek.name.toLowerCase().includes(searchTerm) ||
            trek.dzongkhag.toLowerCase().includes(searchTerm)
        );
        const container = document.getElementById('featuredTreksContainer');
        if (container && filtered.length > 0) {
            let html = '';
            filtered.forEach(trek => {
                html += `
                    <div class="trek-card">
                        <div class="trek-card-image"></div>
                        <div class="trek-card-content">
                            <h3>${trek.name}</h3>
                            <p>${trek.description ? trek.description.substring(0, 100) : 'No description'}...</p>
                            <div class="trek-info">
                                <span>📍 ${trek.dzongkhag}</span>
                                <span>⏱️ ${trek.duration_days} days</span>
                            </div>
                            <button class="btn btn-primary mt-2" onclick="viewTrekDetail(${trek.id})">View Details</button>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        }
    } else {
        displayFeaturedTreks();
    }
}

function toggleAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.toggle('show');
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    document.querySelectorAll('.auth-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tab + 'Form').classList.add('active');
    event.target.classList.add('active');
}

const DASHBOARD_BY_TYPE = {
    tourist: 'dashboard-tourist.html',
    local_tourist: 'dashboard-local.html',
    host: 'dashboard-host.html',
    trek_organiser: 'dashboard-organiser.html',
    admin: 'admin.html'
};

function showAuthError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.style.display = 'block';
    }
}

function clearAuthError(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = '';
        el.style.display = 'none';
    }
}

function redirectToDashboard(userType) {
    const u = getCurrentUser();
    if (u && u.must_change_password) {
        window.location.href = 'change-password.html';
        return;
    }
    const target = DASHBOARD_BY_TYPE[userType] || 'dashboard-tourist.html';
    window.location.href = target;
}

async function handleLogin(event) {
    event.preventDefault();
    clearAuthError('loginError');

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(API_BASE_URL + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (!response.ok) {
            showAuthError('loginError', data.error || 'Login failed');
            return;
        }

        if (data.access_token) {
            sessionStorage.setItem('accessToken', data.access_token);
        }
        const userData = Object.assign({}, data);
        delete userData.access_token;
        currentUser = userData;
        sessionStorage.setItem('currentUser', JSON.stringify(userData));
        closeAuthModal();
        redirectToDashboard(data.user_type);
    } catch (err) {
        showAuthError('loginError', 'Cannot reach server. Is the backend running?');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    clearAuthError('registerError');

    const payload = {
        username: document.getElementById('regUsername').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPassword').value,
        first_name: document.getElementById('regFirstName').value.trim(),
        last_name: document.getElementById('regLastName').value.trim(),
        user_type: document.getElementById('regUserType').value
    };

    if (!payload.user_type) {
        showAuthError('registerError', 'Please select a user type');
        return;
    }

    try {
        const response = await fetch(API_BASE_URL + '/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (!response.ok) {
            showAuthError('registerError', data.error || 'Registration failed');
            return;
        }

        if (data.access_token) {
            sessionStorage.setItem('accessToken', data.access_token);
        }
        const userData = Object.assign({}, data);
        delete userData.access_token;
        currentUser = userData;
        sessionStorage.setItem('currentUser', JSON.stringify(userData));
        closeAuthModal();
        redirectToDashboard(data.user_type);
    } catch (err) {
        showAuthError('registerError', 'Cannot reach server. Is the backend running?');
    }
}

const MAX_TREK_GALLERY_IMAGES = 10;

function buildTrekGalleryHtml(primaryUrl) {
    if (!primaryUrl) return '';
    const match = primaryUrl.match(/^(.+)(\.(jpg|jpeg|png|webp))$/i);
    if (!match) {
        return `<div class="trek-gallery"><img src="${primaryUrl}" class="gallery-main" onerror="this.remove()"></div>`;
    }
    const base = match[1];
    const ext = match[2];

    const candidates = [primaryUrl];
    for (let i = 2; i <= MAX_TREK_GALLERY_IMAGES; i++) {
        candidates.push(`${base}-${i}${ext}`);
    }

    return `
        <div class="trek-gallery">
            <img src="${primaryUrl}" class="gallery-main" id="galleryMain" onerror="this.style.display='none'">
            <div class="gallery-thumbs">
                ${candidates.map((url, idx) => `
                    <img src="${url}" class="gallery-thumb${idx === 0 ? ' active' : ''}"
                         onclick="setGalleryMain(this)"
                         onerror="this.remove()">
                `).join('')}
            </div>
        </div>
    `;
}

// Render a user's avatar — their uploaded photo, or initials fallback.
function avatarHtml(user, size) {
    size = size || 56;
    if (user && user.avatar_url) {
        return `<img src="${user.avatar_url}" class="user-avatar" alt="profile picture" style="width:${size}px;height:${size}px">`;
    }
    const src = (user && (user.first_name || user.username)) || '?';
    const initial = src.charAt(0).toUpperCase();
    return `<div class="user-avatar user-avatar-initials" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px">${initial}</div>`;
}

// Auto-mount an avatar into any dashboard header (no per-page wiring needed).
document.addEventListener('DOMContentLoaded', function () {
    const dh = document.querySelector('.dashboard-header');
    const u = getCurrentUser();
    if (dh && u && !document.getElementById('dashAvatarAuto')) {
        const av = document.createElement('div');
        av.id = 'dashAvatarAuto';
        av.className = 'dash-avatar';
        av.innerHTML = avatarHtml(u, 64);
        dh.insertBefore(av, dh.firstChild);
        dh.classList.add('dashboard-header-has-avatar');
    }
});

// Gallery from an explicit list of image URLs (used by accommodations, where
// images have UUID filenames and can't be discovered by naming convention).
function buildImageGalleryHtml(urls) {
    const list = (urls || []).filter(Boolean);
    if (list.length === 0) return '';
    if (list.length === 1) {
        return `<div class="trek-gallery"><img src="${list[0]}" class="gallery-main" onerror="this.parentElement.style.display='none'"></div>`;
    }
    return `
        <div class="trek-gallery">
            <img src="${list[0]}" class="gallery-main" id="galleryMain" onerror="this.style.display='none'">
            <div class="gallery-thumbs">
                ${list.map((url, idx) => `
                    <img src="${url}" class="gallery-thumb${idx === 0 ? ' active' : ''}"
                         onclick="setGalleryMain(this)" onerror="this.remove()">
                `).join('')}
            </div>
        </div>
    `;
}

function phoneIconSvg(size = 18) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.58l2.2-2.21c.28-.27.36-.66.25-1.01C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/></svg>`;
}

function whatsappIconSvg(size = 18) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>`;
}

// Tour-type SVG icons (replace emojis for consistent cross-platform rendering)
function trekIconSvg(size = 16) {
    // Layered alpine mountains with snow caps — back peak (lighter, taller) +
    // front peak (full color) + white snow caps. Reads cleanly down to ~14px.
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" opacity=".45" d="M5 20.5 14 4l9 16.5z"/><path fill="#ffffff" d="m11.6 9.7 2.4-4.4 2.4 4.4-1.3-.8-1.1.7-1.1-.7z"/><path fill="currentColor" d="M0 21.5 7.5 9.5 15 21.5z"/><path fill="#ffffff" d="m5.6 13.2 1.9-3.2 1.9 3.2-1-.6-.9.5-.9-.5z"/></svg>`;
}

function hikeIconSvg(size = 16) {
    // Hiking boot — angled side profile with sole tread.
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 4h3.4c.55 0 1 .45 1 1v6.4l4.6 1.5c1.7.55 3 2.13 3 3.92V18c0 .83-.67 1.5-1.5 1.5h-13C1.67 19.5 1 18.83 1 18v-1.5h2v-1H1V14h2v-1H1v-1.5c0-.55.45-1 1-1h2V5c0-.55.45-1 1-1zm.6 1.5v6.5h2.3V5.5H5.6zm0 8v.5h11.4v-.5c-.2-.85-1-1.6-2-1.92l-4.6-1.5c-.55-.18-1.3-.08-1.85.2L5.6 13.5z"/></svg>`;
}

function pilgrimageIconSvg(size = 16) {
    // Bhutanese chorten / Buddhist stupa — stepped base, dome, spire, finial.
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="2.4" r="1"/><path d="M11.4 4.2h1.2v.9h-1.2z"/><path d="M10.7 5.2l1.3-2 1.3 2v1.7l-1.3-1.4-1.3 1.4z"/><path d="M9.6 7.5l2.4-1.7 2.4 1.7v1.4l-2.4-1.4-2.4 1.4z"/><path d="M8.4 9.3h7.2v1.4l-3.6-.9-3.6.9z"/><path d="M7 10.5q5-3 10 0 0 4.2-5 4.2t-5-4.2z"/><rect x="6" y="14.7" width="12" height="2"/><rect x="4.5" y="16.7" width="15" height="2"/><rect x="3" y="18.7" width="18" height="2.3"/></svg>`;
}

function tourTypeIconSvg(type, size = 14) {
    if (type === 'pilgrimage') return pilgrimageIconSvg(size);
    if (type === 'hike') return hikeIconSvg(size);
    return trekIconSvg(size);
}

function tourTypeLabelHtml(type, size = 14) {
    const label = type === 'pilgrimage' ? 'Pilgrimage' : type === 'hike' ? 'Hike' : 'Trek';
    return `<span class="tour-type-icon">${tourTypeIconSvg(type, size)}</span>${label}`;
}

function buildRouteStopsHtml(stops) {
    if (!stops || stops.length === 0) return '';
    return `
        <div class="route-stops">
            <h3>📍 Route Itinerary</h3>
            <ol class="route-list">
                ${stops.map((s, idx) => `
                    <li>
                        <div class="route-stop-marker">${idx + 1}</div>
                        <div class="route-stop-content">
                            <strong>${s.stop_name}</strong>
                            ${s.altitude ? `<span class="route-altitude">${s.altitude}m</span>` : ''}
                            ${s.description ? `<p>${s.description}</p>` : ''}
                        </div>
                    </li>
                `).join('')}
            </ol>
        </div>
    `;
}

function setGalleryMain(thumb) {
    const main = document.getElementById('galleryMain');
    if (main) {
        main.src = thumb.src;
        main.style.display = '';
    }
    document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
}

function checkUserLogin() {
    const userStorage = sessionStorage.getItem('currentUser');
    if (userStorage) {
        currentUser = JSON.parse(userStorage);
    }
}

function logout() {
    if (!confirm('Are you sure you want to log out?')) return;
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('accessToken');
    currentUser = null;
    window.location.href = 'index.html';
}

function requireAuth(allowedTypes) {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    // Force first-login password change before allowing access to anything else.
    if (user.must_change_password && !window.location.pathname.endsWith('/change-password.html')) {
        window.location.href = 'change-password.html';
        return null;
    }
    if (allowedTypes && !allowedTypes.includes(user.user_type)) {
        redirectToDashboard(user.user_type);
        return null;
    }
    return user;
}

function viewTrekDetail(trekId) {
    const trek = allTreks.find(t => t.id === trekId);
    if (!trek) return;

    const modal = document.getElementById('trekDetailModal');
    if (!modal) return;

    const content = document.getElementById('trekDetailContent');
    content.innerHTML = `
        <h2>${trek.name}</h2>
        ${buildTrekGalleryHtml(trek.image_url)}
        <p>${trek.description}</p>
        <div class="trek-info">
            <p><strong>Difficulty:</strong> ${trek.difficulty}</p>
            <p><strong>Duration:</strong> ${trek.duration_days} days</p>
            <p><strong>Distance:</strong> ${trek.distance_km} km</p>
            <p><strong>Dzongkhag:</strong> ${trek.dzongkhag}</p>
            <p><strong>Best Season:</strong> ${trek.best_season}</p>
        </div>
        <button class="btn btn-primary mt-2" onclick="window.location.href='booking.html?trek=${trek.id}'">Book Now</button>
    `;
    
    modal.classList.add('show');
}

function closeTrekModal() {
    const modal = document.getElementById('trekDetailModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function viewAccommodationDetail(accId) {
    const acc = allAccommodations.find(a => a.id === accId);
    if (!acc) return;

    const modal = document.getElementById('accDetailModal');
    if (!modal) return;

    const content = document.getElementById('accDetailContent');
    content.innerHTML = `
        <h2>${acc.name}</h2>
        <p>${acc.description}</p>
        <div class="trek-info">
            <p><strong>Address:</strong> ${acc.address}</p>
            <p><strong>Phone:</strong> ${acc.phone}</p>
            <p><strong>Rating:</strong> ${acc.rating}/5</p>
        </div>
        <button class="btn btn-primary mt-2" onclick="window.location.href='booking.html?acc=${acc.id}'">Book Room</button>
    `;
    
    modal.classList.add('show');
}

function closeAccModal() {
    const modal = document.getElementById('accDetailModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function searchAccommodations() {
    const searchTerm = document.getElementById('accSearch').value.toLowerCase();
    const filtered = allAccommodations.filter(acc => 
        acc.name.toLowerCase().includes(searchTerm)
    );
    
    const container = document.getElementById('accommodationContainer');
    if (!container) return;

    let html = '';
    filtered.forEach(acc => {
        html += `
            <div class="trek-card">
                <div class="trek-card-image"></div>
                <div class="trek-card-content">
                    <h3>${acc.name}</h3>
                    <p>${acc.description ? acc.description.substring(0, 100) : ''}...</p>
                    <div class="trek-info">
                        <span>📞 ${acc.phone}</span>
                        <span>⭐ ${acc.rating}/5</span>
                    </div>
                    <button class="btn btn-primary mt-2" onclick="viewAccommodationDetail(${acc.id})">View Details</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}
