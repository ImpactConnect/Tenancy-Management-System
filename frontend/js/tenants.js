async function loadTenants() {
    const mainContent = document.getElementById('main-content');
    
    try {
        mainContent.innerHTML = `
            <div class="tenants-page">
                <div class="page-header">
                    <h1>Tenant Management</h1>
                    <button class="btn btn-primary" onclick="showAddTenantModal()">
                        <i class="fas fa-plus"></i> Add New Tenant
                    </button>
                </div>

                <!-- Tenant List -->
                <div class="card">
                    <div class="card-header">
                        <div class="d-flex justify-content-between align-items-center">
                            <h3>Tenants List</h3>
                            <div class="search-box">
                                <input type="text" id="tenantSearch" class="form-control" 
                                    placeholder="Search tenants..." onkeyup="searchTenants()">
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Property</th>
                                        <th>Lease Status</th>
                                        <th>Monthly Rent</th>
                                        <th>Contact</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="tenantsList">
                                    <!-- Tenants will be loaded here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Load initial data
        await loadTenantsList();
    } catch (error) {
        showError('Error loading tenants page: ' + error.message);
    }
}

function searchTenants() {
    const searchTerm = document.getElementById('tenantSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#tenantsList tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

async function loadTenantsList() {
    try {
        const response = await axios.get('/api/tenants');
        const tenants = response.data;
        
        const tbody = document.getElementById('tenantsList');
        tbody.innerHTML = tenants.map(tenant => `
            <tr>
                <td>${tenant.first_name} ${tenant.last_name}</td>
                <td>${tenant.property ? tenant.property.name : 'Not Assigned'}</td>
                <td>
                    <span class="badge ${getLeaseStatusClass(tenant.lease_status)}">
                        ${tenant.lease_status}
                    </span>
                </td>
                <td>${formatCurrency(tenant.monthly_rent || 0)}/month</td>
                <td>
                    <div>${tenant.email}</div>
                    <div>${tenant.phone}</div>
                </td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-primary" onclick="editTenant(${tenant.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${tenant.lease_status === 'No Lease' ? `
                            <button class="btn btn-sm btn-success" onclick="showLeaseModal(${tenant.id})">
                                <i class="fas fa-file-contract"></i> Create Lease
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-info" onclick="viewLeaseDetails(${tenant.id})">
                                <i class="fas fa-eye"></i> View Lease
                            </button>
                        `}
                        <button class="btn btn-sm btn-danger" onclick="deleteTenant(${tenant.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        showError('Error loading tenants: ' + error.message);
    }
}

// Add this utility function for lease status badge
function getLeaseStatusClass(status) {
    switch (status?.toLowerCase()) {
        case 'active':
            return 'badge-success';
        case 'expired':
            return 'badge-danger';
        case 'pending':
            return 'badge-warning';
        case 'no lease':
            return 'badge-secondary';
        default:
            return 'badge-secondary';
    }
}

// Add this utility function for currency formatting
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN'
    }).format(amount);
}

// Placeholder functions
function editTenant(tenantId) {
    console.log('Edit tenant:', tenantId);
    // Implement edit tenant functionality
}

function showLeaseModal(tenantId) {
    console.log('Show lease modal for tenant:', tenantId);
    // Implement lease modal functionality
}

function viewLeaseDetails(tenantId) {
    console.log('View lease details for tenant:', tenantId);
    // Implement view lease details functionality
}

function deleteTenant(tenantId) {
    console.log('Delete tenant:', tenantId);
    // Implement delete tenant functionality
}

// Add this function for showing the add tenant modal
function showAddTenantModal() {
    // Create modal if it doesn't exist
    if (!document.getElementById('tenantModal')) {
        const modalHtml = `
            <div id="tenantModal" class="modal">
                <div class="modal-content">
                    <span class="close" onclick="closeTenantModal()">&times;</span>
                    <h2 id="modalTitle">Add New Tenant</h2>
                    <form id="tenantForm" onsubmit="handleTenantSubmit(event)">
                        <div class="form-group">
                            <label for="firstName">First Name</label>
                            <input type="text" id="firstName" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="lastName">Last Name</label>
                            <input type="text" id="lastName" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="phone">Phone</label>
                            <input type="tel" id="phone" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="address">Address</label>
                            <input type="text" id="address" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="workPlace">Work Place</label>
                            <input type="text" id="workPlace" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="workAddress">Work Address</label>
                            <input type="text" id="workAddress" class="form-control">
                        </div>
                        <div class="form-group">
                            <label for="nextOfKinName">Next of Kin Name</label>
                            <input type="text" id="nextOfKinName" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="nextOfKinPhone">Next of Kin Phone</label>
                            <input type="tel" id="nextOfKinPhone" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="propertyId">Assign Property</label>
                            <select id="propertyId" class="form-control" required>
                                <!-- Properties will be loaded here -->
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="monthlyRent">Monthly Rent Amount (₦)</label>
                            <input type="number" id="monthlyRent" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="startDate">Start Date</label>
                            <input type="date" id="startDate" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="durationMonths">Duration (Months)</label>
                            <input type="number" id="durationMonths" class="form-control" required min="1">
                        </div>
                        <div class="form-group">
                            <label for="idDocument">ID Document</label>
                            <input type="file" id="idDocument" class="form-control" accept="image/*,.pdf">
                        </div>
                        <button type="submit" class="btn btn-primary">Save Tenant</button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Reset form
    document.getElementById('tenantForm').reset();
    
    // Load properties for selection
    loadPropertiesForSelect();
    
    // Show modal
    document.getElementById('tenantModal').style.display = 'block';
}

// Function to close the tenant modal
function closeTenantModal() {
    const modal = document.getElementById('tenantModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Function to load properties for the select dropdown
async function loadPropertiesForSelect() {
    try {
        const response = await axios.get('/api/properties');
        const properties = response.data;
        
        const select = document.getElementById('propertyId');
        select.innerHTML = `
            <option value="">Select Property</option>
            ${properties.map(property => `
                <option value="${property.id}">
                    ${property.name} - ${property.address}
                    ${property.landlord ? ` (Owner: ${property.landlord.first_name} ${property.landlord.last_name})` : ''}
                </option>
            `).join('')}
        `;
    } catch (error) {
        console.error('Error loading properties:', error);
        showError('Error loading properties: ' + error.message);
    }
}

// Update the handleTenantSubmit function
async function handleTenantSubmit(event) {
    event.preventDefault();
    
    try {
        // Create FormData object
        const formData = new FormData();
        
        // Add all form fields
        formData.append('first_name', document.getElementById('firstName').value);
        formData.append('last_name', document.getElementById('lastName').value);
        formData.append('email', document.getElementById('email').value);
        formData.append('phone', document.getElementById('phone').value);
        formData.append('address', document.getElementById('address').value);
        formData.append('work_place', document.getElementById('workPlace').value);
        formData.append('work_address', document.getElementById('workAddress').value);
        formData.append('next_of_kin_name', document.getElementById('nextOfKinName').value);
        formData.append('next_of_kin_phone', document.getElementById('nextOfKinPhone').value);
        formData.append('property_id', document.getElementById('propertyId').value);
        formData.append('monthly_rent', document.getElementById('monthlyRent').value);
        formData.append('start_date', document.getElementById('startDate').value);
        formData.append('duration_months', document.getElementById('durationMonths').value);

        // Handle file upload
        const idDocument = document.getElementById('idDocument').files[0];
        if (idDocument) {
            formData.append('id_document', idDocument);
        }

        // Make API call
        const response = await axios.post('/api/tenants', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        if (response.data.message) {
            showSuccess('Tenant created successfully');
            closeTenantModal();
            await loadTenantsList(); // Refresh the tenants list
        }
    } catch (error) {
        console.error('Error saving tenant:', error);
        const errorMessage = error.response?.data?.error || error.message;
        showError('Error saving tenant: ' + errorMessage);
        
        // Handle duplicate email error
        if (error.response?.status === 409 || errorMessage.includes('email already exists')) {
            const emailInput = document.getElementById('email');
            emailInput.classList.add('is-invalid');
            emailInput.focus();
        }
    }
}

// Add this function to clear validation styling when email is changed
document.getElementById('email')?.addEventListener('input', function() {
    this.classList.remove('is-invalid');
});