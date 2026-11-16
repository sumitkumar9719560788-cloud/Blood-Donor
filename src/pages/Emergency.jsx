import { useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { bloodGroups, getCurrentUser, submitEmergencyRequest } from '../services/api';

const initialForm = { patient: '', contact: '', hospital: '', city: '', group: '', units: '1', details: '', consentToShare: false };

export default function Emergency({ go }) {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState({ type: '', text: '' });
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    if (!form.patient || !form.contact || !form.hospital || !form.city || !form.group) {
      setMessage({ type: 'error', text: 'Please complete the patient, contact, hospital, area and blood group fields.' });
      return;
    }
    if (!getCurrentUser()) {
      setMessage({ type: 'error', text: 'Please log in or create an account before submitting a request.' });
      return;
    }
    if (!form.consentToShare) {
      setMessage({ type: 'error', text: 'Please consent to share your contact details and request information with a matching opted-in donor.' });
      return;
    }
    setSubmitting(true);
    try {
      await submitEmergencyRequest({
        bloodGroup: form.group,
        unitsNeeded: Number(form.units),
        urgency: 'Urgent',
        city: form.city,
        hospitalName: form.hospital,
        contactMethod: form.contact,
        details: [form.patient && `Patient: ${form.patient}`, form.details].filter(Boolean).join('\n'),
        consentToShare: form.consentToShare,
      });
      setForm(initialForm);
      setMessage({ type: 'success', text: 'Your request was submitted. Please call the hospital or local emergency services as well; this app does not dispatch emergency care.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="page-shell narrow-page"><div className="emergency-banner"><div className="banner-title"><span className="banner-icon"><AlertTriangle /></span><div><p className="eyebrow light">Emergency request</p><h1>Request blood, fast.</h1></div></div><p>Submit a request for nearby volunteers to review. Donor and inventory availability must be confirmed directly.</p></div><form className="form-card" onSubmit={submit} noValidate><div className="form-grid">{[['patient','Patient name','Enter patient name','text'],['contact','Contact number','+91','tel'],['hospital','Hospital name','Hospital or clinic','text'],['city','City / Area','Your location','text']].map(([name,label,placeholder,type])=><label className="field" key={name}>{label}<input name={name} required={name !== 'patient'} type={type} value={form[name]} onChange={update} placeholder={placeholder} /></label>)}<label className="field">Blood group<select required name="group" value={form.group} onChange={update}><option value="">Select blood group</option>{bloodGroups.map((group) => <option key={group}>{group}</option>)}</select></label><label className="field">Units needed<select name="units" value={form.units} onChange={update}><option value="1">1 unit</option><option value="2">2 units</option><option value="3">3 units</option></select></label></div><label className="field full-field">Additional details<textarea name="details" value={form.details} onChange={update} placeholder="Any additional information that can help donors..." /></label><label className="consent"><input name="consentToShare" type="checkbox" checked={form.consentToShare} onChange={update} />I consent to sharing this request and my contact number with matching donors who have opted in to help.</label>{message.text && <p role="status" className={`form-message ${message.type}`}>{message.text}</p>}<button type="submit" disabled={submitting} className="button primary full-width">{submitting ? 'Submitting…' : 'Create emergency request'}</button><p className="helper-text"><ShieldCheck size={16} /> In a medical emergency, contact local emergency services or a hospital immediately. LifeLink does not dispatch emergency care.</p></form></div>;
}