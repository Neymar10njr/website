// Reusable star-rating + reviews widget — used on trek and accommodation detail.
// renderReviewWidget('accommodation'|'tour', id, containerElement)

function _revEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g,
        c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function _starString(n) {
    const full = Math.round(n || 0);
    let s = '';
    for (let i = 1; i <= 5; i++) s += (i <= full ? '★' : '☆');
    return s;
}

async function renderReviewWidget(targetType, targetId, container) {
    if (!container) return;
    container.dataset.reviewWidget = '1';
    container.dataset.rwType = targetType;
    container.dataset.rwId = targetId;
    container.innerHTML = '<p style="color:#888">Loading reviews…</p>';
    try {
        const r = await fetch(API_BASE_URL + '/reviews/?target_type=' + targetType + '&target_id=' + targetId);
        const data = await r.json();
        const reviews = data.reviews || [];
        const avg = data.average || 0;
        const count = data.count || 0;
        const me = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
        const myId = me ? (me.user_id || me.id) : null;
        const myReview = myId ? reviews.find(rv => rv.user_id === myId) : null;

        let html = `
            <div class="review-summary">
                <div class="review-avg-box">
                    <span class="review-avg">${count ? avg.toFixed(1) : '—'}</span>
                    <span class="review-stars">${_starString(avg)}</span>
                </div>
                <span class="review-count">${count} review${count !== 1 ? 's' : ''}</span>
            </div>`;

        if (me && me.user_type !== 'admin' && me.user_type !== 'trek_organiser') {
            const cur = myReview ? myReview.rating : 0;
            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                starsHtml += `<span class="star-pick${i <= cur ? ' on' : ''}" data-v="${i}" onclick="pickStar(this)">★</span>`;
            }
            html += `
                <div class="review-form" data-tt="${targetType}" data-ti="${targetId}">
                    <strong>${myReview ? '✏️ Update your review' : '✍️ Write a review'}</strong>
                    <div class="star-picker" data-rating="${cur}">${starsHtml}</div>
                    <textarea class="review-comment" rows="3" placeholder="Share your experience…">${myReview ? _revEsc(myReview.comment || '') : ''}</textarea>
                    <div class="review-form-actions">
                        <button type="button" class="btn btn-primary btn-small" onclick="submitReview(this)">${myReview ? 'Update Review' : 'Post Review'}</button>
                        <span class="review-msg"></span>
                    </div>
                </div>`;
        } else if (!me) {
            html += '<p style="font-size:0.85rem; color:#888">Sign in as a tourist to leave a review.</p>';
        }

        if (reviews.length) {
            html += '<div class="review-list">' + reviews.map(rv => `
                <div class="review-item">
                    <div class="review-item-head">
                        <span class="review-item-avatar">${rv.reviewer_avatar
                            ? `<img src="${_revEsc(rv.reviewer_avatar)}" alt="">`
                            : (rv.reviewer_name || '?').charAt(0).toUpperCase()}</span>
                        <strong>${_revEsc(rv.reviewer_name)}</strong>
                        <span class="review-stars-sm">${_starString(rv.rating)}</span>
                    </div>
                    ${rv.comment ? `<p>${_revEsc(rv.comment)}</p>` : ''}
                    <small style="color:#999">${rv.created_at ? new Date(rv.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</small>
                </div>`).join('') + '</div>';
        } else {
            html += '<p style="color:#888; font-size:0.9rem">No reviews yet — be the first to review this.</p>';
        }
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = '<p style="color:#d33">Could not load reviews.</p>';
    }
}

function pickStar(el) {
    const picker = el.parentElement;
    const v = parseInt(el.dataset.v, 10);
    picker.dataset.rating = v;
    Array.from(picker.children).forEach(s => {
        s.classList.toggle('on', parseInt(s.dataset.v, 10) <= v);
    });
}

async function submitReview(btn) {
    const form = btn.closest('.review-form');
    const msg = form.querySelector('.review-msg');
    const rating = parseInt(form.querySelector('.star-picker').dataset.rating, 10) || 0;
    const comment = form.querySelector('.review-comment').value.trim();
    if (rating < 1) {
        msg.style.color = '#d33';
        msg.textContent = ' Pick a star rating first';
        return;
    }
    msg.style.color = '#1565c0';
    msg.textContent = ' Submitting…';
    try {
        const r = await authFetch(API_BASE_URL + '/reviews/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_type: form.dataset.tt,
                target_id: parseInt(form.dataset.ti, 10),
                rating: rating,
                comment: comment
            })
        });
        const data = await r.json();
        if (!r.ok) {
            msg.style.color = '#d33';
            msg.textContent = ' ' + (data.error || 'Failed to post');
            return;
        }
        // Re-render the whole widget to show the new review + updated average
        const container = form.closest('[data-review-widget]');
        if (container) {
            renderReviewWidget(container.dataset.rwType, parseInt(container.dataset.rwId, 10), container);
        }
    } catch (e) {
        msg.style.color = '#d33';
        msg.textContent = ' Network error';
    }
}
