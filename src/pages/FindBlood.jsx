import { useEffect, useState } from 'react';
import { Search, MapPin, Building2, Phone, Clock3 } from 'lucide-react';
import { bloodGroups, getBloodBanks } from '../services/api';

export default function FindBlood({ go }) {
	const [group, setGroup] = useState('');
	const [location, setLocation] = useState('');
	const [banks, setBanks] = useState([]);
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState('');

	const search = async (event) => {
		event?.preventDefault();
		setLoading(true);
		setMessage('');
		try {
			setBanks(await getBloodBanks({ city: location, bloodGroup: group }));
		} catch (error) {
			setMessage(error.message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { search(); }, []);

	return <div className="page-shell">
		<div className="page-heading"><p className="eyebrow">Blood availability</p><h1>Find blood near you</h1><p>Search verified blood banks. Call to confirm current availability before travelling.</p></div>
		<form className="search-panel" onSubmit={search}>
			<label className="search-field"><Search size={18}/><select value={group} onChange={(event) => setGroup(event.target.value)}><option value="">All blood groups</option>{bloodGroups.map((item) => <option key={item}>{item}</option>)}</select></label>
			<label className="search-field"><MapPin size={18}/><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or area"/></label>
			<button className="button primary" type="submit">Search</button>
		</form>
		<p className="result-count">{loading ? 'Searching verified blood banks…' : `${banks.length} verified blood bank${banks.length === 1 ? '' : 's'} found`}</p>
		{message && <p role="alert" className="form-message error">{message}</p>}
		<div className="card-grid">{loading ? <div className="empty-state">Loading verified listings…</div> : banks.length ? banks.map((bank) => {
			const inventory = bank.bloodInventory || {};
			const groups = group ? [[group, inventory[group] || 0]] : Object.entries(inventory);
			return <article key={bank.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
				<div className="flex items-start gap-3"><span className="icon-tile"><Building2/></span><div><h2 className="font-bold text-slate-900">{bank.name}</h2>{bank.isDemo && <span className="mt-1 inline-block rounded bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">SAMPLE DATA</span>}<p className="mt-1 flex gap-1 text-sm text-slate-500"><MapPin size={15}/>{bank.address}, {bank.city}</p></div></div>
				<div className="mt-4 flex flex-wrap gap-2">{groups.map(([bloodType, units]) => <span key={bloodType} className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-red-700">{bloodType}: {units} units</span>)}</div>
				<div className="mt-4 space-y-2 border-t pt-4 text-sm text-slate-600"><p className="flex gap-2"><Phone size={16}/><a href={`tel:${bank.phone}`}>{bank.phone}</a></p><p className="flex gap-2"><Clock3 size={16}/>{bank.operatingHours}</p><p>Last verified: {new Date(bank.lastVerifiedAt).toLocaleDateString()}</p></div>
			</article>;
		}) : <div className="empty-state">No verified banks matched your search. Try another location or blood group.</div>}</div>
		<div className="notice">Can’t find what you need? <button onClick={() => go('emergency')}>Create an emergency request</button>. If this is a medical emergency, contact a hospital or local emergency services immediately.</div>
	</div>;
}
