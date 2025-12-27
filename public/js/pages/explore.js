/**
 * Explore Page JavaScript
 */
let allCourses = [];
let filteredCourses = [];
let favoriteIds = [];
let purchasedIds = [];
let currentPage = 1;
const limit = 6;
let filters = { category: '', level: '', search: '', sort: 'newest' };

document.addEventListener('DOMContentLoaded', async () => {
    updateNavbar();

    // Parse URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('search')) {
        filters.search = urlParams.get('search');
        document.getElementById('searchInput').value = filters.search;
    }
    if (urlParams.get('category')) {
        filters.category = urlParams.get('category');
    }

    setupFilters();
    await loadCourses();
});

function setupFilters() {
    document.getElementById('searchInput').addEventListener('input', debounce(e => {
        filters.search = e.target.value.toLowerCase();
        currentPage = 1;
        applyFilters();
    }, 300));

    document.getElementById('categoryFilter').addEventListener('change', e => {
        filters.category = e.target.value;
        currentPage = 1;
        applyFilters();
    });

    document.getElementById('levelFilter').addEventListener('change', e => {
        filters.level = e.target.value;
        currentPage = 1;
        applyFilters();
    });

    document.getElementById('sortFilter').addEventListener('change', e => {
        filters.sort = e.target.value;
        applyFilters();
    });

    // Set initial values from URL params
    if (filters.category) {
        document.getElementById('categoryFilter').value = filters.category;
    }
}

async function loadCourses() {
    try {
        const res = await api.getCourses({ limit: 100 });
        if (res.success) {
            allCourses = res.courses;

            if (isAuthenticated()) {
                const [favRes, purchRes] = await Promise.all([
                    api.getMyFavoriteIds(),
                    api.getMyPurchaseIds()
                ]);
                if (favRes.success) favoriteIds = favRes.favoriteIds;
                if (purchRes.success) purchasedIds = purchRes.purchaseIds;
            }

            applyFilters();
        }
    } catch (e) {
        console.error(e);
    }

    document.getElementById('loadingState').classList.add('hidden');
}

function applyFilters() {
    filteredCourses = allCourses.filter(c => {
        if (filters.category && c.category !== filters.category) return false;
        if (filters.level && c.level !== filters.level) return false;
        if (filters.search) {
            const search = filters.search.toLowerCase();
            if (!c.title.toLowerCase().includes(search) &&
                !(c.author && c.author.toLowerCase().includes(search))) return false;
        }
        return true;
    });

    // Apply sorting
    if (filters.sort === 'newest') {
        filteredCourses.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (filters.sort === 'popular') {
        filteredCourses.sort((a, b) => (b.enrollment_count || 0) - (a.enrollment_count || 0));
    } else if (filters.sort === 'title') {
        filteredCourses.sort((a, b) => a.title.localeCompare(b.title));
    }

    document.getElementById('resultsCount').textContent = `${filteredCourses.length} results`;
    renderCourses();
    updatePagination();
}

function renderCourses() {
    const start = (currentPage - 1) * limit;
    const courses = filteredCourses.slice(start, start + limit);
    const grid = document.getElementById('coursesGrid');

    if (!courses.length) {
        grid.innerHTML = '';
        document.getElementById('emptyState').classList.remove('hidden');
        return;
    }
    document.getElementById('emptyState').classList.add('hidden');

    grid.innerHTML = courses.map(c => {
        const isFavorite = favoriteIds.includes(c.id);
        const isFree = c.is_free;
        const pointCost = c.point_cost || 0;

        return `
        <div class="card">
            <div onclick="window.location.href='course.html?id=${c.id}'">
                <button class="wishlist-btn ${isFavorite ? 'active' : ''}" onclick="event.stopPropagation();toggleFavorite(${c.id},this)">${isFavorite ? '♥' : '♡'}</button>
                <img src="${c.image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400'}" class="card-img" onerror="this.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400'">
                <div class="card-body">
                    <h3 class="card-title">${escapeHtml(c.title)}</h3>
                    <p class="card-instructor">${escapeHtml(c.author || 'Instructor')}</p>
                    <p style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${formatCategory(c.category)} · ${c.level} · ${c.duration || 0}h</p>
                    <div class="card-price">
                        <span class="price-current" style="${isFree ? 'color:var(--green)' : 'color:var(--yellow)'}">${isFree ? 'Free' : ' ' + pointCost + ' pts'}</span>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

function updatePagination() {
    const totalPages = Math.ceil(filteredCourses.length / limit);
    const pagination = document.getElementById('pagination');

    if (totalPages <= 1) {
        pagination.classList.add('hidden');
        return;
    }

    pagination.classList.remove('hidden');
    document.getElementById('paginationInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevBtn').disabled = currentPage <= 1;
    document.getElementById('nextBtn').disabled = currentPage >= totalPages;
}

function changePage(delta) {
    currentPage += delta;
    renderCourses();
    updatePagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function toggleFavorite(id, btn) {
    if (!isAuthenticated()) {
        showToast('Please log in first', 'error');
        window.location.href = 'login.html';
        return;
    }

    try {
        if (favoriteIds.includes(id)) {
            await api.removeFavorite(id);
            favoriteIds = favoriteIds.filter(i => i !== id);
            btn.innerHTML = '♡';
            btn.classList.remove('active');
        } else {
            await api.addFavorite(id);
            favoriteIds.push(id);
            btn.innerHTML = '♥';
            btn.classList.add('active');
            showToast('Added to favorites');
        }
    } catch (e) {
        showToast('Failed', 'error');
    }
}
