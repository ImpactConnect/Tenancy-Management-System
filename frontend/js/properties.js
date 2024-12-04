// Property management functionality
async function loadProperties() {
    const mainContent = document.getElementById('main-content');
    
    mainContent.innerHTML = `
        <div class="properties-page">
            <div class="page-header">
                <h1>Property Management</h1>
                <button class="btn btn-primary" onclick="showAddPropertyModal()">
                    <i class="fas fa-plus"></i> Add New Property
                </button>
            </div>

            <!-- Property List -->
            <div class="card">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <h3>Properties List</h3>
                        <div class="search-box">
                            <input type="text" id="propertySearch" class="form-control" 
                                placeholder="Search properties..." onkeyup="searchProperties()">
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Address</th>
                                    <th>Type</th>
                                    <th>Landlord</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="propertiesList">
                                <!-- Properties will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add/Edit Property Modal -->
        <div id="propertyModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closePropertyModal()">&times;</span>
                <h2 id="modalTitle">Add New Property</h2>
                <form id="propertyForm" onsubmit="handlePropertySubmit(event)">
                    <div class="form-group">
                        <label for="propertyName">Property Name</label>
                        <input type="text" id="propertyName" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="propertyAddress">Address</label>
                        <input type="text" id="propertyAddress" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="propertyType">Property Type</label>
                        <select id="propertyType" class="form-control" required>
                            <option value="apartment">Apartment</option>
                            <option value="house">House</option>
                            <option value="commercial">Commercial Space</option>
                            <option value="land">Land</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="landlordId">Landlord</label>
                        <select id="landlordId" class="form-control" required>
                            <!-- Landlords will be loaded here -->
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="propertyDescription">Description</label>
                        <textarea id="propertyDescription" class="form-control" rows="3"></textarea>
                    </div>
                    <input type="hidden" id="propertyId">
                    <button type="submit" class="btn btn-primary">Save Property</button>
                </form>
            </div>
        </div>
    `;

    // Load initial data
    await loadPropertiesList();
    await loadLandlordsForSelect();
}

// Load properties list
async function loadPropertiesList() {
    try {
        const response = await axios.get('/properties');
        const properties = response.data;
        
        const tbody = document.getElementById('propertiesList');
        tbody.innerHTML = properties.map(property => `
            <tr>
                <td>${property.name}</td>
                <td>${property.address}</td>
                <td>${capitalizeFirst(property.type)}</td>
                <td>${property.landlord ? `${property.landlord.first_name} ${property.landlord.last_name}` : 'Not Assigned'}</td>
                <td>
                    <span class="badge ${getOccupancyStatusClass(property.status)}">
                        ${property.status}
                    </span>
                </td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-primary" 
                            onclick="editProperty(${property.id})" 
                            aria-label="Edit property">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-info" 
                            onclick="viewPropertyDetails(${property.id})"
                            aria-label="View property details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" 
                            onclick="deleteProperty(${property.id})"
                            aria-label="Delete property">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        showError('Error loading properties: ' + error.message);
    }
}

// Load landlords for select dropdown
async function loadLandlordsForSelect() {
    try {
        const response = await axios.get('/landlords');
        const landlords = response.data;
        
        const select = document.getElementById('landlordId');
        select.innerHTML = `
            <option value="">Select Landlord</option>
            ${landlords.map(landlord => `
                <option value="${landlord.id}">
                    ${landlord.first_name} ${landlord.last_name}
                </option>
            `).join('')}
        `;
    } catch (error) {
        console.error('Error loading landlords:', error);
    }
}

// Modal handling
function showAddPropertyModal() {
    document.getElementById('modalTitle').textContent = 'Add New Property';
    document.getElementById('propertyForm').reset();
    document.getElementById('propertyId').value = '';
    document.getElementById('propertyModal').style.display = 'block';
}

function closePropertyModal() {
    document.getElementById('propertyModal').style.display = 'none';
}

// Form handling
async function handlePropertySubmit(event) {
    event.preventDefault();
    
    const propertyData = {
        name: document.getElementById('propertyName').value,
        address: document.getElementById('propertyAddress').value,
        type: document.getElementById('propertyType').value,
        landlord_id: document.getElementById('landlordId').value,
        description: document.getElementById('propertyDescription').value
    };

    const propertyId = document.getElementById('propertyId').value;
    
    try {
        if (propertyId) {
            await axios.put(`/properties/${propertyId}`, propertyData);
        } else {
            await axios.post('/properties', propertyData);
        }
        
        closePropertyModal();
        await loadPropertiesList();
    } catch (error) {
        showError('Error saving property: ' + error.message);
    }
}

// Property actions
async function editProperty(propertyId) {
    try {
        const response = await axios.get(`/properties/${propertyId}`);
        const property = response.data;
        
        document.getElementById('modalTitle').textContent = 'Edit Property';
        document.getElementById('propertyName').value = property.name;
        document.getElementById('propertyAddress').value = property.address;
        document.getElementById('propertyType').value = property.type;
        document.getElementById('landlordId').value = property.landlord_id || '';
        document.getElementById('propertyDescription').value = property.description;
        document.getElementById('propertyId').value = property.id;
        
        document.getElementById('propertyModal').style.display = 'block';
    } catch (error) {
        showError('Error loading property details: ' + error.message);
    }
}

async function deleteProperty(propertyId) {
    if (confirm('Are you sure you want to delete this property?')) {
        try {
            await axios.delete(`/properties/${propertyId}`);
            await loadPropertiesList();
        } catch (error) {
            showError('Error deleting property: ' + error.message);
        }
    }
}

async function viewPropertyDetails(propertyId) {
    try {
        const response = await axios.get(`/properties/${propertyId}/details`);
        const property = response.data;
        
        // Create and show a modal with detailed property information
        const detailsHtml = `
            <div class="property-details">
                <h3>${property.name}</h3>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="label">Address:</span>
                        <span class="value">${property.address}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Type:</span>
                        <span class="value">${capitalizeFirst(property.type)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Current Tenants:</span>
                        <span class="value">${property.tenant_count || 0}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Total Revenue:</span>
                        <span class="value">${formatCurrency(property.total_revenue || 0)}</span>
                    </div>
                </div>
                <div class="tenant-history">
                    <h4>Tenant History</h4>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Tenant Name</th>
                                <th>Period</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${property.tenant_history.map(history => `
                                <tr>
                                    <td>${history.tenant_name}</td>
                                    <td>${formatDate(history.start_date)} - ${formatDate(history.end_date)}</td>
                                    <td>${history.status}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        // Show the details in a modal or dedicated section
        showDetailsModal(detailsHtml);
    } catch (error) {
        showError('Error loading property details: ' + error.message);
    }
}

// Utility functions
function getOccupancyStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'occupied':
            return 'badge-success';
        case 'vacant':
            return 'badge-warning';
        case 'maintenance':
            return 'badge-danger';
        default:
            return 'badge-secondary';
    }
}

function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function searchProperties() {
    const searchTerm = document.getElementById('propertySearch').value.toLowerCase();
    const rows = document.querySelectorAll('#propertiesList tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function showDetailsModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            ${content}
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
} 