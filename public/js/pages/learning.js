/**
 * Learning Page JavaScript
 */
let allPurchases = [];
let filters = { search: '', category: '', progress: '' };

document.addEventListener('DOMContentLoaded', async () => {
    updateNavbar();
    setupFilters();
    await loadMyCourses();
});

function setupFilters() {
    document.getElementById('searchInput').addEventListener('input', debounce(e => {
        filters.search = e.target.value.toLowerCase();
        applyFilters();
    }, 300));

    document.getElementById('categoryFilter').addEventListener('change', e => {
        filters.category = e.target.value;
        applyFilters();
    });

    document.getElementById('progressFilter').addEventListener('change', e => {
        filters.progress = e.target.value;
        applyFilters();
    });

    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('keypress', e => {
            if (e.key === 'Enter') window.location.href = 'explore.html?search=' + encodeURIComponent(e.target.value);
        });
    }
}

function clearFilters() {
    filters = { search: '', category: '', progress: '' };
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('progressFilter').value = '';
    applyFilters();
}

async function loadMyCourses() {
    document.getElementById('loadingState').style.display = 'none';

    if (!isAuthenticated()) {
        document.getElementById('loginPrompt').style.display = 'block';
        return;
    }

    try {
        const res = await api.getMyPurchases();
        if (res.success && res.purchases.length > 0) {
            allPurchases = res.purchases;
            applyFilters();
        } else {
            document.getElementById('emptyState').style.display = 'block';
        }
    } catch (e) {
        console.error(e);
        document.getElementById('emptyState').style.display = 'block';
    }
}

function applyFilters() {
    let filtered = [...allPurchases];

    if (filters.search) {
        filtered = filtered.filter(c =>
            c.title.toLowerCase().includes(filters.search) ||
            (c.author && c.author.toLowerCase().includes(filters.search))
        );
    }

    if (filters.category) {
        filtered = filtered.filter(c => c.category === filters.category);
    }

    if (filters.progress) {
        filtered = filtered.filter(c => {
            const progress = c.progress || 0;
            if (filters.progress === 'not-started') return progress === 0;
            if (filters.progress === 'in-progress') return progress > 0 && progress < 100;
            if (filters.progress === 'completed') return progress === 100;
            return true;
        });
    }

    renderCourses(filtered);
}

function renderCourses(courses) {
    const container = document.getElementById('myCourses');
    const noResults = document.getElementById('noResults');
    const resultsCount = document.getElementById('resultsCount');

    if (courses.length === 0) {
        container.style.display = 'none';
        noResults.style.display = 'block';
        resultsCount.style.display = 'none';
        return;
    }

    noResults.style.display = 'none';
    container.style.display = 'block';
    resultsCount.style.display = 'block';
    resultsCount.textContent = `${courses.length} course${courses.length !== 1 ? 's' : ''}`;

    container.innerHTML = courses.map(c => {
        const progress = c.progress || 0;
        return `
        <div class="course-card-enrolled" onclick="window.location.href='course.html?id=${c.id}'">
            <img src="${c.image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400'}" onerror="this.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400'">
            <div class="course-card-enrolled-content">
                <div class="course-card-enrolled-title">${escapeHtml(c.title)}</div>
                <div class="course-card-enrolled-instructor">${escapeHtml(c.author || 'Instructor')} · ${formatCategory(c.category)}</div>
                <div class="progress-container">
                    <div class="progress-bar"><div class="progress-bar-fill" style="width:${progress}%"></div></div>
                    <div class="progress-text">${progress}% complete</div>
                </div>
            </div>
        </div>`;
    }).join('');
}
