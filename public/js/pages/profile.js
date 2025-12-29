/**
 * Profile Page JavaScript
 */
document.addEventListener('DOMContentLoaded', async () => {
    updateNavbar();

    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    await loadUserProfile();
    await loadDashboardData();
});

async function loadUserProfile() {
    // Fetch user from API (no localStorage)
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('profileAvatar').textContent = user.username.charAt(0).toUpperCase();
    document.getElementById('profileName').textContent = user.username;
    document.getElementById('profileEmail').textContent = user.email || '';

    try {
        const res = await api.getMyRole();
        if (res.success) {
            const role = res.role;
            const badge = document.getElementById('roleBadge');
            badge.className = 'role-badge ' + role;
            badge.textContent = role === 'super_admin' ? 'Super Admin' : role === 'teacher' ? 'Teacher' : 'Learner';

            if (role === 'super_admin') {
                document.getElementById('adminLink').style.display = 'inline-flex';
            }

            if (role === 'super_admin' || role === 'teacher') {
                document.getElementById('manageLink').style.display = 'inline-flex';
            }
        }
    } catch (e) { console.error(e); }
}

async function loadDashboardData() {
    try {
        const [purchasesRes, favoritesRes] = await Promise.all([
            api.getMyPurchases(),
            api.getMyFavorites()
        ]);

        if (purchasesRes.success) {
            const purchases = purchasesRes.purchases;
            document.getElementById('statEnrolled').textContent = purchases.length;

            const completed = purchases.filter(p => p.progress === 100).length;
            document.getElementById('statCompleted').textContent = completed;

            // Calculate hours learned proportionally based on progress
            // If course is 10h with 4 lessons and user completed 2, progress = 50%, hours = 5
            const hoursLearned = purchases.reduce((sum, p) => {
                const courseDuration = p.duration || 0;
                const progressPercent = (p.progress || 0) / 100;
                return sum + (courseDuration * progressPercent);
            }, 0);
            document.getElementById('statHours').textContent = hoursLearned.toFixed(1);

            renderProgressList(purchases.slice(0, 3));
            renderRecentActivity(purchases);
        }

        if (favoritesRes.success) {
            renderWishlist(favoritesRes.favorites.slice(0, 3));
        }
    } catch (e) { console.error(e); }
}

function renderProgressList(courses) {
    const container = document.getElementById('progressList');
    if (!courses.length) {
        container.innerHTML = '<div class="empty-state"><p>No courses in progress</p></div>';
        return;
    }

    container.innerHTML = courses.map(c => {
        const progress = c.progress || 0;
        return `
        <div class="course-card-enrolled" onclick="window.location.href='course.html?id=${c.id}'">
            <img src="${c.image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200'}" onerror="this.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200'">
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

function renderWishlist(favorites) {
    const container = document.getElementById('wishlistPreview');
    if (!favorites.length) {
        container.innerHTML = '<div class="empty-state"><p>No courses in favorites</p></div>';
        return;
    }

    container.innerHTML = favorites.map(c => `
        <div class="course-card-enrolled" onclick="window.location.href='course.html?id=${c.id}'">
            <img src="${c.image_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200'}" onerror="this.src='https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200'">
            <div class="course-card-enrolled-content">
                <div class="course-card-enrolled-title">${escapeHtml(c.title)}</div>
                <div class="course-card-enrolled-instructor">${escapeHtml(c.author || 'Instructor')} · ${formatCategory(c.category)}</div>
            </div>
        </div>
    `).join('');
}

function renderRecentActivity(purchases) {
    const container = document.getElementById('activityList');
    if (!purchases.length) {
        container.innerHTML = '<div class="empty-state"><p>No recent activity</p></div>';
        return;
    }

    container.innerHTML = purchases.slice(0, 4).map(p => `
        <div class="activity-item">
            <div class="activity-icon icon-books"></div>
            <div class="activity-content">
                <div class="activity-text">Enrolled in <strong>${escapeHtml(p.title)}</strong></div>
                <div class="activity-time">${formatDate(p.purchased_at || p.created_at)}</div>
            </div>
        </div>
    `).join('');
}
