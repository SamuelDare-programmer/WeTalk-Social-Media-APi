import axios from 'axios';

const BASE_URL = 'intermediate-ottilie-wetalkreal-d24e5c5e.koyeb.app/';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 & Refresh Token
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 Unauthorized and we haven't retried yet
        // Skip for login endpoint to avoid loops on invalid credentials
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/login')) {
            originalRequest._retry = true;

            try {
                const storage = localStorage.getItem('refresh_token') ? localStorage : sessionStorage;
                const refreshToken = storage.getItem('refresh_token');
                if (!refreshToken) throw new Error('No refresh token available');

                // Call backend to refresh token
                const response = await axios.get(`${BASE_URL}/auth/users/refresh-token`, {
                    headers: { Authorization: `Bearer ${refreshToken}` }
                });

                const { access_token } = response.data;
                storage.setItem('access_token', access_token);

                // Update header and retry original request
                originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed - clear tokens and redirect to login
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                sessionStorage.removeItem('access_token');
                sessionStorage.removeItem('refresh_token');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
