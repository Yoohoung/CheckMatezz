/**
 * CheckMate - Citizen Portal Script
 * Reads the SAME 'checkmate_events' list that the admin portal writes to,
 * so whatever the admin creates, edits, completes or deletes shows up here.
 */

const CM_EVENTS_KEY = 'checkmate_events';
const CM_VALID_STATUSES = ['upcoming', 'ongoing', 'completed'];

let citizenStatusFilter = 'upcoming';
let citizenSearchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
    setupCitizenNavigation();
    setupCitizenSearch();

    showCitizenSection();

    window.addEventListener('hashchange', showCitizenSection);

    // Live update: admin changes events in another tab -> refresh here
    window.addEventListener('storage', (e) => {
        if (e.key !== CM_EVENTS_KEY) return;
        showCitizenSection();
    });

    // Also refresh when the tab becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) showCitizenSection();
    });
});


/* ==========================================================================
   DATA
   ========================================================================== */
function getCitizenEvents() {
    try {
        const events = JSON.parse(localStorage.getItem(CM_EVENTS_KEY));
        return Array.isArray(events) ? events : [];
    } catch (err) {
        return [];
    }
}


/* ==========================================================================
   ROUTING (hash)
   ========================================================================== */
function getCitizenRoute() {
    const hash = window.location.hash.replace('#', '').split('?')[0];

    if (CM_VALID_STATUSES.includes(hash)) {
        return { section: 'events', status: hash };
    }

    return { section: 'home', status: null };
}

function showCitizenSection() {
    const route = getCitizenRoute();

    const home = document.getElementById('citizen-home-section');
    const events = document.getElementById('citizen-events-section');

    if (route.section === 'events') {
        if (citizenStatusFilter !== route.status) {
            citizenStatusFilter = route.status;
            citizenSearchQuery = '';
            const input = document.getElementById('searchInput');
            if (input) input.value = '';
        }

        home.style.display = 'none';
        events.style.display = 'block';

        updateCitizenTabs();
        renderCitizenEvents();
    } else {
        events.style.display = 'none';
        home.style.display = 'block';

        renderFeaturedEvents();
    }

    updateTopNavActive(route.section);
}

function updateCitizenTabs() {
    document.querySelectorAll('[data-event-status]').forEach(link => {
        link.classList.toggle('active', link.dataset.eventStatus === citizenStatusFilter);
    });
}

function updateTopNavActive(section) {
    document.querySelectorAll('[data-citizen-nav]').forEach(link => {
        const isHome = link.dataset.citizenNav === 'home' && section === 'home';
        const isEvents = link.dataset.citizenNav === 'events' && section === 'events';
        link.classList.toggle('active', isHome || isEvents);
    });
}


/* ==========================================================================
   HOME - FEATURED EVENTS
   ========================================================================== */
function renderFeaturedEvents() {
    const container = document.querySelector('.featured-events-container');
    if (!container) return;

    const featured = getCitizenEvents()
        .filter(e => e.status === 'ongoing' || e.status === 'upcoming')
        .sort((a, b) => {
            // ongoing first, then the nearest date
            if (a.status !== b.status) return a.status === 'ongoing' ? -1 : 1;
            return String(a.date || '').localeCompare(String(b.date || ''));
        })
        .slice(0, 3);

    if (featured.length === 0) {
        container.innerHTML = `
            <div class="empty-events" style="grid-column: 1 / -1;">
                <i class="bx bx-calendar"></i>
                <h3>Featured events</h3>
                <p>Featured community events will appear here.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = featured.map(buildEventCard).join('');
}


/* ==========================================================================
   EVENTS PAGE
   ========================================================================== */
function renderCitizenEvents() {
    const container = document.getElementById('citizenEventsContainer');
    if (!container) return;

    let events = getCitizenEvents().filter(e => e.status === citizenStatusFilter);

    const query = citizenSearchQuery.trim().toLowerCase();

    if (query) {
        events = events.filter(e =>
            (e.title || '').toLowerCase().includes(query) ||
            (e.category || '').toLowerCase().includes(query) ||
            (e.location || '').toLowerCase().includes(query)
        );
    }

    // Upcoming/ongoing: nearest date first. Completed: most recent first.
    events.sort((a, b) => {
        const cmp = String(a.date || '').localeCompare(String(b.date || ''));
        return citizenStatusFilter === 'completed' ? -cmp : cmp;
    });

    if (events.length === 0) {
        const label = capitalize(citizenStatusFilter);

        container.className = 'events-empty';
        container.innerHTML = `
            <i class="bx bx-calendar-event"></i>
            <h2>${query ? 'No matching events' : `${label} events`}</h2>
            <p>${query
                ? 'Try a different search word.'
                : `Community ${citizenStatusFilter} events will appear here.`}</p>
        `;
        return;
    }

    container.className = 'events-list';
    container.innerHTML = events.map(buildEventCard).join('');
}

function setupCitizenSearch() {
    const form = document.getElementById('citizenSearchForm');
    const input = document.getElementById('searchInput');

    if (!form || !input) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        citizenSearchQuery = input.value;
        renderCitizenEvents();
    });

    input.addEventListener('input', () => {
        citizenSearchQuery = input.value;
        renderCitizenEvents();
    });
}


/* ==========================================================================
   EVENT CARD + DETAILS MODAL
   ========================================================================== */
function buildEventCard(event) {
    const status = CM_VALID_STATUSES.includes(event.status) ? event.status : 'upcoming';

    return `
        <article class="featured-event-card">
            <div class="event-card-header">
                <span class="event-header-label">${escapeHTML(event.category || 'Community')}</span>
            </div>

            <div class="event-card-body">
                <div class="event-card-top">
                    <span class="event-status ${status}">
                        <span class="status-dot"></span>${escapeHTML(status)}
                    </span>
                    <span class="event-category">${escapeHTML(event.category || 'Community')}</span>
                </div>

                <h3 class="event-card-title">${escapeHTML(event.title)}</h3>

                <div class="event-info">
                    <div><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg></i><span>${escapeHTML(formatEventDate(event.date))}</span></div>
                    <div><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></i><span>${escapeHTML(formatEventTime(event))}</span></div>
                    <div><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg></i><span>${escapeHTML(event.location || '—')}</span></div>
                </div>

                <div class="event-card-divider"></div>

                <div class="event-card-bottom">
                    <span>${escapeHTML(event.description ? truncate(event.description, 40) : 'Community event')}</span>
                    <button type="button" class="view-details-btn"
                            onclick="openEventDetails('${escapeHTML(event.id)}')">
                        View Details <i class="bx bx-right-arrow-alt"></i>
                    </button>
                </div>
            </div>
        </article>
    `;
}

window.openEventDetails = function (id) {
    const event = getCitizenEvents().find(e => String(e.id) === String(id));
    if (!event) return;

    let modalEl = document.getElementById('eventDetailsModal');

    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.className = 'modal fade';
        modalEl.id = 'eventDetailsModal';
        modalEl.tabIndex = -1;
        modalEl.setAttribute('aria-hidden', 'true');
        document.body.appendChild(modalEl);
    }

    const status = CM_VALID_STATUSES.includes(event.status) ? event.status : 'upcoming';

    modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content event-details-modal">
                <div class="modal-header">
                    <h5 class="modal-title">${escapeHTML(event.title)}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>

                <div class="modal-body">
                    <div class="d-flex flex-wrap gap-3 align-items-center">
                        <span class="event-status ${status}">
                            <span class="status-dot"></span>${escapeHTML(status)}
                        </span>
                        <span class="event-category">${escapeHTML(event.category || 'Community')}</span>
                    </div>

                    <div class="event-detail-block">
                        <h6>Date</h6>
                        <p>${escapeHTML(formatEventDate(event.date))}</p>
                    </div>

                    <div class="event-detail-block">
                        <h6>Time</h6>
                        <p>${escapeHTML(formatEventTime(event))}</p>
                    </div>

                    <div class="event-detail-block">
                        <h6>Location</h6>
                        <p>${escapeHTML(event.location || '—')}</p>
                    </div>

                    <div class="event-detail-block">
                        <h6>Description</h6>
                        <p>${escapeHTML(event.description || 'No description provided.')}</p>
                    </div>

                    <div class="event-detail-block">
                        <h6>Requirements</h6>
                        <p>${escapeHTML(event.requirements || 'No special requirements.')}</p>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;

    bootstrap.Modal.getOrCreateInstance(modalEl).show();
};


/* ==========================================================================
   NAVIGATION / LOGOUT
   ========================================================================== */
function setupCitizenNavigation() {
    const logout = document.getElementById('citizenLogout');

    if (logout) {
        logout.addEventListener('click', () => {
            sessionStorage.removeItem('checkmate_user');
        });
    }

    // Personalize the greeting
    try {
        const user = JSON.parse(sessionStorage.getItem('checkmate_user'));
        const heading = document.querySelector('.content-middle-text');
        if (user && user.name && heading) {
            heading.textContent = `Welcome, ${user.name.split(' ')[0]}!`;
        }
    } catch (e) {}
}


/* ==========================================================================
   HELPERS
   ========================================================================== */
function formatEventDate(dateStr) {
    if (!dateStr) return '—';

    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d)) return dateStr;

    return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime12(timeStr) {
    if (!timeStr) return '';

    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return timeStr;

    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function formatEventTime(event) {
    const start = formatTime12(event.startTime || event.time);
    const end = formatTime12(event.endTime);

    if (start && end) return `${start} – ${end}`;
    return start || 'Time to be announced';
}

function truncate(str, max) {
    str = String(str);
    return str.length > max ? str.slice(0, max).trim() + '…' : str;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHTML(str) {
    return String(str ?? '').replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
