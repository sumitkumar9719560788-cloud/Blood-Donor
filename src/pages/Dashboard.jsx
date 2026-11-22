import { useEffect, useState } from 'react';
import { addBloodBank, cancelRequest, deleteMyAccount, getAdminReports, getAdminStats, getAdminUsers, getAdminRequests, getAdminPendingDonors, verifyDonor, updateUserRole, setUserActive, getMyDonor, saveDonor, getAssignedRequests, getCurrentUser, getEmergencyRequests, getPendingBanks, getRequestOpportunities, logout, respondToRequest, updateRequestStatus, verifyBank } from '../services/api';

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

const displayGroup = (group) => groupNames[group] || group;

export default function Dashboard({ go }) {
	const user = getCurrentUser();
	const [requests, setRequests] = useState([]);
	const [opportunities, setOpportunities] = useState([]);
	const [stats, setStats] = useState(null);
	const [pendingBanks, setPendingBanks] = useState([]);
	const [reports, setReports] = useState([]);
	const [adminUsers, setAdminUsers] = useState([]);
	const [adminRequests, setAdminRequests] = useState([]);
	const [pendingDonors, setPendingDonors] = useState([]);
	const [donorProfile, setDonorProfile] = useState(null);
	const [profileMessage, setProfileMessage] = useState('');
	const [bankForm, setBankForm] = useState({ name: '', city: '', address: '', phone: '', latitude: '', longitude: '', operatingHours: '', bloodInventory: '{"O+": 0}' });
	const [message, setMessage] = useState('');
	const [loading, setLoading] = useState(true);

	const refresh = async () => {
		if (!user) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setMessage('');
		try {
			if (user.role === 'ADMIN') {
				const results = await Promise.all([getAdminStats(), getPendingBanks(), getAdminReports(), getAdminUsers(), getAdminRequests(), getAdminPendingDonors()]);
				setStats(results[0]);
				setPendingBanks(results[1]);
				setReports(results[2]);
				setAdminUsers(results[3]);
				setAdminRequests(results[4]);
				setPendingDonors(results[5]);
			} else {
				setRequests(await getEmergencyRequests());
				if (user.role === 'DONOR') {
					setDonorProfile(await getMyDonor().catch(() => null));
					const results = await Promise.allSettled([getRequestOpportunities(), getAssignedRequests()]);
					setOpportunities(results[0].status === 'fulfilled' ? results[0].value : []);
					setRequests(results[1].status === 'fulfilled' ? results[1].value : []);
					const failed = results.find((result) => result.status === 'rejected');
					if (failed) setMessage(failed.reason.message);
				}
			}
		} catch (error) {
			setMessage(error.message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { refresh(); }, []);

	const respond = async (id) => {
		try {
			await respondToRequest(id);
			setMessage('You accepted this request. Contact the requester using the details shown in your assigned requests.');
			await refresh();
		} catch (error) {
			setMessage(error.message);
		}
	};

	const reviewBank = async (id, verificationStatus) => {
		try {
			await verifyBank(id, verificationStatus);
			setMessage(`Bank marked ${verificationStatus.toLowerCase()}.`);
			await refresh();
		} catch (error) {
			setMessage(error.message);
		}
	};

	const changeRole = async (id, role) => {
		try { await updateUserRole(id, role); setMessage('User role updated.'); await refresh(); }
		catch (error) { setMessage(error.message); }
	};

	const toggleUserActive = async (member) => {
		try { await setUserActive(member.id, !member.active); setMessage(`Account ${member.active ? 'deactivated' : 'activated'}.`); await refresh(); }
		catch (error) { setMessage(error.message); }
	};

	const reviewDonor = async (id, verificationStatus) => {
		try { await verifyDonor(id, verificationStatus); setMessage(`Donor marked ${verificationStatus.toLowerCase()}.`); await refresh(); }
		catch (error) { setMessage(error.message); }
	};

	const createBank = async (event) => {
		event.preventDefault();
		try {
			const bloodInventory = JSON.parse(bankForm.bloodInventory);
			await addBloodBank({
				name: bankForm.name,
				city: bankForm.city,
				address: bankForm.address,
				phone: bankForm.phone,
				latitude: Number(bankForm.latitude),
				longitude: Number(bankForm.longitude),
				operatingHours: bankForm.operatingHours,
				bloodInventory,
			});
			setBankForm({ name: '', city: '', address: '', phone: '', latitude: '', longitude: '', operatingHours: '', bloodInventory: '{"O+": 0}' });
			setMessage('Blood bank added to the pending verification queue.');
			await refresh();
		} catch (error) {
			setMessage(error instanceof SyntaxError ? 'Inventory must be valid JSON, such as {"O+": 4}.' : error.message);
		}
	};

	const updateStatus = async (id, status) => {
		try {
			await updateRequestStatus(id, status);
			await refresh();
		} catch (error) {
			setMessage(error.message);
		}
	};

	const deleteAccount = async () => {
		if (!window.confirm('Delete your account and its associated donor profile and requests? This cannot be undone.')) return;
		try {
			await deleteMyAccount();
			logout();
			go('home');
		} catch (error) {
			setMessage(error.message);
		}
	};

	if (!user) {
		return <div className="page-shell narrow-page"><section className="form-card"><h1 className="font-display text-3xl">Log in to your dashboard</h1><p className="mt-3 text-slate-600">View your submitted blood requests and opted-in donor opportunities.</p><button className="button primary full-width" onClick={() => go('login')}>Log in</button></section></div>;
	}

	return <div className="page-shell">
		<div className="row-between"><div className="page-heading"><p className="eyebrow">{user.role === 'ADMIN' ? 'Administration' : 'Your LifeLink account'}</p><h1>Welcome, {user.name}</h1><p>{user.email}</p></div><div className="flex gap-2"><button className="button primary" onClick={() => { logout(); go('home'); }}>Log out</button><button className="button" onClick={deleteAccount}>Delete account</button></div></div>
		{message && <p role="status" className="form-message">{message}</p>}
		{loading ? <div className="empty-state">Loading your dashboard…</div> : user.role === 'ADMIN' ? <>
			<section className="card-grid">{stats && Object.entries(stats).map(([label, count]) => <article key={label} className="form-card"><p className="eyebrow">{label}</p><p className="mt-3 text-3xl font-bold">{count}</p></article>)}</section>
			<form className="form-card full-field" onSubmit={createBank}><h2 className="text-xl font-bold">Add a blood bank for verification</h2><div className="form-grid mt-4">{[['name','Bank name'],['city','City'],['address','Street address'],['phone','Phone'],['latitude','Latitude'],['longitude','Longitude'],['operatingHours','Operating hours'],['bloodInventory','Inventory JSON']].map(([name,label]) => <label key={name} className="field">{label}<input required value={bankForm[name]} onChange={(event) => setBankForm({ ...bankForm, [name]: event.target.value })} placeholder={name === 'bloodInventory' ? '{"O+": 4, "A+": 2}' : ''}/></label>)}</div><button className="button primary mt-4" type="submit">Add for review</button></form>
			<section className="form-card full-field"><h2 className="text-xl font-bold">Blood banks awaiting verification</h2><div className="mt-4 donor-grid">{pendingBanks.length ? pendingBanks.map((bank) => <article key={bank.id} className="rounded-xl border p-4"><h3 className="font-bold">{bank.name}</h3><p className="mt-1 text-sm text-slate-600">{bank.address}, {bank.city}</p><p className="text-sm text-slate-600">{bank.phone}</p><div className="mt-3 flex gap-2"><button className="button primary" onClick={() => reviewBank(bank.id, 'VERIFIED')}>Verify</button><button className="button" onClick={() => reviewBank(bank.id, 'REJECTED')}>Reject</button></div></article>) : <div className="empty-state">No banks are waiting for verification.</div>}</div></section>
			<section className="form-card full-field"><h2 className="text-xl font-bold">Submitted reports</h2><div className="mt-4 donor-grid">{reports.length ? reports.map((report) => <article key={report.id} className="rounded-xl border p-4"><h3 className="font-bold">{report.title}</h3><p className="mt-1 text-sm text-slate-600">{report.description}</p><p className="mt-2 text-xs text-slate-500">Submitted by {report.author.name} · {new Date(report.createdAt).toLocaleDateString()}</p></article>) : <div className="empty-state">No reports have been submitted.</div>}</div></section>
			<section className="form-card full-field"><h2 className="text-xl font-bold">User and donor management</h2><div className="mt-4 donor-grid">{adminUsers.length ? adminUsers.map((member) => <article key={member.id} className="rounded-xl border p-4"><h3 className="font-bold">{member.name}</h3><p className="text-sm text-slate-600">{member.email} · {member.city || 'No city'} · {member.donorProfile ? displayGroup(member.donorProfile.bloodGroup) : 'No donor profile'} · {member.active ? 'Active' : 'Inactive'}</p><label className="field mt-3">Role<select value={member.role} onChange={(event) => changeRole(member.id, event.target.value)}>{['USER','DONOR','REQUESTER','ADMIN'].map((role) => <option key={role}>{role}</option>)}</select></label>{member.id !== user.id && <button className="button mt-3" onClick={() => toggleUserActive(member)}>{member.active ? 'Deactivate account' : 'Reactivate account'}</button>}</article>) : <div className="empty-state">No users found.</div>}</div></section>
						<section className="form-card full-field"><h2 className="text-xl font-bold">Donors awaiting verification</h2><div className="mt-4 donor-grid">{pendingDonors.length ? pendingDonors.map((donor) => <article key={donor.id} className="rounded-xl border p-4"><h3 className="font-bold">{donor.user.name} · {displayGroup(donor.bloodGroup)}</h3><p className="text-sm text-slate-600">{donor.city} · {donor.user.email} · {donor.user.phone || 'No phone'}</p><div className="mt-3 flex gap-2"><button className="button primary" onClick={() => reviewDonor(donor.id, 'VERIFIED')}>Verify</button><button className="button" onClick={() => reviewDonor(donor.id, 'REJECTED')}>Reject</button></div></article>) : <div className="empty-state">No donors are waiting for verification.</div>}</div></section>
			<section className="form-card full-field"><h2 className="text-xl font-bold">Blood request management</h2><div className="mt-4 donor-grid">{adminRequests.length ? adminRequests.map((item) => <article key={item.id} className="rounded-xl border p-4"><h3 className="font-bold">{displayGroup(item.bloodGroup)} · {item.unitsNeeded} unit{item.unitsNeeded === 1 ? '' : 's'}</h3><p className="text-sm text-slate-600">{item.hospitalName}, {item.city} · {item.user.name} ({item.user.email})</p><p className="text-sm text-slate-600">Status: {item.status.toLowerCase()}</p>{!['FULFILLED','CANCELLED'].includes(item.status) && <div className="mt-2 flex gap-2"><button className="button" onClick={() => updateStatus(item.id,'FULFILLED')}>Mark fulfilled</button><button className="button" onClick={() => updateStatus(item.id,'CANCELLED')}>Cancel</button></div>}</article>) : <div className="empty-state">No blood requests found.</div>}</div></section>
		</> : <>
			{user.role === 'DONOR' && <section className="form-card"><h2 className="text-xl font-bold">Donor profile</h2><p className="mt-1 text-sm text-slate-500">Update your blood group, city and donor availability.</p>{donorProfile?.verificationStatus && <p className="mt-2 text-sm font-semibold">Verification: {donorProfile.verificationStatus.toLowerCase()}</p>}<form className="form-grid mt-4" onSubmit={async (event) => { event.preventDefault(); try { await saveDonor(donorProfile); setProfileMessage('Profile saved and sent for verification.'); await refresh(); } catch (error) { setProfileMessage(error.message); } }}><label className="field">Blood group<select required value={donorProfile?.bloodGroup || ''} onChange={(event) => setDonorProfile({ ...donorProfile, bloodGroup: event.target.value })}><option value="">Select blood group</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((group) => <option key={group}>{group}</option>)}</select></label><label className="field">City<input required minLength="2" value={donorProfile?.city || ''} onChange={(event) => setDonorProfile({ ...donorProfile, city: event.target.value })}/></label><label className="consent"><input type="checkbox" checked={Boolean(donorProfile?.available)} onChange={(event) => setDonorProfile({ ...donorProfile, available: event.target.checked })}/>Available to donate</label><label className="consent"><input type="checkbox" checked={Boolean(donorProfile?.consentVisible)} onChange={(event) => setDonorProfile({ ...donorProfile, consentVisible: event.target.checked })}/>Show my profile in donor searches</label>{profileMessage && <p role="status" className="form-message">{profileMessage}</p>}<button className="button primary">Save donor profile</button></form></section>}
			{user.role === 'DONOR' && <section className="form-card"><h2 className="text-xl font-bold">Matching requests</h2><p className="mt-1 text-sm text-slate-500">Only requests whose owners consented to share details are shown.</p><div className="mt-4 donor-grid">{opportunities.length ? opportunities.map((item) => <article key={item.id} className="rounded-xl border p-4"><h3 className="font-bold">{displayGroup(item.bloodGroup)} · {item.unitsNeeded} unit{item.unitsNeeded === 1 ? '' : 's'}</h3><p className="mt-2 text-sm text-slate-600">{item.hospitalName}, {item.city}</p><p className="text-sm text-slate-600">Contact: {item.contactMethod}</p><p className="text-sm text-slate-600">Urgency: {item.urgency}</p><button className="button primary mt-4" onClick={() => respond(item.id)}>I can help</button></article>) : <div className="empty-state">No matching requests are available right now.</div>}</div></section>}
			<section className="form-card full-field"><h2 className="text-xl font-bold">{user.role === 'DONOR' ? 'Requests you accepted' : 'Your blood requests'}</h2><div className="mt-4 donor-grid">{requests.length ? requests.map((item) => <article key={item.id} className="rounded-xl border p-4"><h3 className="font-bold">{displayGroup(item.bloodGroup)} · {item.unitsNeeded} unit{item.unitsNeeded === 1 ? '' : 's'}</h3><p className="mt-2 text-sm text-slate-600">{item.hospitalName}, {item.city}</p><p className="text-sm text-slate-600">Status: {item.status.toLowerCase()}</p>{user.role === 'DONOR' && <><p className="text-sm text-slate-600">Contact: {item.contactMethod}</p>{item.status === 'CONTACTING' && <button className="button primary mt-3" onClick={() => updateStatus(item.id, 'FULFILLED')}>Mark fulfilled</button>}</>}{user.role !== 'DONOR' && !['FULFILLED', 'CANCELLED'].includes(item.status) && <button className="button mt-3" onClick={() => cancelRequest(item.id)}>Cancel request</button>}</article>) : <div className="empty-state">No blood requests to display.</div>}</div></section>
		</>}
	</div>;
}
