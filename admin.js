/**
 * CheckMate - Admin Portal Script
 * Merged pages: admin.html
 */

document.addEventListener('DOMContentLoaded', () => {
    initializeSharedData();

    if (window.location.pathname.includes('admin.html')) {
        initMergedAdminPortal();
    } else {
        initLegacyAdminPortal(window.location.pathname);
    }

    setupGlobalNavigation();
    setupCreateEventForm();
});

/* ==========================================================================
   INITIALIZATION & SEED DATA
   ========================================================================== */
function initializeSharedData() {
    if (!localStorage.getItem('checkmate_events')) {
        const sampleEvents = [
            {
                id: 1,
                title: 'Barangay Clean-up Drive',
                location: 'Pulang Lupa Dos Basketball Court',
                date: '2026-11-20',
                status: 'upcoming',
                description: 'Join us for our monthly community cleanup initiative. Supplies will be provided.'
            },
            {
                id: 2,
                title: 'Free Health & Dental Checkup',
                location: 'Pulang Lupa Dos Health Center',
                date: '2026-11-11',
                status: 'ongoing',
                description: 'Free consultations, blood pressure checking, and basic medication distribution.'
            },
            {
                id: 3,
                title: 'Youth Basketball Tournament',
                location: 'Barangay Covered Court',
                date: '2026-10-15',
                status: 'completed',
                description: 'Annual Inter-Purok Youth Sports League Finals.'
            }
        ];
        localStorage.setItem('checkmate_events', JSON.stringify(sampleEvents));
    }

    {
        const stored = JSON.parse(localStorage.getItem('checkmate_events')) || [];
        const defaults = { 1: 'Environment', 2: 'Health', 3: 'Sports' };
        let changed = false;

        stored.forEach(e => {
            if (!e.category) {
                e.category = defaults[e.id] || 'Community';
                changed = true;
            }
        });

        if (changed) {
            localStorage.setItem('checkmate_events', JSON.stringify(stored));
        }
    }

    if (!localStorage.getItem('checkmate_users')) {
        const sampleUsers = [
            { id: 1, name: 'Juan Dela Cruz', surname: 'Dela Cruz', email: 'citizen@example.com', password: 'citizen123', role: 'Citizen', joined: '2026-01-10' },
            { id: 2, name: 'Maria Santos', surname: 'Santos', email: 'maria@example.com', password: 'maria123', role: 'Citizen', joined: '2026-03-22' },
            { id: 3, name: 'System Administrator', surname: 'Administrator', email: 'admin@checkmate.com', password: 'admin123', role: 'Admin', joined: '2026-01-01' }
        ];

        localStorage.setItem('checkmate_users', JSON.stringify(sampleUsers));
    }
}


/* ==========================================================================
   MERGED ADMIN PAGE
   ========================================================================== */
function initMergedAdminPortal() {
    showAdminSection(getAdminSectionFromHash());

    window.addEventListener('hashchange', () => {
        showAdminSection(getAdminSectionFromHash());
    });

    // Live update: when a new user signs up (or events change) in another tab,
    // refresh the admin view without needing a page reload
    window.addEventListener('storage', e => {
        if (e.key !== 'checkmate_users' && e.key !== 'checkmate_events') return;

        const section = getAdminSectionFromHash();

        if (section === 'users') renderAdminUsers();
        if (section === 'dashboard') renderAdminDashboard();
        if (section === 'events') loadAdminEventsTable();
    });
}

function parseAdminHash() {
    const raw = window.location.hash.replace('#', '');
    const [name, query = ''] = raw.split('?');
    return { name, params: new URLSearchParams(query) };
}

function getAdminSectionFromHash() {
    const hash = parseAdminHash().name;

    if (hash === 'events') return 'events';
    if (hash === 'create-event') return 'create-event';
    if (hash === 'users') return 'users';

    return 'dashboard';
}

function showAdminSection(section) {
    document.querySelectorAll('.admin-section').forEach(el => {
        el.style.display = 'none';
    });

    document.querySelectorAll('.navbar-list li[data-section]').forEach(el => {
        el.classList.remove('active');
    });

    if (section === 'events') {
        document.getElementById('admin-events-section').style.display = 'block';
        document.querySelector('[data-section="events"]').classList.add('active');
        renderAdminManageEvents();
        return;
    }

    if (section === 'create-event') {
        document.getElementById('admin-create-section').style.display = 'block';
        document.querySelector('[data-section="events"]').classList.add('active');
        setupCreateEventForm();
        loadEventForEditing();
        return;
    }

    if (section === 'users') {
        document.getElementById('admin-users-section').style.display = 'block';
        document.querySelector('[data-section="users"]').classList.add('active');
        renderAdminUsers();
        return;
    }

    document.getElementById('admin-dashboard-section').style.display = 'block';
    document.querySelector('[data-section="dashboard"]').classList.add('active');
    renderAdminDashboard();
}


/* ==========================================================================
   DASHBOARD
   ========================================================================== */
function renderAdminDashboard() {
    const events = JSON.parse(localStorage.getItem('checkmate_events')) || [];
    const users = JSON.parse(localStorage.getItem('checkmate_users')) || [];
    const contentPanel = document.querySelector('#dashboardPanel');

    if (!contentPanel) return;

    const upcomingCount = events.filter(e => e.status === 'upcoming').length;
    const ongoingCount = events.filter(e => e.status === 'ongoing').length;

    contentPanel.innerHTML = `
        <h2 class="mb-3">Overview Summary</h2>

        <div class="row g-3">
            <div class="col-md-3">
                <div class="p-3 border rounded bg-light text-center">
                    <h3 class="fw-bold text-primary">${events.length}</h3>
                    <span class="text-muted small">Total Events</span>
                </div>
            </div>

            <div class="col-md-3">
                <div class="p-3 border rounded bg-light text-center">
                    <h3 class="fw-bold text-warning">${upcomingCount}</h3>
                    <span class="text-muted small">Upcoming</span>
                </div>
            </div>

            <div class="col-md-3">
                <div class="p-3 border rounded bg-light text-center">
                    <h3 class="fw-bold text-success">${ongoingCount}</h3>
                    <span class="text-muted small">Ongoing</span>
                </div>
            </div>

            <div class="col-md-3">
                <div class="p-3 border rounded bg-light text-center">
                    <h3 class="fw-bold text-info">${users.length}</h3>
                    <span class="text-muted small">Registered Users</span>
                </div>
            </div>
        </div>
    `;
}


/* ==========================================================================
   MANAGE EVENTS
   ========================================================================== */
let adminStatusFilter = 'upcoming';
let adminSearchQuery = '';

function renderAdminManageEvents() {
    const contentPanel = document.querySelector('#eventsPanel');
    if (!contentPanel) return;

    adminSearchQuery = '';

    contentPanel.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
                <h2>Community Events</h2>
                <p>Manage all active, upcoming, and past community events.</p>
            </div>

            <a href="admin.html#create-event" class="btn btn-primary" id="btnOpenCreateEvent">
                <i class="bx bx-plus"></i> Create Event
            </a>
        </div>

        <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
            <ul class="nav nav-pills" id="adminStatusTabs">
                <li class="nav-item">
                    <button type="button" class="nav-link" data-status="upcoming">Upcoming Events</button>
                </li>
                <li class="nav-item">
                    <button type="button" class="nav-link" data-status="ongoing">Ongoing Events</button>
                </li>
                <li class="nav-item">
                    <button type="button" class="nav-link" data-status="completed">Completed Events</button>
                </li>
            </ul>

            <input type="search"
                   class="form-control"
                   id="adminSearchInput"
                   style="max-width: 300px;"
                   placeholder="Search by name or category..."
                   aria-label="Search events">
        </div>

        <div class="table-responsive">
            <table class="table table-hover align-middle">
                <thead class="table-light">
                    <tr>
                        <th>Event Details</th>
                        <th>Category</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th style="width: 260px;">Actions</th>
                    </tr>
                </thead>

                <tbody id="adminEventsTableBody"></tbody>
            </table>
        </div>
    `;

    document.querySelectorAll('#adminStatusTabs .nav-link').forEach(btn => {
        btn.addEventListener('click', () => {
            adminStatusFilter = btn.dataset.status;
            updateAdminTabs();
            loadAdminEventsTable();
        });
    });

    document.getElementById('adminSearchInput').addEventListener('input', (e) => {
        adminSearchQuery = e.target.value;
        loadAdminEventsTable();
    });

    updateAdminTabs();
    loadAdminEventsTable();
}

function updateAdminTabs() {
    document.querySelectorAll('#adminStatusTabs .nav-link').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === adminStatusFilter);
    });
}

function loadAdminEventsTable() {
    const tbody = document.getElementById('adminEventsTableBody');
    if (!tbody) return;

    const allEvents = JSON.parse(localStorage.getItem('checkmate_events')) || [];

    let events = allEvents.filter(e => e.status === adminStatusFilter);

    const query = adminSearchQuery.trim().toLowerCase();

    if (query !== '') {
        events = events.filter(e =>
            (e.title || '').toLowerCase().includes(query) ||
            (e.category || '').toLowerCase().includes(query)
        );
    }

    if (events.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-3">
                    ${query ? 'No matching events found.' : `No ${adminStatusFilter} events.`}
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = events.map(event => `
        <tr>
            <td>
                <div class="fw-bold text-dark">${escapeHTML(event.title)}</div>
                <div class="text-muted small">${escapeHTML(event.description || 'Community event')}</div>
            </td>

            <td>${escapeHTML(event.category || 'Community')}</td>
            <td>${escapeHTML(event.date || '—')}</td>
            <td>${escapeHTML(event.startTime || event.time || '—')}</td>
            <td>${escapeHTML(event.location || '—')}</td>

            <td>
                <span class="badge ${getStatusBadge(event.status)}">
                    ${event.status}
                </span>
            </td>

            <td style="width: 260px;">
                ${event.status !== 'completed' ? `
                    <button class="btn btn-outline-success btn-sm me-1"
                        onclick="markAsCompleted('${event.id}')" title="Mark as Done">
                        <i class="bx bx-check"></i> Done
                    </button>
                ` : ''}

                <button class="btn btn-outline-primary btn-sm me-1"
                    onclick="editEvent('${event.id}')" title="Edit Event">
                    <i class="bx bx-edit"></i> Edit
                </button>

                <button class="btn btn-outline-danger btn-sm"
                    onclick="deleteEvent('${event.id}')" title="Delete Event">
                    <i class="bx bx-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}


/* ==========================================================================
   ADMIN ACTIONS
   ========================================================================== */
window.editEvent = function(id) {
    window.location.hash = `create-event?edit=${id}`;
};

window.deleteEvent = function(id) {
    if (confirm('Are you sure you want to delete this event?')) {
        let events = JSON.parse(localStorage.getItem('checkmate_events')) || [];
        events = events.filter(e => String(e.id) !== String(id));
        localStorage.setItem('checkmate_events', JSON.stringify(events));
        loadAdminEventsTable();
    }
};

window.markAsCompleted = function(id) {
    let events = JSON.parse(localStorage.getItem('checkmate_events')) || [];
    const index = events.findIndex(e => String(e.id) === String(id));

    if (index !== -1) {
        if (!confirm('Mark this event as completed?')) return;
        events[index].status = 'completed';
        localStorage.setItem('checkmate_events', JSON.stringify(events));
        loadAdminEventsTable();
    }
};


/* ==========================================================================
   USERS
   ========================================================================== */
function renderAdminUsers() {
    const contentPanel = document.querySelector('#usersPanel');
    if (!contentPanel) return;

    const users = JSON.parse(localStorage.getItem('checkmate_users')) || [];

    contentPanel.innerHTML = `
        <h2 class="mb-3">Registered Accounts</h2>

        <div class="table-responsive">
            <table class="table table-hover align-middle">
                <thead class="table-light">
                    <tr>
                        <th>First Name</th>
                        <th>Surname</th>
                        <th>Email</th>
                    </tr>
                </thead>

                <tbody>
                    ${users.map(user => {
                        const [nameFirst, ...surnameParts] = (user.name || '').split(' ');
                        const firstName = user.firstName || nameFirst;
                        const surname = user.surname || surnameParts.join(' ');

                        return `
                            <tr>
                                <td>${escapeHTML(firstName)}</td>
                                <td>${escapeHTML(surname)}</td>
                                <td>${escapeHTML(user.email)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}


/* ==========================================================================
   CREATE / EDIT EVENT FORM
   ========================================================================== */
function setupCreateEventForm() {
    const form = document.getElementById("createEventForm");

    if (!form || form.dataset.listenerAttached === 'true') return;

    form.dataset.listenerAttached = 'true';

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const eventId = document.getElementById("eventId").value;

        const eventData = {
            title: document.getElementById("inputTitle").value.trim(),
            date: document.getElementById("inputDate").value,
            startTime: document.getElementById("inputStartTime").value,
            endTime: document.getElementById("inputEndTime").value,
            location: document.getElementById("inputLocation").value.trim(),
            category: document.getElementById("inputCategory").value,
            status: document.getElementById("inputStatus").value,
            description: document.getElementById("inputDescription").value.trim(),
            requirements: document.getElementById("inputRequirements").value.trim()
        };

        if (eventData.endTime <= eventData.startTime) {
            alert('End time must be later than the start time.');
            return;
        }

        let events = JSON.parse(localStorage.getItem('checkmate_events')) || [];

        if (eventId) {
            const index = events.findIndex(e => String(e.id) === String(eventId));

            if (index !== -1) {
                events[index] = {
                    ...events[index],
                    ...eventData,
                    id: Number(eventId)
                };
            }
        } else {
            const newId = events.length
                ? Math.max(...events.map(e => Number(e.id) || 0)) + 1
                : 1;

            events.push({
                id: newId,
                ...eventData
            });
        }

        localStorage.setItem('checkmate_events', JSON.stringify(events));

        adminStatusFilter = eventData.status;

        alert(eventId ? 'Event updated successfully.' : 'Event published successfully.');
        window.location.hash = 'events';
    });
}

function loadEventForEditing() {
    const title = document.getElementById('createEventPageTitle');
    const eventIdInput = document.getElementById('eventId');

    if (!title || !eventIdInput) return;

    const editId = parseAdminHash().params.get('edit');

    if (!editId) {
        const form = document.getElementById('createEventForm');
        if (form) form.reset();
        title.textContent = 'Create Event';
        eventIdInput.value = '';
        document.getElementById('btnSaveEvent').textContent = 'Publish Event';
        return;
    }

    const events = JSON.parse(localStorage.getItem('checkmate_events')) || [];
    const event = events.find(e => String(e.id) === String(editId));

    if (!event) {
        window.location.href = 'admin.html#events';
        return;
    }

    title.textContent = 'Edit Event';
    document.getElementById('btnSaveEvent').textContent = 'Save Changes';

    eventIdInput.value = event.id;
    document.getElementById('inputTitle').value = event.title || '';
    document.getElementById('inputDate').value = event.date || '';
    document.getElementById('inputLocation').value = event.location || '';
    document.getElementById('inputStartTime').value = event.startTime || '';
    document.getElementById('inputEndTime').value = event.endTime || '';
    document.getElementById('inputCategory').value = event.category || 'Community';
    document.getElementById('inputStatus').value = event.status || 'upcoming';
    document.getElementById('inputDescription').value = event.description || '';
    document.getElementById('inputRequirements').value = event.requirements || '';
}


/* ==========================================================================
   LEGACY SUPPORT
   ========================================================================== */
function initLegacyAdminPortal(path) {
    if (path.includes('admin-dashboard.html')) {
        renderAdminDashboard();
    } else if (path.includes('admin-manage-events.html')) {
        renderAdminManageEvents();
    } else if (path.includes('admin-users.html')) {
        renderAdminUsers();
    }
}


/* ==========================================================================
   GLOBAL UTILITIES & NAVIGATION
   ========================================================================== */
function setupGlobalNavigation() {
    const logoutLinks = document.querySelectorAll('a[href="index.html"]');

    logoutLinks.forEach(link => {
        link.addEventListener('click', () => {
            sessionStorage.removeItem('checkmate_user');
        });
    });

    const adminBadge = document.querySelector('.admin-account');

    if (adminBadge) {
        adminBadge.style.cursor = 'pointer';
        adminBadge.title = 'Click to Logout';

        adminBadge.addEventListener('click', () => {
            if (confirm('Log out of Admin Portal?')) {
                sessionStorage.removeItem('checkmate_user');
                window.location.href = 'index.html';
            }
        });
    }
}

function getStatusBadge(status) {
    switch (status) {
        case 'upcoming': return 'bg-primary';
        case 'ongoing': return 'bg-success';
        case 'completed': return 'bg-secondary';
        default: return 'bg-dark';
    }
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