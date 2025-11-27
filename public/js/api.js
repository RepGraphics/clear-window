// API Configuration
const API_URL = window.location.origin + '/api';

// API Client Class
class APIClient {
    constructor() {
        this.token = localStorage.getItem('auth_token');
    }

    // Set auth token
    setToken(token) {
        this.token = token;
        localStorage.setItem('auth_token', token);
    }

    // Clear auth token
    clearToken() {
        this.token = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
    }

    // Get current user from localStorage
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    // Save user to localStorage
    saveUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token && !options.skipAuth) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            ...options,
            headers,
        };

        // Handle FormData (for file uploads)
        if (options.body instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth endpoints
    async signup(username, email, password) {
        const data = await this.request('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ username, email, password }),
            skipAuth: true,
        });

        if (data.token) {
            this.setToken(data.token);
            this.saveUser(data.user);
        }

        return data;
    }

    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            skipAuth: true,
        });

        if (data.token) {
            this.setToken(data.token);
            this.saveUser(data.user);
        }

        return data;
    }

    async logout() {
        this.clearToken();
        window.location.href = '/';
    }

    async verifyEmail(token) {
        return await this.request(`/auth/verify-email/${token}`, {
            method: 'GET',
            skipAuth: true,
        });
    }

    async resendVerification() {
        return await this.request('/auth/resend-verification', {
            method: 'POST',
        });
    }

    async getCurrentUserInfo() {
        return await this.request('/auth/me', {
            method: 'GET',
        });
    }

    // Review endpoints
    async submitReview(formData) {
        return await this.request('/reviews', {
            method: 'POST',
            body: formData,
        });
    }

    async getMyReviews() {
        return await this.request('/reviews/my-reviews', {
            method: 'GET',
        });
    }

    async getPublishedReviews(page = 1, limit = 10) {
        return await this.request(`/reviews/published?page=${page}&limit=${limit}`, {
            method: 'GET',
            skipAuth: true,
        });
    }

    async getReview(id) {
        return await this.request(`/reviews/${id}`, {
            method: 'GET',
            skipAuth: true,
        });
    }

    async deleteReview(id) {
        return await this.request(`/reviews/${id}`, {
            method: 'DELETE',
        });
    }

    // Admin endpoints
    async getDashboard() {
        return await this.request('/admin/dashboard', {
            method: 'GET',
        });
    }

    async getAdminReviews(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        return await this.request(`/admin/reviews?${query}`, {
            method: 'GET',
        });
    }

    async getAdminReview(id) {
        return await this.request(`/admin/reviews/${id}`, {
            method: 'GET',
        });
    }

    async verifyReview(id, weightingScore, adminNotes) {
        return await this.request(`/admin/reviews/${id}/verify`, {
            method: 'PUT',
            body: JSON.stringify({ weightingScore, adminNotes }),
        });
    }

    async rejectReview(id, adminNotes) {
        return await this.request(`/admin/reviews/${id}/reject`, {
            method: 'PUT',
            body: JSON.stringify({ adminNotes }),
        });
    }

    async flagReview(id) {
        return await this.request(`/admin/reviews/${id}/flag`, {
            method: 'PUT',
        });
    }

    async deleteAdminReview(id) {
        return await this.request(`/admin/reviews/${id}`, {
            method: 'DELETE',
        });
    }

    async getUsers(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        return await this.request(`/admin/users?${query}`, {
            method: 'GET',
        });
    }

    async suspendUser(id, reason) {
        return await this.request(`/admin/users/${id}/suspend`, {
            method: 'PUT',
            body: JSON.stringify({ reason }),
        });
    }

    async activateUser(id) {
        return await this.request(`/admin/users/${id}/activate`, {
            method: 'PUT',
        });
    }

    async getAnalytics(startDate, endDate) {
        const query = new URLSearchParams({ startDate, endDate }).toString();
        return await this.request(`/admin/analytics?${query}`, {
            method: 'GET',
        });
    }

    // Account management
    async updateProfile(data) {
        return await this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async updatePassword(data) {
        return await this.request('/auth/password', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteAccount() {
        return await this.request('/auth/account', {
            method: 'DELETE',
        });
    }

    async getMyReviews() {
        return await this.request('/reviews/my-reviews', {
            method: 'GET',
        });
    }

    // Admin helpers
    async getAdminStats() {
        return await this.request('/admin/stats', {
            method: 'GET',
        });
    }

    async getPendingReviews() {
        return await this.getAllReviews({ status: 'pending_verification' });
    }

    async getAllUsers() {
        return await this.request('/admin/users', {
            method: 'GET',
        });
    }

    async getAllReviews(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        return await this.request(`/admin/reviews?${query}`, {
            method: 'GET',
        });
    }

    async getReviewById(id) {
        return await this.request(`/admin/reviews/${id}`, {
            method: 'GET',
        });
    }

    async getUserById(id) {
        return await this.request(`/admin/users/${id}`, {
            method: 'GET',
        });
    }

    async approveReview(id) {
        return await this.request(`/admin/reviews/${id}/verify`, {
            method: 'PUT',
            body: JSON.stringify({ weightingScore: 1.0 }),
        });
    }

    async deleteUserAsAdmin(id) {
        return await this.request(`/admin/users/${id}`, {
            method: 'DELETE',
        });
    }
}

// Export singleton instance
const api = new APIClient();
