/**
 * knowway Utility Functions
 * ==========================
 * Common helper functions used across all pages in the application.
 * Includes authentication, UI helpers, formatting, and markdown parsing.
 */

/**
 * Escape HTML to prevent XSS (Cross-Site Scripting) attacks
 * Converts special characters like <, >, & to their HTML entity equivalents
 * 
 * @param {string} text - The raw text to escape
 * @returns {string} - HTML-safe text
 */
function escapeHtml(text) {
    // Return empty string if input is null/undefined
    if (!text) return '';

    // Create a temporary div element
    const div = document.createElement('div');

    // Setting textContent automatically escapes HTML
    div.textContent = text;

    // Return the escaped HTML from innerHTML
    return div.innerHTML;
}

/**
 * Debounce Function
 * Delays function execution until after a specified time has passed
 * since the last call. Useful for search inputs to avoid excessive API calls.
 * 
 * @param {Function} fn - The function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(fn, delay) {
    // Store timeout reference
    let timeout;

    // Return wrapper function that resets timer on each call
    return function (...args) {
        // Clear any existing timeout
        clearTimeout(timeout);

        // Set new timeout to execute function after delay
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Show Toast Notification
 * Displays a temporary message to the user that automatically disappears
 * 
 * @param {string} message - The message to display
 * @param {string} type - Type of toast: 'success', 'error', 'info'
 */
function showToast(message, type = 'success') {
    // Find the toast container element
    const container = document.getElementById('toastContainer');
    if (!container) return;

    // Create new toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Auto-remove after 3 seconds with fade-out animation
    setTimeout(() => {
        toast.style.opacity = '0';  // Start fade-out
        setTimeout(() => toast.remove(), 300);  // Remove after animation
    }, 3000);
}

/**
 * Update Navbar with User Info
 * Displays user avatar and points balance if logged in,
 * or login button if not authenticated
 */
async function updateNavbar() {
    // Find the navbar user container
    const userContainer = document.getElementById('navbarUser');
    if (!userContainer) return;

    // Check if authenticated first
    if (!isAuthenticated()) {
        // User is not logged in - show login button
        userContainer.innerHTML = `<a href="login.html" class="btn btn-secondary btn-sm">Log in</a>`;
        return;
    }

    // Get user data from API
    const user = await getCurrentUser();

    if (user) {
        // User is logged in - show points and avatar
        let pointsHtml = '';

        try {
            // Fetch current points balance from API
            const res = await api.getPointsBalance();
            if (res.success) {
                pointsHtml = `<span class="points-badge" title="Your Points"> ${res.points}</span>`;
            }
        } catch (e) { /* Silently fail if points fetch fails */ }

        // Render avatar button with first letter of username
        userContainer.innerHTML = `
            ${pointsHtml}
            <a href="profile.html">
                <button class="btn btn-sm" style="background:var(--primary);color:var(--crust);width:40px;height:40px;border-radius:var(--radius-full);font-weight:700;">
                    ${user.username.charAt(0).toUpperCase()}
                </button>
            </a>
        `;
    } else {
        // Token invalid - show login button
        userContainer.innerHTML = `<a href="login.html" class="btn btn-secondary btn-sm">Log in</a>`;
    }
}

/**
 * Get Token from Cookie
 * @returns {string|null} - Token or null if not found
 */
function getAuthToken() {
    const match = document.cookie.match(/auth_token=([^;]+)/);
    return match ? match[1] : null;
}

/**
 * Logout User
 * Clears authentication token cookie and redirects to login page
 */
function logout() {
    // Remove auth token by setting expired cookie
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

    // Clear user cache
    cachedUser = null;

    // Redirect to login page
    window.location.href = 'login.html';
}

/**
 * Check Authentication Status
 * @returns {boolean} - True if user has a valid token in cookie
 */
function isAuthenticated() {
    // Returns true if token exists in cookie
    return !!getAuthToken();
}

// Cache for user data to avoid repeated API calls
let cachedUser = null;

/**
 * Get Current User Data (async - fetches from API)
 * @returns {Promise<object|null>} - User object or null if not logged in
 */
async function getCurrentUser() {
    // If not authenticated, return null
    if (!isAuthenticated()) {
        cachedUser = null;
        return null;
    }

    // Return cached user if available
    if (cachedUser) {
        return cachedUser;
    }

    // Fetch user data from API
    try {
        const res = await api.getMe();
        if (res.success) {
            cachedUser = res.user;
            return res.user;
        } else {
            // Token is invalid, clear it
            localStorage.removeItem('token');
            return null;
        }
    } catch (e) {
        console.error('Error fetching user:', e);
        return null;
    }
}

/**
 * Clear user cache (call after updates)
 */
function clearUserCache() {
    cachedUser = null;
}

/**
 * Format Category Code to Display Label
 * Converts category codes to human-readable labels
 * 
 * @param {string} cat - Category code (dev, design, marketing)
 * @returns {string} - Human-readable label
 */
function formatCategory(cat) {
    // Map of category codes to display labels
    const labels = {
        dev: 'Development',
        design: 'Design',
        marketing: 'Marketing'
    };

    // Return mapped label or original if not found
    return labels[cat] || cat;
}

/**
 * Format Date String
 * Converts ISO date string to readable format (e.g., "Jan 15, 2024")
 * 
 * @param {string} dateStr - ISO date string
 * @returns {string} - Formatted date string
 */
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',  // "Jan", "Feb", etc.
        day: 'numeric',   // 1-31
        year: 'numeric'   // 2024
    });
}

/**
 * Parse Markdown to HTML
 * Converts simple markdown syntax to HTML for lesson content display
 * Supports: headings, bold, italic, code blocks, lists, links, images
 * 
 * @param {string} content - Markdown content
 * @returns {string} - HTML string
 */
function parseMarkdown(content) {
    if (!content) return '';

    // STEP 1: Extract and preserve code blocks to prevent processing their content
    const codeBlocks = [];
    content = content.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
        // Store code block and replace with placeholder
        codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
        return `%%CODEBLOCK${codeBlocks.length - 1}%%`;
    });

    // STEP 2: Convert markdown syntax to HTML
    let html = content
        // Headings: ### -> <h3>, ## -> <h2>, # -> <h1>
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')

        // Bold: **text** -> <strong>text</strong>
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

        // Italic: *text* -> <em>text</em>
        .replace(/\*(.+?)\*/g, '<em>$1</em>')

        // Inline code: `code` -> <code>code</code>
        .replace(/`(.+?)`/g, '<code>$1</code>')

        // Images: ![alt](url) -> <img>
        .replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1">')

        // Links: [text](url) -> <a>
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');

    // STEP 3: Process lists (unordered and ordered)
    const lines = html.split('\n');
    let result = [];
    let listStack = [];  // Track nested list depth and type

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check for unordered list item: - item or * item
        const ulMatch = line.match(/^(\s*)[-*]\s+(.+)$/);

        // Check for ordered list item: 1. item
        const olMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);

        if (ulMatch) {
            // Handle unordered list item
            const indent = ulMatch[1].length;
            const text = ulMatch[2];
            const level = Math.floor(indent / 2);

            // Close deeper nested lists
            while (listStack.length > level + 1) {
                result.push(listStack.pop() === 'ul' ? '</ul>' : '</ol>');
            }

            // Open new list if needed
            if (listStack.length <= level) {
                result.push('<ul>');
                listStack.push('ul');
            }

            result.push(`<li>${text}</li>`);
        } else if (olMatch) {
            // Handle ordered list item
            const indent = olMatch[1].length;
            const text = olMatch[3];
            const level = Math.floor(indent / 2);

            // Close deeper nested lists
            while (listStack.length > level + 1) {
                result.push(listStack.pop() === 'ul' ? '</ul>' : '</ol>');
            }

            // Open new list if needed
            if (listStack.length <= level) {
                result.push('<ol>');
                listStack.push('ol');
            }

            result.push(`<li>${text}</li>`);
        } else {
            // Regular line - close all open lists
            while (listStack.length > 0) {
                result.push(listStack.pop() === 'ul' ? '</ul>' : '</ol>');
            }

            // Wrap non-heading lines in paragraph tags
            if (line.trim() && !line.startsWith('<h') && !line.startsWith('<')) {
                result.push(`<p>${line}</p>`);
            } else {
                result.push(line);
            }
        }
    }

    // Close any remaining open lists
    while (listStack.length > 0) {
        result.push(listStack.pop() === 'ul' ? '</ul>' : '</ol>');
    }

    html = result.join('\n');

    // STEP 4: Restore code blocks from placeholders
    codeBlocks.forEach((block, i) => {
        html = html.replace(`%%CODEBLOCK${i}%%`, block);
    });

    // STEP 5: Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');

    return html;
}

/**
 * Get Video Embed URL
 * Converts YouTube and Vimeo watch URLs to embeddable iframe URLs
 * 
 * @param {string} url - Video URL (YouTube or Vimeo)
 * @returns {string|null} - Embed URL or null if not recognized
 */
function getVideoEmbedUrl(url) {
    if (!url) return null;

    // Match YouTube URLs: youtube.com/watch?v=ID or youtu.be/ID
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

    // Match Vimeo URLs: vimeo.com/ID
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

    // URL not recognized
    return null;
}
