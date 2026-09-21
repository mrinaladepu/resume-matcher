document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/check-session');
        const data = await res.json();

        if (!data.user || data.user.username !== "admin") {
            alert("Unauthorized access! Admin only.");
            window.location.href = "index.html";
            return;
        }

        // Show stats & job applications
        loadDashboard();

        // Export button
        document.getElementById("exportBtn").addEventListener("click", exportShortlisted);

        // Logout
        document.getElementById("logoutBtn").addEventListener("click", async () => {
            await fetch("/api/logout", { method: "POST" });
            window.location.href = "index.html";
        });

    } catch (err) {
        console.error("Error loading admin", err);
        window.location.href = "index.html";
    }
});

// Global variables to store all matches and filtered matches
let allMatches = [];
let currentFilter = 'all';

async function loadDashboard() {
    try {
        const [statsRes, matchesRes] = await Promise.all([
            fetch("/api/admin/stats"),
            fetch("/api/admin/matches")
        ]);

        const stats = await statsRes.json();
        allMatches = await matchesRes.json();

        // Update stats
        const totalApplications = stats.shortlistedCount + stats.underReviewCount + stats.rejectedCount;
        document.getElementById("totalApplications").textContent = totalApplications;
        document.getElementById("shortlistedResumes").textContent = stats.shortlistedCount;
        document.getElementById("underReviewResumes").textContent = stats.underReviewCount;
        document.getElementById("rejectedResumes").textContent = stats.rejectedCount;

        setupCardFilters();
        applyFilter(currentFilter);
        
    } catch (err) {
        console.error('Error loading dashboard:', err);
        alert('Error loading dashboard data');
    }
}

function setupCardFilters() {
    // Stat card filters
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove active class from all cards
            statCards.forEach(c => {
                c.classList.remove('active');
                // Remove active indicator
                const indicator = c.querySelector('.active-filter-indicator');
                if (indicator) {
                    indicator.remove();
                }
            });
            
            // Add active class to clicked card
            card.classList.add('active');
            
            // Add active indicator
            const positionRelativeDiv = card.querySelector('.position-relative') || card;
            if (!positionRelativeDiv.querySelector('.active-filter-indicator')) {
                const indicator = document.createElement('div');
                indicator.className = 'active-filter-indicator';
                indicator.innerHTML = '<i class="fas fa-filter"></i>';
                positionRelativeDiv.appendChild(indicator);
            }
            
            const filter = card.getAttribute('data-filter');
            currentFilter = filter;
            applyFilter(filter);
        });
    });
}

function applyFilter(filter) {
    let filteredMatches = [...allMatches];
    let filterText = 'Showing all applications';

    // Apply status filter
    if (filter !== 'all') {
        filteredMatches = filteredMatches.filter(match => 
            match.status.toLowerCase() === filter.toLowerCase()
        );
        
        // Update filter status text
        switch(filter) {
            case 'shortlisted':
                filterText = `Showing ${filteredMatches.length} shortlisted applications`;
                break;
            case 'under review':
                filterText = `Showing ${filteredMatches.length} applications under review`;
                break;
            case 'rejected':
                filterText = `Showing ${filteredMatches.length} rejected applications`;
                break;
        }
    }

    // Update the filter status text
    document.getElementById('filterStatusText').textContent = filterText;
    populateJobApplicationsTable(filteredMatches);
}

function populateJobApplicationsTable(matches) {
    const table = document.getElementById("jobApplicationsBody");
    if (!table) return;
    
    table.innerHTML = "";
    
    if (matches.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <i class="fas fa-search fa-2x text-muted mb-2"></i>
                    <p class="text-muted">No applications found matching your criteria.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    matches.forEach(match => {
        const statusBadge = getStatusBadge(match.status);
        const candidate = match.candidateDetails || {};
        const scoreBadgeClass = getScoreBadgeClass(match.similarityScore);
        
        table.innerHTML += `
            <tr>
                <td>
                    <div class="candidate-info">
                        <strong class="d-block">${candidate.name || 'Name not provided'}</strong>
                        <small class="text-muted">Applied by: ${match.user?.username || 'Unknown'}</small>
                    </div>
                </td>
                <td>
                    <div class="contact-info">
                        <div class="d-flex align-items-center mb-1">
                            <i class="fas fa-envelope me-2 text-primary"></i>
                            <span class="small">${candidate.email || 'Email not found'}</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <i class="fas fa-phone me-2 text-success"></i>
                            <span class="small">${candidate.phone || 'Phone not found'}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <strong>${match.jobRole || 'Not specified'}</strong>
                </td>
                <td>
                    <span class="badge ${scoreBadgeClass} fs-6">
                        ${match.similarityScore}%
                    </span>
                </td>
                <td>${statusBadge}</td>
                <td>
                    <div class="small">
                        ${new Date(match.createdAt).toLocaleDateString()}<br>
                        <small class="text-muted">${new Date(match.createdAt).toLocaleTimeString()}</small>
                    </div>
                </td>
                <td>
                    <div class="small">
                        ${(candidate.skills && candidate.skills.length > 0) ? 
                            candidate.skills.slice(0, 3).map(skill => 
                                `<span class="badge bg-info me-1 mb-1">${skill}</span>`
                            ).join('') : 
                            'No skills extracted'
                        }
                        ${candidate.skills && candidate.skills.length > 3 ? 
                            `<span class="badge bg-secondary">+${candidate.skills.length - 3} more</span>` : 
                            ''
                        }
                    </div>
                </td>
                <td>
                    <button class="btn btn-info btn-sm mb-1" onclick="viewCandidateDetails('${match._id}')" title="View Full Details">
                        <i class="fas fa-eye me-1"></i>Details
                    </button>
                </td>
            </tr>
        `;
    });
}

function getStatusBadge(status) {
    switch(status) {
        case 'shortlisted':
            return '<span class="badge bg-success status-badge">🎉 Shortlisted</span>';
        case 'under review':
            return '<span class="badge bg-warning status-badge">⏳ Under Review</span>';
        case 'rejected':
            return '<span class="badge bg-danger status-badge">❌ Rejected</span>';
        default:
            return '<span class="badge bg-secondary status-badge">Unknown</span>';
    }
}

function getScoreBadgeClass(score) {
    if (score >= 75) return 'bg-success';
    if (score >= 40) return 'bg-warning';
    return 'bg-danger';
}

async function viewCandidateDetails(matchId) {
    try {
        const match = allMatches.find(m => m._id === matchId);
        
        if (!match) {
            alert('Candidate details not found.');
            return;
        }

        const candidate = match.candidateDetails || {};
        const modalBody = document.getElementById('candidateModalBody');
        const modalTitle = document.getElementById('candidateModalTitle');
        
        modalTitle.textContent = `Candidate: ${candidate.name || 'Unknown'}`;
        
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Personal Information</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Name:</strong></td><td>${candidate.name || 'Not specified'}</td></tr>
                        <tr><td><strong>Email:</strong></td><td>${candidate.email || 'Not specified'}</td></tr>
                        <tr><td><strong>Phone:</strong></td><td>${candidate.phone || 'Not specified'}</td></tr>
                        <tr><td><strong>Applied By:</strong></td><td>${match.user?.username || 'Unknown'} (${match.user?.email || 'No email'})</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>Application Details</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Job Role:</strong></td><td>${match.jobRole || 'Not specified'}</td></tr>
                        <tr><td><strong>Match Score:</strong></td><td><span class="badge ${getScoreBadgeClass(match.similarityScore)}">${match.similarityScore}%</span></td></tr>
                        <tr><td><strong>Status:</strong></td><td>${getStatusBadge(match.status)}</td></tr>
                        <tr><td><strong>Applied Date:</strong></td><td>${new Date(match.createdAt).toLocaleString()}</td></tr>
                    </table>
                </div>
            </div>
            
            <div class="row mt-3">
                <div class="col-md-6">
                    <h6>Skills & Qualifications</h6>
                    <div class="mb-2">
                        <strong>Extracted Skills:</strong>
                        <div class="mt-1">
                            ${candidate.skills && candidate.skills.length > 0 ? 
                                candidate.skills.map(skill => `<span class="badge bg-info me-1 mb-1">${skill}</span>`).join('') : 
                                'No skills extracted'
                            }
                        </div>
                    </div>
                    <div class="mb-2">
                        <strong>Matched Skills:</strong>
                        <div class="mt-1">
                            ${match.matchedSkills && match.matchedSkills.length > 0 ? 
                                match.matchedSkills.map(skill => `<span class="badge bg-success me-1 mb-1">${skill}</span>`).join('') : 
                                'None'
                            }
                        </div>
                    </div>
                    <div>
                        <strong>Missing Skills:</strong>
                        <div class="mt-1">
                            ${match.missingSkills && match.missingSkills.length > 0 ? 
                                match.missingSkills.map(skill => `<span class="badge bg-warning me-1 mb-1">${skill}</span>`).join('') : 
                                'None'
                            }
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <h6>AI Analysis</h6>
                    <div class="mb-2">
                        <strong>Strengths:</strong>
                        <ul class="small">
                            ${match.strengths && match.strengths.length > 0 ? match.strengths.map(strength => `<li>${strength}</li>`).join('') : '<li>None identified</li>'}
                        </ul>
                    </div>
                    <div class="mb-2">
                        <strong>Weaknesses:</strong>
                        <ul class="small">
                            ${match.weaknesses && match.weaknesses.length > 0 ? match.weaknesses.map(weakness => `<li>${weakness}</li>`).join('') : '<li>None identified</li>'}
                        </ul>
                    </div>
                    <div>
                        <strong>Recommendation:</strong>
                        <p class="small border p-2 rounded bg-light">${match.recommendation || 'No specific recommendation'}</p>
                    </div>
                </div>
            </div>
            
            <div class="row mt-3">
                <div class="col-12">
                    <h6>Job Description</h6>
                    <div class="border p-3 rounded bg-light" style="max-height: 200px; overflow-y: auto;">
                        <small>${match.jobDescription || 'No job description provided'}</small>
                    </div>
                </div>
            </div>
        `;

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('candidateModal'));
        modal.show();
        
    } catch (err) {
        console.error('Error loading candidate details:', err);
        alert('Error loading candidate details.');
    }
}

async function exportShortlisted() {
    try {
        const response = await fetch('/api/admin/shortlisted');
        const shortlisted = await response.json();
        
        if (shortlisted.length === 0) {
            alert('No shortlisted candidates to export.');
            return;
        }

        // Ask for export format
        const format = prompt('Choose export format: (1) Excel, (2) CSV, (3) JSON', '1');
        
        switch(format) {
            case '1':
                exportToExcel(shortlisted);
                break;
            case '2':
                exportToCSV(shortlisted);
                break;
            case '3':
                exportToJSON(shortlisted);
                break;
            default:
                alert('Invalid format selected.');
        }
    } catch (err) {
        console.error('Export error:', err);
        alert('Error exporting data.');
    }
}

function exportToExcel(data) {
    const worksheet = XLSX.utils.json_to_sheet(data.map(item => ({
        'Candidate Name': item.candidateDetails?.name || 'Not specified',
        'Email': item.candidateDetails?.email || 'Not specified',
        'Phone': item.candidateDetails?.phone || 'Not specified',
        'Job Role': item.jobRole || 'Not specified',
        'Match Score': item.similarityScore,
        'Status': item.status,
        'Applied Date': new Date(item.createdAt).toLocaleDateString(),
        'Applied By': item.user?.username || 'Unknown',
        'Skills': item.candidateDetails?.skills?.join(', ') || 'Not specified',
        'Matched Skills': item.matchedSkills?.join(', ') || 'None',
        'Missing Skills': item.missingSkills?.join(', ') || 'None'
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Shortlisted Candidates');
    XLSX.writeFile(workbook, 'shortlisted_candidates.xlsx');
}

function exportToCSV(data) {
    const csvData = data.map(item => [
        item.candidateDetails?.name || 'Not specified',
        item.candidateDetails?.email || 'Not specified',
        item.candidateDetails?.phone || 'Not specified',
        item.jobRole || 'Not specified',
        item.similarityScore,
        item.status,
        new Date(item.createdAt).toLocaleDateString(),
        item.user?.username || 'Unknown',
        item.candidateDetails?.skills?.join(', ') || 'Not specified',
        item.matchedSkills?.join(', ') || 'None',
        item.missingSkills?.join(', ') || 'None'
    ].join(','));

    const headers = ['Name', 'Email', 'Phone', 'Job Role', 'Match Score', 'Status', 'Applied Date', 'Applied By', 'Skills', 'Matched Skills', 'Missing Skills'].join(',');
    const csvContent = [headers, ...csvData].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'shortlisted_candidates.csv');
}

function exportToJSON(data) {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8;' });
    saveAs(blob, 'shortlisted_candidates.json');
}