// Document management functionality
async function loadDocuments() {
    const mainContent = document.getElementById('main-content');
    
    mainContent.innerHTML = `
        <div class="documents-page">
            <div class="page-header">
                <h1>Document Management</h1>
            </div>

            <!-- Document Generation Section -->
            <div class="card mb-2">
                <div class="card-header">
                    <h3>Generate Documents</h3>
                </div>
                <div class="card-body">
                    <div class="document-types-grid">
                        <div class="document-type-card" onclick="generateDocument('tenancy_agreement')">
                            <i class="fas fa-file-contract"></i>
                            <h4>Tenancy Agreement</h4>
                            <p>Generate a new tenancy agreement for selected tenant</p>
                        </div>
                        <div class="document-type-card" onclick="generateDocument('payment_notice')">
                            <i class="fas fa-file-invoice-dollar"></i>
                            <h4>Payment Notice</h4>
                            <p>Generate rent payment notice letter</p>
                        </div>
                        <div class="document-type-card" onclick="generateDocument('payment_reminder')">
                            <i class="fas fa-bell"></i>
                            <h4>Payment Reminder</h4>
                            <p>Generate payment reminder letter</p>
                        </div>
                        <div class="document-type-card" onclick="generateDocument('quit_notice')">
                            <i class="fas fa-door-open"></i>
                            <h4>Quit Notice</h4>
                            <p>Generate quit notice letter</p>
                        </div>
                        <div class="document-type-card" onclick="generateDocument('possession_notice')">
                            <i class="fas fa-home"></i>
                            <h4>Possession Notice</h4>
                            <p>Generate notice of owner's intention to recover possession</p>
                        </div>
                        <div class="document-type-card" onclick="generateDocument('court_process')">
                            <i class="fas fa-gavel"></i>
                            <h4>Court Process</h4>
                            <p>Generate court process documentation</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Document History -->
            <div class="card">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <h3>Document History</h3>
                        <div class="search-box">
                            <input type="text" id="documentSearch" class="form-control" 
                                placeholder="Search documents..." onkeyup="searchDocuments()">
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Document Type</th>
                                    <th>Related To</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="documentsList">
                                <!-- Documents will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Document Generation Modal -->
        <div id="documentModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeDocumentModal()">&times;</span>
                <h2 id="documentModalTitle">Generate Document</h2>
                <form id="documentForm" onsubmit="handleDocumentSubmit(event)">
                    <div id="documentFormFields">
                        <!-- Form fields will be loaded dynamically based on document type -->
                    </div>
                    <button type="submit" class="btn btn-primary">Generate Document</button>
                </form>
            </div>
        </div>
    `;

    // Load initial data
    await loadDocumentsList();
}

// Load documents list
async function loadDocumentsList() {
    try {
        const response = await axios.get('/documents');
        const documents = response.data;
        
        const tbody = document.getElementById('documentsList');
        tbody.innerHTML = documents.map(doc => `
            <tr>
                <td>${formatDate(doc.created_at)}</td>
                <td>${formatDocumentType(doc.type)}</td>
                <td>${doc.related_to}</td>
                <td>
                    <span class="badge ${getDocumentStatusClass(doc.status)}">
                        ${doc.status}
                    </span>
                </td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-primary" 
                            onclick="viewDocument(${doc.id})"
                            aria-label="View document">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-success" 
                            onclick="downloadDocument(${doc.id})"
                            aria-label="Download document">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-sm btn-info" 
                            onclick="sendDocument(${doc.id})"
                            aria-label="Send document">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        showError('Error loading documents: ' + error.message);
    }
}

// Document generation handling
async function generateDocument(type) {
    const formFields = await getDocumentFormFields(type);
    document.getElementById('documentFormFields').innerHTML = formFields;
    document.getElementById('documentModalTitle').textContent = `Generate ${formatDocumentType(type)}`;
    document.getElementById('documentForm').dataset.documentType = type;
    document.getElementById('documentModal').style.display = 'block';
}

async function getDocumentFormFields(type) {
    try {
        const response = await axios.get(`/documents/form-fields/${type}`);
        const fields = response.data;
        
        return fields.map(field => `
            <div class="form-group">
                <label for="${field.id}">${field.label}</label>
                ${generateFormInput(field)}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading form fields:', error);
        return '<div class="alert alert-danger">Error loading form fields</div>';
    }
}

function generateFormInput(field) {
    switch (field.type) {
        case 'select':
            return `
                <select id="${field.id}" class="form-control" ${field.required ? 'required' : ''}>
                    ${field.options.map(opt => `
                        <option value="${opt.value}">${opt.label}</option>
                    `).join('')}
                </select>
            `;
        case 'textarea':
            return `
                <textarea id="${field.id}" class="form-control" 
                    rows="3" ${field.required ? 'required' : ''}></textarea>
            `;
        default:
            return `
                <input type="${field.type}" id="${field.id}" 
                    class="form-control" ${field.required ? 'required' : ''}>
            `;
    }
}

// Form handling
async function handleDocumentSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const type = form.dataset.documentType;
    const formData = new FormData(form);
    
    try {
        const response = await axios.post(`/documents/generate/${type}`, formData);
        const documentId = response.data.id;
        
        closeDocumentModal();
        await loadDocumentsList();
        
        // Show success message and offer to view/download the document
        if (confirm('Document generated successfully. Would you like to view it now?')) {
            viewDocument(documentId);
        }
    } catch (error) {
        showError('Error generating document: ' + error.message);
    }
}

// Document actions
async function viewDocument(documentId) {
    try {
        const response = await axios.get(`/documents/${documentId}/view`, {
            responseType: 'blob'
        });
        
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
    } catch (error) {
        showError('Error viewing document: ' + error.message);
    }
}

async function downloadDocument(documentId) {
    try {
        const response = await axios.get(`/documents/${documentId}/download`, {
            responseType: 'blob'
        });
        
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers['content-disposition'].split('filename=')[1];
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        showError('Error downloading document: ' + error.message);
    }
}

async function sendDocument(documentId) {
    try {
        await axios.post(`/documents/${documentId}/send`);
        showSuccess('Document sent successfully');
    } catch (error) {
        showError('Error sending document: ' + error.message);
    }
}

// Modal handling
function closeDocumentModal() {
    document.getElementById('documentModal').style.display = 'none';
}

// Utility functions
function formatDocumentType(type) {
    return type.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function getDocumentStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'generated':
            return 'badge-success';
        case 'pending':
            return 'badge-warning';
        case 'sent':
            return 'badge-info';
        case 'expired':
            return 'badge-danger';
        default:
            return 'badge-secondary';
    }
}

function searchDocuments() {
    const searchTerm = document.getElementById('documentSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#documentsList tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
} 