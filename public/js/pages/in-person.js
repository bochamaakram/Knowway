/**
 * In-Person Courses Page
 * Connects to n8n webhook for place search
 */

const N8N_WEBHOOK_URL = 'https://n8n.zackdev.io/webhook-test/search-places';

// DOM Elements
const searchForm = document.getElementById('searchForm');
const keywordInput = document.getElementById('keyword');
const cityInput = document.getElementById('city');
const searchBtn = document.getElementById('searchBtn');
const loadingState = document.getElementById('loadingState');
const resultsHeader = document.getElementById('resultsHeader');
const resultsTitle = document.getElementById('resultsTitle');
const resultsCount = document.getElementById('resultsCount');
const placesGrid = document.getElementById('placesGrid');
const emptyState = document.getElementById('emptyState');
const initialState = document.getElementById('initialState');
const quickTags = document.querySelectorAll('.quick-tag');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateNavbar(); // Use shared function from utils.js
    initQuickTags();

    // Handle form submission
    searchForm.addEventListener('submit', handleSearch);
});

// Quick tags handler
function initQuickTags() {
    quickTags.forEach(tag => {
        tag.addEventListener('click', () => {
            const keyword = tag.dataset.keyword;
            keywordInput.value = keyword;
            keywordInput.focus();
        });
    });
}

// Search handler
async function handleSearch(e) {
    e.preventDefault();

    const keyword = keywordInput.value.trim();
    const city = cityInput.value.trim();

    if (!keyword || !city) {
        showToast('Please enter both a keyword and city', 'error');
        return;
    }

    // Show loading state
    showLoading(true);
    hideAllStates();
    loadingState.classList.remove('hidden');

    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ keyword, city })
        });

        if (!response.ok) {
            throw new Error('Failed to fetch places');
        }

        const places = await response.json();
        displayResults(places, keyword, city);

    } catch (error) {
        console.error('Search error:', error);
        showToast('Failed to search places. Please try again.', 'error');
        showEmptyState();
    } finally {
        showLoading(false);
    }
}

// Display search results
function displayResults(places, keyword, city) {
    hideAllStates();

    if (!places || places.length === 0) {
        showEmptyState();
        return;
    }

    // Show results header
    resultsHeader.classList.remove('hidden');
    resultsTitle.textContent = `"${keyword}" in ${city}`;
    resultsCount.textContent = `${places.length} place${places.length !== 1 ? 's' : ''} found`;

    // Render place cards
    placesGrid.innerHTML = places.map(place => createPlaceCard(place)).join('');
}

// Create place card HTML
function createPlaceCard(place) {
    const rating = place.rating ? `
        <div class="place-rating">
            <span class="star icon-star"></span>
            <span>${place.rating}</span>
        </div>
        <span class="place-reviews">(${place.reviews || 0} reviews)</span>
    ` : '';

    const thumbnail = place.thumbnail
        ? `<img src="${place.thumbnail}" alt="${place.title}" class="place-thumbnail" onerror="this.outerHTML='<div class=\\'place-no-image icon-building icon-2xl\\'></div>'">`
        : `<div class="place-no-image icon-building icon-2xl"></div>`;

    const phoneBtn = place.phone
        ? `<a href="tel:${place.phone}" class="place-action-btn phone-btn"><span class="icon-phone"></span> Call</a>`
        : '';

    const websiteBtn = place.website
        ? `<a href="${place.website}" target="_blank" class="place-action-btn"><span class="icon-globe"></span> Website</a>`
        : '';

    return `
        <div class="place-card">
            ${thumbnail}
            <div class="place-content">
                ${place.type ? `<span class="place-type">${place.type}</span>` : ''}
                <h3 class="place-title">${escapeHtml(place.title)}</h3>
                <div class="place-address">
                    <span class="place-address-icon icon-location"></span>
                    <span>${escapeHtml(place.address || 'Address not available')}</span>
                </div>
                <div class="place-meta">
                    ${rating}
                    <div class="place-actions">
                        ${phoneBtn}
                        ${websiteBtn}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Helper functions
function showLoading(show) {
    searchBtn.disabled = show;
    if (show) {
        searchBtn.innerHTML = `
            <span class="btn-text">Searching...</span>
            <span class="spinner-small"></span>
        `;
    } else {
        searchBtn.innerHTML = `
            <span class="btn-text">Search Places</span>
            <span class="btn-icon">→</span>
        `;
    }
}

function hideAllStates() {
    loadingState.classList.add('hidden');
    resultsHeader.classList.add('hidden');
    emptyState.classList.add('hidden');
    initialState.classList.add('hidden');
    placesGrid.innerHTML = '';
}

function showEmptyState() {
    hideAllStates();
    emptyState.classList.remove('hidden');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
