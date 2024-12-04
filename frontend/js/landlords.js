// Landlord management functionality
async function loadLandlords() {
    const mainContent = document.getElementById('main-content');
    
    mainContent.innerHTML = `
        <div class="landlords-page">
            <div class="page-header">
                <h1>Landlord Management</h1>
                <button class="btn btn-primary" onclick="showAddLandlordModal()">
                    <i class="fas fa-plus"></i> Add New Landlord
                </button>
            </div>

            <!-- Landlord List -->
            <div class="card">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <h3>Landlords List</h3>
                        <div class="search-box">
                            <input type="text" id="landlordSearch" class="form-control" 
                                placeholder="Search landlords..." onkeyup="searchLandlords()">
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Contact Information</th>
                                    <th>Properties</th>
                                    <th>Total Revenue</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="landlordsList">
                                <!-- Landlords will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add/Edit Landlord Modal -->
        <div id="landlordModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeLandlordModal()">&times;</span>
                <h2 id="modalTitle">Add New Landlord</h2>
                <form id="landlordForm" onsubmit="handleLandlordSubmit(event)">
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
                    <input type="hidden" id="landlordId">
                    <button type="submit" class="btn btn-primary">Save Landlord</button>
                </form>
            </div>
        </div>

        <!-- Landlord Details Modal -->
        <div id="landlordDetailsModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeLandlordDetailsModal()">&times;</span>
                <div id="landlordDetailsContent">
                    <!-- Landlord details will be loaded here -->
                </div>
            </div>
        </div>
    `;

    // Load initial data
    await loadLandlordsList();
}

// Load landlords list
async function loadLandlordsList() {
    try {
        const response = await axios.get('/landlords');
        const landlords = response.data;
        
        const tbody = document.getElementById('landlordsList');
        tbody.innerHTML = landlords.map(landlord => `
            <tr>
                <td>${landlord.first_name} ${landlord.last_name}</td>
                <td>
                    <div>${landlord.email}</div>
                    <div>${landlord.phone}</div>
                </td>
                <td>
                    <div>Total Properties: ${landlord.properties?.length || 0}</div>
                    <div>Occupied: ${landlord.occupied_properties || 0}</div>
                </td>
                <td>${formatCurrency(landlord.total_revenue || 0)}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-primary" 
                            onclick="editLandlord(${landlord.id})"
                            aria-label="Edit landlord">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-info" 
                            onclick="viewLandlordDetails(${landlord.id})"
                            aria-label="View landlord details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" 
                            onclick="deleteLandlord(${landlord.id})"
                            aria-label="Delete landlord">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        showError('Error loading landlords: ' + error.message);
    }
}

// Modal handling
function showAddLandlordModal() {
    document.getElementById('modalTitle').textContent = 'Add New Landlord';
    document.getElementById('landlordForm').reset();
    document.getElementById('landlordId').value = '';
    document.getElementById('landlordModal').style.display = 'block';
}

function closeLandlordModal() {
    document.getElementById('landlordModal').style.display = 'none';
}

function closeLandlordDetailsModal() {
    document.getElementById('landlordDetailsModal').style.display = 'none';
}

// Form handling
async function handleLandlordSubmit(event) {
    event.preventDefault();
    
    const landlordData = {
        first_name: document.getElementById('firstName').value,
        last_name: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value
    };

    const landlordId = document.getElementById('landlordId').value;
    
    try {
        if (landlordId) {
            await axios.put(`/landlords/${landlordId}`, landlordData);
        } else {
            await axios.post('/landlords', landlordData);
        }
        
        closeLandlordModal();
        await loadLandlordsList();
    } catch (error) {
        showError('Error saving landlord: ' + error.message);
    }
}

// Landlord actions
async function editLandlord(landlordId) {
    try {
        const response = await axios.get(`/landlords/${landlordId}`);
        const landlord = response.data;
        
        document.getElementById('modalTitle').textContent = 'Edit Landlord';
        document.getElementById('firstName').value = landlord.first_name;
        document.getElementById('lastName').value = landlord.last_name;
        document.getElementById('email').value = landlord.email;
        document.getElementById('phone').value = landlord.phone;
        document.getElementById('address').value = landlord.address;
        document.getElementById('landlordId').value = landlord.id;
        
        document.getElementById('landlordModal').style.display = 'block';
    } catch (error) {
        showError('Error loading landlord details: ' + error.message);
    }
}

async function deleteLandlord(landlordId) {
    if (confirm('Are you sure you want to delete this landlord?')) {
        try {
            await axios.delete(`/landlords/${landlordId}`);
            await loadLandlordsList();
        } catch (error) {
            showError('Error deleting landlord: ' + error.message);
        }
    }
}

async function viewLandlordDetails(landlordId) {
    try {
        const response = await axios.get(`/landlords/${landlordId}/details`);
        const landlord = response.data;
        
        const detailsHtml = `
            <div class="landlord-details">
                <h3>${landlord.first_name} ${landlord.last_name}</h3>
                <div class="details-grid">
                    <div class="detail-item">
                        <span class="label">Email:</span>
                        <span class="value">${landlord.email}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Phone:</span>
                        <span class="value">${landlord.phone}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Address:</span>
                        <span class="value">${landlord.address}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Total Properties:</span>
                        <span class="value">${landlord.properties?.length || 0}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Total Revenue:</span>
                        <span class="value">${formatCurrency(landlord.total_revenue || 0)}</span>
                    </div>
                </div>

                <div class="properties-list mt-2">
                    <h4>Properties</h4>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Property Name</th>
                                <th>Address</th>
                                <th>Status</th>
                                <th>Current Tenant</th>
                                <th>Monthly Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${landlord.properties?.map(property => `
                                <tr>
                                    <td>${property.name}</td>
                                    <td>${property.address}</td>
                                    <td>
                                        <span class="badge ${getOccupancyStatusClass(property.status)}">
                                            ${property.status}
                                        </span>
                                    </td>
                                    <td>${property.current_tenant || 'Vacant'}</td>
                                    <td>${formatCurrency(property.monthly_revenue || 0)}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="5">No properties found</td></tr>'}
                        </tbody>
                    </table>
                </div>

                <div class="revenue-history mt-2">
                    <h4>Revenue History</h4>
                    <div class="chart-container">
                        <!-- Add chart visualization here if needed -->
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('landlordDetailsContent').innerHTML = detailsHtml;
        document.getElementById('landlordDetailsModal').style.display = 'block';
    } catch (error) {
        showError('Error loading landlord details: ' + error.message);
    }
}

// Utility functions
function searchLandlords() {
    const searchTerm = document.getElementById('landlordSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#landlordsList tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
} 