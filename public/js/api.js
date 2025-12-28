/**
 * knowway API Client
 * Handles all API communication with the backend
 */
const api = {
    // Dynamic base URL: handles local dev (Live Server on 5500, Node on 3000) and production
    baseUrl: (() => {
        const { hostname, port, protocol } = window.location;
        // Live Server on port 5500 -> use localhost:3000
        if (port === '5500') return 'http://localhost:3000/api';
        // Local dev on port 3000 -> use same origin
        if (hostname === 'localhost' || hostname === '127.0.0.1') return '/api';
        // Production (Vercel) -> use same origin
        return '/api';
    })(),

    /**
     * Make an authenticated API request
     */
    request: async (endpoint, options = {}) => {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const response = await fetch(api.baseUrl + endpoint, { ...options, headers: { ...headers, ...options.headers } });
            return response.json();
        } catch (err) {
            console.error('API Error:', err);
            return { success: false, message: 'Network error' };
        }
    },

    // Auth
    register: (data) => api.request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => api.request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    getMe: () => api.request('/auth/me'),

    // Courses
    getCourses: (params = {}) => api.request('/courses?' + new URLSearchParams(params)),
    getCourse: (id) => api.request(`/courses/${id}`),
    createCourse: (data) => api.request('/courses', { method: 'POST', body: JSON.stringify(data) }),
    updateCourse: (id, data) => api.request(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCourse: (id) => api.request(`/courses/${id}`, { method: 'DELETE' }),

    // Favorites
    addFavorite: (courseId) => api.request(`/favorites/${courseId}`, { method: 'POST' }),
    removeFavorite: (courseId) => api.request(`/favorites/${courseId}`, { method: 'DELETE' }),
    getMyFavorites: () => api.request('/favorites/my-favorites'),
    getMyFavoriteIds: () => api.request('/favorites/my-favorite-ids'),

    // Purchases
    purchaseCourse: (courseId) => api.request(`/purchases/${courseId}`, { method: 'POST' }),
    getMyPurchases: () => api.request('/purchases/my-purchases'),
    getMyPurchaseIds: () => api.request('/purchases/my-purchase-ids'),

    // Users (Admin)
    getAllUsers: () => api.request('/users'),
    getMyRole: () => api.request('/users/my-role'),
    updateUserRole: (userId, role) => api.request(`/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),

    // Scraping (n8n)
    triggerScraping: (url, category) => api.request('/scraping/trigger', { method: 'POST', body: JSON.stringify({ url, category }) }),
    getScrapedData: (params = {}) => api.request('/scraping?' + new URLSearchParams(params)),
    getMyScrapedData: () => api.request('/scraping/my-data'),
    deleteScrapedData: (id) => api.request(`/scraping/${id}`, { method: 'DELETE' }),

    // Upload
    uploadImage: async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch(api.baseUrl + '/upload/image', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
            body: formData
        });
        return response.json();
    },

    // Lessons
    getLessons: (courseId) => api.request(`/lessons/course/${courseId}`),
    getLesson: (id) => api.request(`/lessons/${id}`),
    createLesson: (data) => api.request('/lessons', { method: 'POST', body: JSON.stringify(data) }),
    updateLesson: (id, data) => api.request(`/lessons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteLesson: (id) => api.request(`/lessons/${id}`, { method: 'DELETE' }),

    // Progress
    getCourseProgress: (courseId) => api.request(`/progress/course/${courseId}`),
    markLessonComplete: (lessonId) => api.request(`/progress/lesson/${lessonId}/complete`, { method: 'POST' }),
    markLessonIncomplete: (lessonId) => api.request(`/progress/lesson/${lessonId}/complete`, { method: 'DELETE' }),

    // Points
    getPointsBalance: () => api.request('/points/balance'),
    getPointsHistory: () => api.request('/points/history'),
    purchaseWithPoints: (courseId) => api.request(`/points/purchase/${courseId}`, { method: 'POST' }),
    completeCourse: (courseId) => api.request(`/points/complete/${courseId}`, { method: 'POST' }),

    // Quiz
    getQuiz: (courseId) => api.request(`/quiz/course/${courseId}`),
    submitQuiz: (quizId, answers) => api.request(`/quiz/${quizId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }),
    getQuizAttempts: (courseId) => api.request(`/quiz/attempts/${courseId}`),
    saveQuiz: (courseId, data) => api.request(`/quiz/course/${courseId}`, { method: 'POST', body: JSON.stringify(data) }),

    // Chat
    getChatMessages: (courseId) => api.request(`/chat/${courseId}`),
    sendChatMessage: (courseId, message) => api.request(`/chat/${courseId}`, { method: 'POST', body: JSON.stringify({ message }) })
};
