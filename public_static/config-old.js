// DachaGo Shared Configuration and Utilities
const API_BASE_URL = 'http://127.0.0.1:5000/api';

/**
 * Formats a number with spaces as thousands separators and adds "сум".
 * Example: 1500000 -> "1 500 000 сум"
 */
function formatPrice(price) {
    if (!price && price !== 0) return "";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " сум";
}

/**
 * Validates if a user is logged in. Redirects to auth.html if not.
 * @param {boolean} shouldRedirect - Whether to redirect to login if not authenticated.
 */
function getAuthenticatedUser(shouldRedirect = false) {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        if (shouldRedirect) {
            window.location.href = `auth.html?redirect=${window.location.pathname.split('/').pop()}`;
        }
        return null;
    }
    try {
        return JSON.parse(userStr);
    } catch (e) {
        console.error("Error parsing user data", e);
        return null;
    }
}

/**
 * Standardizes API fetch calls with error handling.
 */
async function apiFetch(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultHeaders = { 'Content-Type': 'application/json' };
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: { ...defaultHeaders, ...options.headers }
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'API Error');
        return data;
    } catch (error) {
        console.error(`Fetch Error [${endpoint}]:`, error);
        throw error;
    }
}

// Export for use in other scripts
window.DachaGo = {
    API_BASE_URL,
    formatPrice,
    getAuthenticatedUser,
    apiFetch
};
