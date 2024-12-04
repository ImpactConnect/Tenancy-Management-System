const API_URL = 'http://localhost:5000';

// Global variables
const token = localStorage.getItem('token');

// Axios default configuration
axios.defaults.baseURL = API_URL;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['Content-Type'] = 'application/json';

if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Add request interceptor for debugging
axios.interceptors.request.use(request => {
    // Add /api prefix to all requests except those that already have it
    // and those that are full URLs (starting with http)
    if (!request.url.startsWith('/api') && !request.url.startsWith('http')) {
        request.url = `/api${request.url}`;
    }
    console.log('Starting Request:', request.method, request.url);
    return request;
});

// Add response interceptor for debugging
axios.interceptors.response.use(
    response => {
        console.log('Response:', response.status, response.data);
        return response;
    },
    error => {
        console.error('Response Error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
    }
);

// Sidebar toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const sidebar = document.getElementById('sidebar');
    const navLinks = document.querySelectorAll('#sidebar a[data-page]');
    
    // Sidebar toggle
    sidebarCollapse.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Navigation handling
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.closest('a').dataset.page;
            loadPage(page);
            
            // Update active state
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            e.target.closest('li').classList.add('active');
        });
    });

    // Notification handling
    const notificationBell = document.querySelector('.notifications');
    const notificationModal = document.getElementById('notificationModal');
    const closeModal = document.querySelector('.close');

    notificationBell.addEventListener('click', () => {
        loadNotifications();
        notificationModal.style.display = 'block';
    });

    closeModal.addEventListener('click', () => {
        notificationModal.style.display = 'none';
    });

    // Load dashboard by default
    loadPage('dashboard');

    // Verify all page load functions are available
    const requiredFunctions = {
        loadDashboard: typeof loadDashboard === 'function',
        loadTenants: typeof loadTenants === 'function',
        loadProperties: typeof loadProperties === 'function',
        loadLandlords: typeof loadLandlords === 'function',
        loadPayments: typeof loadPayments === 'function',
        loadDocuments: typeof loadDocuments === 'function'
    };

    // Log any missing functions
    Object.entries(requiredFunctions).forEach(([name, exists]) => {
        if (!exists) {
            console.error(`Required function ${name} is not defined`);
        }
    });
});

// Page loading function
async function loadPage(page) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '<div class="loading">Loading...</div>';

    try {
        console.log(`Loading page: ${page}`);
        switch (page) {
            case 'dashboard':
                await loadDashboard();
                break;
            case 'tenants':
                await loadTenants();
                break;
            case 'properties':
                await loadProperties();
                break;
            case 'landlords':
                await loadLandlords();
                break;
            case 'payments':
                await loadPayments();
                break;
            case 'documents':
                await loadDocuments();
                break;
        }
    } catch (error) {
        console.error('Error loading page:', error);
        showError(`Error loading page: ${error.message}`);
    }
}

// Utility functions
function showError(message) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="alert alert-danger">
            ${message}
        </div>
    `;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN'
    }).format(amount);
}

async function loadNotifications() {
    try {
        const response = await axios.get('/notifications');
        const notifications = response.data;
        
        const notificationList = document.getElementById('notificationList');
        notificationList.innerHTML = notifications.map(notification => `
            <div class="notification-item ${notification.is_read ? 'read' : 'unread'}">
                <div class="notification-content">
                    <p>${notification.message}</p>
                    <small>${formatDate(notification.sent_date)}</small>
                </div>
            </div>
        `).join('');
        
        // Update notification badge
        const unreadCount = notifications.filter(n => !n.is_read).length;
        document.querySelector('.badge').textContent = unreadCount;
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
} 