import { useEffect, useState } from 'react';
import { Building2, MapPin, Phone, Clock3, ExternalLink } from 'lucide-react';
import { getBloodBanks, getCurrentUser, submitReport } from '../services/api';

export default function BloodBanks() {
	const [banks, setBanks] = useState([]);
	const [city, setCity] = useState('');
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState('');
	const [reportingBank, setReportingBank] = useState(null);
	const [report, setReport] = useState({ title: '', description: '' });

	const search = async (event) => {
		event?.preventDefault();
		setLoading(true);
		setMessage('');
		try {
			setBanks(await getBloodBanks({ city }));
		} catch (error) {
			setMessage(error.message);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { search(); }, []);

	const sendReport = async (event) => {
		event.preventDefault();
		try {
			await submitReport({ ...report, bankId: reportingBank.id });
			setReportingBank(null);
			setReport({ title: '', description: '' });
			setMessage('Your report was sent to the administrators.');
		} catch (error) {
			setMessage(error.message);
		}
	};

	return <div className="page-shell">
		<div className="page-heading"><p className="eyebrow">Verified partners</p><h1>Blood banks near you</h1><p>Only listings verified by an administrator are shown. Call to confirm inventory before travelling.</p></div>
		<form className="search-panel" onSubmit={search}><label className="search-field"><MapPin size={18}/><input aria-label="City" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Search city or area"/></label><button className="button primary" type="submit">Search</button></form>
		<p className="result-count">{loading ? 'Loading verified listings…' : `${banks.length} verified blood bank${banks.length === 1 ? '' : 's'}`}</p>
		{message && <p role="alert" className="form-message error">{message}</p>}
		<div className="donor-grid">{loading ? <div className="empty-state">Loading blood banks…</div> : banks.length ? banks.map((bank) => {
			const mapUrl = bank.latitude && bank.longitude
				? `https://www.openstreetmap.org/?mlat=${encodeURIComponent(bank.latitude)}&mlon=${encodeURIComponent(bank.longitude)}#map=16/${encodeURIComponent(bank.latitude)}/${encodeURIComponent(bank.longitude)}`
				: `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${bank.address} ${bank.city}`)}`;
			return <article key={bank.id} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100"><div className="flex justify-between gap-3"><div className="flex gap-4"><span className="icon-tile"><Building2/></span><div><h2 className="font-bold text-slate-900">{bank.name}</h2>{bank.isDemo && <span className="mt-1 inline-block rounded bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">SAMPLE DATA</span>}<p className="mt-2 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14}/>{bank.address}, {bank.city}</p></div></div></div><div className="mt-5 flex flex-wrap gap-4 border-t pt-4 text-sm text-slate-500"><span className="flex gap-1"><Clock3 size={16}/>{bank.operatingHours}</span><a className="flex gap-1" href={`tel:${bank.phone}`}><Phone size={16}/>{bank.phone}</a><a className="flex gap-1 text-red-600" href={mapUrl} target="_blank" rel="noreferrer"><ExternalLink size={16}/>Open map</a></div><p className="mt-3 text-xs text-slate-500">Last verified {new Date(bank.lastVerifiedAt).toLocaleDateString()}</p>{getCurrentUser() && <button className="filter-button mt-3" onClick={() => setReportingBank(bank)}>Report listing</button>}</article>;
		}) : <div className="empty-state">No verified blood banks found for this location.</div>}</div>
		{reportingBank && <form className="form-card full-field" onSubmit={sendReport}><h2 className="text-xl font-bold">Report {reportingBank.name}</h2><label className="field full-field">Subject<input required minLength="3" maxLength="100" value={report.title} onChange={(event) => setReport({ ...report, title: event.target.value })}/></label><label className="field full-field">Details<textarea required minLength="10" maxLength="1000" value={report.description} onChange={(event) => setReport({ ...report, description: event.target.value })}/></label><div className="mt-4 flex gap-2"><button className="button primary" type="submit">Send report</button><button className="button" type="button" onClick={() => setReportingBank(null)}>Cancel</button></div></form>}
	</div>;
}
