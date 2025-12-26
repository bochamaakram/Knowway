/**
 * knowway Utility Functions
 * Common helpers used across all pages
 */

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Debounce function for search inputs
 */
function debounce(fn, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Update navbar with user info
 */
function updateNavbar() {
    const userContainer = document.getElementById('navbarUser');
    if (!userContainer) return;

    const user = JSON.parse(localStorage.getItem('user'));
    userContainer.innerHTML = user
        ? `<a href="profile.html"><button class="btn btn-sm" style="background:var(--primary);color:var(--crust);width:40px;height:40px;border-radius:var(--radius-full);font-weight:700;">${user.username.charAt(0).toUpperCase()}</button></a>`
        : `<a href="login.html" class="btn btn-secondary btn-sm">Log in</a>`;
}

/**
 * Logout user
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return !!localStorage.getItem('token');
}

/**
 * Get current user
 */
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('user'));
}

/**
 * Format category label
 */
function formatCategory(cat) {
    const labels = { dev: 'Development', design: 'Design', marketing: 'Marketing' };
    return labels[cat] || cat;
}

/**
 * Format date
 */
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Parse simple markdown to HTML
 */
function parseMarkdown(content) {
    if (!content) return '';
    return content
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1">')
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^([^<].*)$/gm, '<p>$1</p>');
}

/**
 * Get YouTube/Vimeo embed URL
 */
function getVideoEmbedUrl(url) {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return null;
}
