import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Response interceptor to handle token refresh (simplified)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            // TODO: Implement refresh token logic here if needed
            // For now, logout
            if (typeof window !== 'undefined') {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login'; // Redirect to login
            }
        }
        return Promise.reject(error);
    }
);

export const getSpaces = async (params?: { mine?: boolean }) => {
    const response = await api.get('/spaces/', { params });
    return response.data;
};

export const createReservation = async (data: any) => {
    const response = await api.post('/reservations/', data);
    return response.data;
};

export const cancelReservation = async (id: number) => {
    const response = await api.post(`/reservations/${id}/cancel/`);
    return response.data;
};

export const getMyReservations = async () => {
    const response = await api.get('/reservations/');
    return response.data;
};

export const getHostReservations = async () => {
    const response = await api.get('/reservations/', { params: { host: true } });
    return response.data;
};

export const confirmReservationAPI = async (id: number) => {
    const response = await api.post(`/reservations/${id}/confirm/`);
    return response.data;
};

export const rejectReservationAPI = async (id: number) => {
    const response = await api.post(`/reservations/${id}/reject/`);
    return response.data;
};

export const getMe = async () => {
    const response = await api.get('/auth/profile/');
    return response.data;
};

export const getVehicles = async () => {
    const response = await api.get('/me/vehicles/');
    return response.data;
};

export const addVehicle = async (data: any) => {
    const response = await api.post('/me/vehicles/', data);
    return response.data;
};

export const deleteVehicle = async (id: number) => {
    const response = await api.delete(`/me/vehicles/${id}/`);
    return response.data;
};

export const updateProfile = async (data: any) => {
    const response = await api.patch('/auth/profile/', data);
    return response.data;
};

export const registerSpace = async (data: any) => {
    const config = {
        headers: {
            'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json',
        }
    };
    const response = await api.post('/spaces/', data, config);
    return response.data;
};

export const updateSpace = async (id: number, data: any) => {
    const config = {
        headers: {
            'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json',
        }
    };
    const response = await api.patch(`/spaces/${id}/`, data, { ...config, params: { mine: true } });
    return response.data;
};

export const deleteSpace = async (id: number) => {
    const response = await api.delete(`/spaces/${id}/`, { params: { mine: true } });
    return response.data;
};

export const toggleSpaceStatus = async (id: number, isActive: boolean) => {
    const response = await api.patch(`/spaces/${id}/`, { is_active: isActive }, { params: { mine: true } });
    return response.data;
};

export const deleteSpaceImage = async (spaceId: number, imageId: number) => {
    const response = await api.delete(`/spaces/${spaceId}/images/${imageId}/`);
    return response.data;
};

export const register = async (data: any) => {
    const response = await api.post('/auth/register/', data);
    return response.data;
};

export const login = async (data: any) => {
    const response = await api.post('/auth/login/', data);
    if (response.data.access) {
        localStorage.setItem('accessToken', response.data.access);
        localStorage.setItem('refreshToken', response.data.refresh);
        localStorage.setItem('username', data.username);
    }
    return response.data;
};

export default api;
