async function loadDashboard() {
    const mainContent = document.getElementById('main-content');
    
    try {
        mainContent.innerHTML = `
            <div class="dashboard">
                <h1 class="page-title">Dashboard Overview</h1>
                
                <!-- Stats Cards Grid -->
                <div class="stats-grid">
                    <!-- Tenant Stats Card -->
                    <div class="stats-card">
                        <div class="stats-card-header">
                            <i class="fas fa-users"></i>
                            <h3>Tenant Statistics</h3>
                        </div>
                        <div class="stats-card-body">
                            <div class="stat-item">
                                <span class="stat-label">Total Tenants</span>
                                <span class="stat-value" id="totalTenants">...</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Active Leases</span>
                                <span class="stat-value" id="activeLeases">...</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Expiring Soon</span>
                                <span class="stat-value text-warning" id="expiringSoon">...</span>
                            </div>
                        </div>
                    </div>

                    <!-- Payment Stats Card -->
                    <div class="stats-card">
                        <div class="stats-card-header">
                            <i class="fas fa-money-bill-wave"></i>
                            <h3>Payment Overview</h3>
                        </div>
                        <div class="stats-card-body">
                            <div class="stat-item">
                                <span class="stat-label">Total Collections</span>
                                <span class="stat-value text-success" id="totalCollections">...</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Outstanding Payments</span>
                                <span class="stat-value text-danger" id="outstandingPayments">...</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Tenants with Outstanding</span>
                                <span class="stat-value" id="tenantsOutstanding">...</span>
                            </div>
                        </div>
                    </div>

                    <!-- Property Stats Card -->
                    <div class="stats-card">
                        <div class="stats-card-header">
                            <i class="fas fa-building"></i>
                            <h3>Property Overview</h3>
                        </div>
                        <div class="stats-card-body">
                            <div class="stat-item">
                                <span class="stat-label">Total Properties</span>
                                <span class="stat-value" id="totalProperties">...</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Occupied Units</span>
                                <span class="stat-value text-success" id="occupiedUnits">...</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Vacant Units</span>
                                <span class="stat-value text-warning" id="vacantUnits">...</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Activities Section -->
                <div class="card mt-4">
                    <div class="card-header">
                        <h3>Recent Activities</h3>
                    </div>
                    <div class="card-body">
                        <div id="recentActivities">Loading activities...</div>
                    </div>
                </div>
            </div>
        `;

        // Load dashboard data
        const [statsResponse, activitiesResponse] = await Promise.all([
            axios.get('/dashboard/stats'),
            axios.get('/activities/recent')
        ]);

        // Update stats
        const stats = statsResponse.data;
        document.getElementById('totalTenants').textContent = stats.tenant_stats.total_tenants;
        document.getElementById('activeLeases').textContent = stats.tenant_stats.active_leases;
        document.getElementById('expiringSoon').textContent = stats.tenant_stats.expiring_soon;
        
        document.getElementById('totalCollections').textContent = formatCurrency(stats.payment_stats.total_collected);
        document.getElementById('outstandingPayments').textContent = formatCurrency(stats.payment_stats.total_outstanding);
        document.getElementById('tenantsOutstanding').textContent = stats.payment_stats.tenants_outstanding;
        
        document.getElementById('totalProperties').textContent = stats.property_stats.total_properties;
        document.getElementById('occupiedUnits').textContent = stats.property_stats.occupied_units;
        document.getElementById('vacantUnits').textContent = stats.property_stats.vacant_units;

        // Update activities
        const activities = activitiesResponse.data;
        document.getElementById('recentActivities').innerHTML = activities.length ? `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Tenant</th>
                            <th>Activity</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activities.map(activity => `
                            <tr>
                                <td>${formatDate(activity.date)}</td>
                                <td>${activity.tenant_name}</td>
                                <td>${activity.description}</td>
                                <td>
                                    <span class="badge ${getStatusClass(activity.status)}">
                                        ${activity.status}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        ` : '<p>No recent activities</p>';

    } catch (error) {
        console.error('Dashboard loading error:', error);
        mainContent.innerHTML = `
            <div class="alert alert-danger">
                <h4>Error Loading Dashboard</h4>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'completed':
            return 'badge-success';
        case 'pending':
            return 'badge-warning';
        case 'failed':
            return 'badge-danger';
        default:
            return 'badge-secondary';
    }
} 