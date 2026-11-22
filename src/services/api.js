export const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const request = async (path, options = {}) => {
	const token = localStorage.getItem('lifelink-token');
	const response = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			...options.headers,
		},
	});

	const body = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new Error(body.message || 'The request could not be completed. Please try again.');
	}

	return body;
};

export const register = (user) => request('/auth/register', {
	method: 'POST',
	body: JSON.stringify(user),
});

export const login = async (credentials) => {
	const result = await request('/auth/login', {
		method: 'POST',
		body: JSON.stringify(credentials),
	});
	localStorage.setItem('lifelink-token', result.token);
	localStorage.setItem('lifelink-user', JSON.stringify(result.user));
	return result;
};

export const requestPasswordReset = (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
export const resetPassword = (token, password) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });

export const logout = () => {
	localStorage.removeItem('lifelink-token');
	localStorage.removeItem('lifelink-user');
};

export const deleteMyAccount = () => request('/auth/me', { method: 'DELETE' });

export const getCurrentUser = () => {
	try {
		return JSON.parse(localStorage.getItem('lifelink-user') || 'null');
	} catch {
		return null;
	}
};

export const getDonors = async (filters = {}) => {
	const query = new URLSearchParams();
	if (filters.city) query.set('city', filters.city);
	if (filters.bloodGroup) query.set('bloodGroup', filters.bloodGroup);
	const result = await request(`/donors/nearby?${query}`);
	const groupNames = {
		A_POSITIVE: 'A+',
		A_NEGATIVE: 'A-',
		B_POSITIVE: 'B+',
		B_NEGATIVE: 'B-',
		AB_POSITIVE: 'AB+',
		AB_NEGATIVE: 'AB-',
		O_POSITIVE: 'O+',
		O_NEGATIVE: 'O-',
	};
	return result.donors.map((donor) => ({
		...donor,
		group: groupNames[donor.bloodGroup] || donor.bloodGroup,
		area: donor.city,
		initials: donor.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
	}));
};

export const saveDonor = (profile) => request('/donors', {
	method: 'POST',
	body: JSON.stringify(profile),
});
export const getMyDonor = async () => {
	const donor = (await request('/donors/me')).donor;
	if (!donor) return null;
	const groups = { A_POSITIVE: 'A+', A_NEGATIVE: 'A-', B_POSITIVE: 'B+', B_NEGATIVE: 'B-', AB_POSITIVE: 'AB+', AB_NEGATIVE: 'AB-', O_POSITIVE: 'O+', O_NEGATIVE: 'O-' };
	return { ...donor, bloodGroup: groups[donor.bloodGroup] || donor.bloodGroup };
};
export const getAdminUsers = async () => (await request('/admin/users')).users;
export const updateUserRole = (id, role) => request(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
export const setUserActive = (id, active) => request(`/admin/users/${id}/active`, { method: 'PATCH', body: JSON.stringify({ active }) });
export const getAdminRequests = async () => (await request('/admin/requests')).requests;
export const getAdminPendingDonors = async () => (await request('/admin/donors/pending')).donors;
export const verifyDonor = (id, verificationStatus) => request(`/admin/donors/${id}/verification`, { method: 'PATCH', body: JSON.stringify({ verificationStatus }) });

export const getBloodBanks = async (filters = {}) => {
	const query = new URLSearchParams();
	if (filters.city) query.set('city', filters.city);
	if (filters.bloodGroup) query.set('bloodGroup', filters.bloodGroup);
	const result = await request(`/banks?${query}`);
	return result.banks;
};

export const submitEmergencyRequest = (requestData) => request('/requests', {
	method: 'POST',
	body: JSON.stringify(requestData),
});

export const getEmergencyRequests = async () => {
	const result = await request('/requests');
	return result.requests;
};

export const getRequestOpportunities = async () => {
	const result = await request('/requests/opportunities');
	return result.requests;
};

export const getAssignedRequests = async () => {
	const result = await request('/requests/assigned');
	return result.requests;
};

export const respondToRequest = (id) => request(`/requests/${id}/respond`, { method: 'POST' });

export const getAdminStats = async () => {
	const result = await request('/admin/stats');
	return result.stats;
};

export const getPendingBanks = async () => {
	const result = await request('/admin/banks/pending');
	return result.banks;
};

export const verifyBank = (id, verificationStatus) => request(`/admin/banks/${id}/verification`, {
	method: 'PATCH',
	body: JSON.stringify({ verificationStatus }),
});

export const getAdminReports = async () => {
	const result = await request('/admin/reports');
	return result.reports;
};

export const addBloodBank = (bank) => request('/admin/banks', {
	method: 'POST',
	body: JSON.stringify(bank),
});

export const submitReport = (report) => request('/reports', {
	method: 'POST',
	body: JSON.stringify(report),
});

export const updateRequestStatus = (id, status) => request(`/requests/${id}/status`, {
	method: 'PATCH',
	body: JSON.stringify({ status }),
});

export const cancelRequest = (id) => updateRequestStatus(id, 'CANCELLED');
