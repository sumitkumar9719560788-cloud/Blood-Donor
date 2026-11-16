import { useState } from 'react';
import { Heart } from 'lucide-react';
import { bloodGroups, login, register, saveDonor } from '../services/api';

const initialForm = { name: '', email: '', phone: '', city: '', group: '', password: '', consent: false };

export default function Register({ go }) {
	const [form, setForm] = useState(initialForm);
	const [message, setMessage] = useState({ type: '', text: '' });
	const update = (event) => setForm({ ...form, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });

	const submit = async (event) => {
		event.preventDefault();
		if (!form.name || !form.email || !form.phone || !form.city || !form.group || !form.password) {
			setMessage({ type: 'error', text: 'Please complete every field before creating your profile.' });
			return;
		}
		if (form.password.length < 8) {
			setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
			return;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
			setMessage({ type: 'error', text: 'Please enter a valid email address.' });
			return;
		}
		if (!form.consent) {
			setMessage({ type: 'error', text: 'Please confirm that you are willing to be contacted.' });
			return;
		}
		try {
			await register({
				name: form.name,
				email: form.email,
				password: form.password,
				phone: form.phone,
				city: form.city,
				role: 'DONOR',
			});
			await login({ email: form.email, password: form.password });
			await saveDonor({
				bloodGroup: form.group,
				city: form.city,
				consentVisible: form.consent,
				available: true,
			});
			setForm(initialForm);
			setMessage({ type: 'success', text: 'Your donor profile was created. Thank you for showing up.' });
		} catch (error) {
			setMessage({ type: 'error', text: error.message });
		}
	};

	return <div className="page-shell narrow-page"><div className="page-heading centered"><span className="icon-tile"><Heart fill="currentColor" /></span><h1>Become someone’s hero</h1><p>Join a community that shows up when it matters.</p></div><form className="form-card" onSubmit={submit} noValidate><div className="form-grid">{[['name','Full name','Your full name','text'],['email','Email address','you@example.com','email'],['phone','Phone number','+91','tel'],['city','City','Your city','text']].map(([name,label,placeholder,type])=><label className="field" key={name}>{label}<input name={name} type={type} value={form[name]} onChange={update} placeholder={placeholder} /></label>)}<label className="field">Blood group<select name="group" value={form.group} onChange={update}><option value="">Select group</option>{bloodGroups.map((group) => <option key={group}>{group}</option>)}</select></label>	<label className="field">Password<input name="password" type="password" minLength="8" value={form.password} onChange={update} placeholder="At least 8 characters" /></label></div><label className="consent"><input name="consent" type="checkbox" checked={form.consent} onChange={update} />I consent to my donor name and city being shown to people searching for donors. My contact details will not be public.</label>{message.text && <p role="status" className={`form-message ${message.type}`}>{message.text}</p>}<button type="submit" className="button primary full-width">Create donor profile</button></form></div>;
}
