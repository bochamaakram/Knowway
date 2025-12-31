/**
 * knowway API Client
 * ===================
 * This file provides a centralized API client for communicating with the backend.
 * It handles authentication tokens, request formatting, and error handling.
 * All API endpoints are organized by feature (Auth, Courses, Favorites, etc.)
 */

const api = {
    /**
     * Dynamic Base URL Configuration
     * ------------------------------
     * Automatically determines the correct API URL based on the current environment:
     * - Live Server (port 5500): Uses localhost:3000 for backend
     * - Local development (localhost/127.0.0.1): Uses relative /api path
     * - Production (Vercel): Uses relative /api path
     */
    baseUrl: (() => {
        // Extract current page's hostname, port, and protocol
        const { hostname, port, protocol } = window.location;

        // If running on VS Code Live Server (port 5500), backend is on port 3000
        if (port === '5500') return 'http://localhost:3000/api';

        // For localhost development, use relative path
        if (hostname === 'localhost' || hostname === '127.0.0.1') return '/api';

        // For production (Vercel deployment), use relative path
        return '/api';
    })(),

    /**
     * Core Request Method
     * -------------------
     * Makes authenticated HTTP requests to the API.
     * Automatically attaches JWT token from cookie if available.
     * 
     * @param {string} endpoint - The API endpoint (e.g., '/courses')
     * @param {object} options - Fetch options (method, body, headers)
     * @returns {Promise<object>} - Parsed JSON response
     */
    request: async (endpoint, options = {}) => {
        // Get JWT token from cookie
        const tokenMatch = document.cookie.match(/auth_token=([^;]+)/);
        const token = tokenMatch ? tokenMatch[1] : null;

        // Set default headers for JSON content
        const headers = { 'Content-Type': 'application/json' };

        // If user is logged in, add Authorization header with Bearer token
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            // Make the fetch request, merging default headers with any custom ones
            const response = await fetch(api.baseUrl + endpoint, {
                ...options,
                headers: { ...headers, ...options.headers }
            });

            // Parse and return JSON response
            return response.json();
        } catch (err) {
            // Log error and return failure object for network errors
            console.error('API Error:', err);
            return { success: false, message: 'Network error' };
        }
    },

    // =====================
    // AUTHENTICATION ROUTES
    // =====================

    /** Register a new user account */
    register: (data) => api.request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

    /** Login with email and password, returns JWT token */
    login: (data) => api.request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

    /** Get current logged-in user's profile */
    getMe: () => api.request('/auth/me'),

    // ==============
    // COURSE ROUTES
    // ==============

    /** Get all courses with optional filters (category, level, search) */
    getCourses: (params = {}) => api.request('/courses?' + new URLSearchParams(params)),

    /** Get a single course by its ID */
    getCourse: (id) => api.request(`/courses/${id}`),

    /** Create a new course (teacher/admin only) */
    createCourse: (data) => api.request('/courses', { method: 'POST', body: JSON.stringify(data) }),

    /** Update an existing course */
    updateCourse: (id, data) => api.request(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    /** Delete a course */
    deleteCourse: (id) => api.request(`/courses/${id}`, { method: 'DELETE' }),

    // ================
    // FAVORITES ROUTES
    // ================

    /** Add a course to user's favorites (wishlist) */
    addFavorite: (courseId) => api.request(`/favorites/${courseId}`, { method: 'POST' }),

    /** Remove a course from favorites */
    removeFavorite: (courseId) => api.request(`/favorites/${courseId}`, { method: 'DELETE' }),

    /** Get all favorited courses with full details */
    getMyFavorites: () => api.request('/favorites/my-favorites'),

    /** Get just the IDs of favorited courses (faster for checking status) */
    getMyFavoriteIds: () => api.request('/favorites/my-favorite-ids'),

    // =================
    // PURCHASES ROUTES
    // =================

    /** Purchase/enroll in a course */
    purchaseCourse: (courseId) => api.request(`/purchases/${courseId}`, { method: 'POST' }),

    /** Get all purchased courses with details */
    getMyPurchases: () => api.request('/purchases/my-purchases'),

    /** Get just the IDs of purchased courses */
    getMyPurchaseIds: () => api.request('/purchases/my-purchase-ids'),

    // =========================
    // USER MANAGEMENT (ADMIN)
    // =========================

    /** Get all users (admin only) */
    getAllUsers: () => api.request('/users'),

    /** Get current user's role */
    getMyRole: () => api.request('/users/my-role'),

    /** Update a user's role (admin only) */
    updateUserRole: (userId, role) => api.request(`/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),

    // ======================
    // WEB SCRAPING (n8n)
    // ======================

    /** Trigger web scraping via n8n webhook */
    triggerScraping: (url, category) => api.request('/scraping/trigger', { method: 'POST', body: JSON.stringify({ url, category }) }),

    /** Get scraped data with optional filters */
    getScrapedData: (params = {}) => api.request('/scraping?' + new URLSearchParams(params)),

    /** Get scraped data created by current user */
    getMyScrapedData: () => api.request('/scraping/my-data'),

    /** Delete scraped data entry */
    deleteScrapedData: (id) => api.request(`/scraping/${id}`, { method: 'DELETE' }),

    // ==============
    // IMAGE UPLOAD
    // ==============

    /**
     * Upload an image file
     * Uses FormData instead of JSON for file upload
     * @param {File} file - The image file to upload
     * @returns {Promise<object>} - Response with image URL
     */
    uploadImage: async (file) => {
        // Create FormData object for multipart upload
        const formData = new FormData();
        formData.append('image', file);

        // Make request without Content-Type (browser sets it automatically for FormData)
        const response = await fetch(api.baseUrl + '/upload/image', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
            body: formData
        });

        return response.json();
    },

    // ==============
    // LESSON ROUTES
    // ==============

    /** Get all lessons for a specific course */
    getLessons: (courseId) => api.request(`/lessons/course/${courseId}`),

    /** Get a single lesson by ID */
    getLesson: (id) => api.request(`/lessons/${id}`),

    /** Create a new lesson */
    createLesson: (data) => api.request('/lessons', { method: 'POST', body: JSON.stringify(data) }),

    /** Update an existing lesson */
    updateLesson: (id, data) => api.request(`/lessons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    /** Delete a lesson */
    deleteLesson: (id) => api.request(`/lessons/${id}`, { method: 'DELETE' }),

    // ================
    // PROGRESS ROUTES
    // ================

    /** Get user's progress for a specific course */
    getCourseProgress: (courseId) => api.request(`/progress/course/${courseId}`),

    /** Mark a lesson as completed */
    markLessonComplete: (lessonId) => api.request(`/progress/lesson/${lessonId}/complete`, { method: 'POST' }),

    /** Mark a lesson as incomplete (undo completion) */
    markLessonIncomplete: (lessonId) => api.request(`/progress/lesson/${lessonId}/complete`, { method: 'DELETE' }),

    // ==============
    // POINTS ROUTES
    // ==============

    /** Get user's current points balance */
    getPointsBalance: () => api.request('/points/balance'),

    /** Get points transaction history */
    getPointsHistory: () => api.request('/points/history'),

    /** Purchase a course using points */
    purchaseWithPoints: (courseId) => api.request(`/points/purchase/${courseId}`, { method: 'POST' }),

    /** Complete a course and earn points reward */
    completeCourse: (courseId) => api.request(`/points/complete/${courseId}`, { method: 'POST' }),

    // ============
    // QUIZ ROUTES
    // ============

    /** Get quiz for a specific course */
    getQuiz: (courseId) => api.request(`/quiz/course/${courseId}`),

    /** Submit quiz answers */
    submitQuiz: (quizId, answers) => api.request(`/quiz/${quizId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }),

    /** Get user's quiz attempts for a course */
    getQuizAttempts: (courseId) => api.request(`/quiz/attempts/${courseId}`),

    /** Save/update quiz questions (teacher only) */
    saveQuiz: (courseId, data) => api.request(`/quiz/course/${courseId}`, { method: 'POST', body: JSON.stringify(data) }),

    // ============
    // CHAT ROUTES
    // ============

    /** Get chat messages for a course (enrollment required) */
    getChatMessages: (courseId) => api.request(`/chat/${courseId}`),

    /** Send a chat message in a course discussion (enrollment required) */
    sendChatMessage: (courseId, message) => api.request(`/chat/${courseId}`, { method: 'POST', body: JSON.stringify({ message }) })
};
