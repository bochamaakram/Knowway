/**
 * knowway API Client
 * Handles all API communication with the backend
 */
const api = {
    baseUrl: '/api',

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
    deleteLesson: (id) => api.request(`/lessons/${id}`, { method: 'DELETE' })
};
