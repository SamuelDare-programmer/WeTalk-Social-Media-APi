import axios from 'axios';

const api = axios.create({
    baseURL: 'https://considerable-cathrin-wetalk-0d4f7320.koyeb.app/',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
