import { useEffect, useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import DonorCard from '../components/DonorCard';
import { bloodGroups, getDonors } from '../services/api';

export default function FindDonor() {
  const [group, setGroup] = useState('');
  const [location, setLocation] = useState('');
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const search = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      setResults(await getDonors({ city: location, bloodGroup: group }));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { search({ preventDefault() {} }); }, []);

  return <div className="page-shell"><div className="page-heading"><p className="eyebrow">Community heroes</p><h1>Find a donor</h1><p>Search available volunteers who opted in to appear in results.</p></div><form className="search-panel" onSubmit={search}><label className="search-field"><Search size={18} /><select value={group} onChange={(event) => setGroup(event.target.value)}><option value="">All blood groups</option>{bloodGroups.map((item) => <option key={item}>{item}</option>)}</select></label><label className="search-field"><MapPin size={18} /><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Search city or area" /></label><button className="button primary" type="submit">Find donors</button></form><p className="result-count">{loading ? 'Searching donors…' : `${results.length} donor${results.length === 1 ? '' : 's'} available`}</p>{message && <p role="alert" className="form-message error">{message}</p>}<div className="donor-grid">{loading ? <div className="empty-state">Loading opted-in donor listings…</div> : results.length ? results.map((donor) => <DonorCard key={donor.id} {...donor} />) : <div className="empty-state">No opted-in donors match those filters. Try a different area or blood group.</div>}</div><p className="helper-text">Donor availability must be confirmed. Personal contact details are not shown in public search.</p></div>;
}