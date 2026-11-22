import { useState } from 'react';
import { Droplets } from 'lucide-react';
import { login, requestPasswordReset, resetPassword } from '../services/api';

export default function Login({ go }) {
	const [form, setForm] = useState({ email: '', password: '' });
	const [message, setMessage] = useState({ type: '', text: '' });
	const [submitting, setSubmitting] = useState(false);
	const [resetEmail, setResetEmail] = useState('');
	const resetToken = new URLSearchParams(window.location.search).get('resetToken');

	const submit = async (event) => {
		event.preventDefault();
		setSubmitting(true);
		setMessage({ type: '', text: '' });
		try {
			await login(form);
			setMessage({ type: 'success', text: 'You are signed in.' });
			go('dashboard');
		} catch (error) {
			setMessage({ type: 'error', text: error.message });
		} finally {
			setSubmitting(false);
		}
	};

	const forgot = async () => {
		setSubmitting(true); setMessage({ type: '', text: '' });
		try { const result = await requestPasswordReset(resetEmail); setMessage({ type: 'success', text: result.message }); }
		catch (error) { setMessage({ type: 'error', text: error.message }); }
		finally { setSubmitting(false); }
	};

	const updatePassword = async (event) => {
		event.preventDefault(); setSubmitting(true); setMessage({ type: '', text: '' });
		try { const result = await resetPassword(resetToken, form.password); setMessage({ type: 'success', text: result.message }); window.history.replaceState({}, '', window.location.pathname); }
		catch (error) { setMessage({ type: 'error', text: error.message }); }
		finally { setSubmitting(false); }
	};

	return <div className="grid min-h-[calc(100vh-5rem)] place-items-center px-5 py-14"><form onSubmit={resetToken ? updatePassword : submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/70"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-600 text-white"><Droplets fill="currentColor"/></span><h1 className="mt-5 text-center text-3xl font-bold">{resetToken ? 'Choose a new password' : 'Welcome back'}</h1><p className="mt-2 text-center text-slate-500">{resetToken ? 'Reset links expire after one hour.' : 'Log in to continue saving lives.'}</p>{resetToken ? <label className="mt-7 block text-sm font-bold">New password<input required minLength="8" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-2 w-full rounded-xl border p-3 outline-red-400" placeholder="At least 8 characters"/></label> : <><label className="mt-7 block text-sm font-bold">Email address<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 w-full rounded-xl border p-3 outline-red-400" placeholder="you@example.com"/></label><label className="mt-4 block text-sm font-bold">Password<input required minLength="8" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-2 w-full rounded-xl border p-3 outline-red-400" placeholder="Password"/></label></>}{message.text && <p role="status" className={`form-message ${message.type}`}>{message.text}</p>}<button disabled={submitting} type="submit" className="mt-6 w-full rounded-xl bg-red-600 p-3 font-bold text-white disabled:opacity-60">{submitting ? 'Please wait…' : resetToken ? 'Update password' : 'Log in'}</button>{!resetToken && <div className="mt-4 flex justify-center gap-2"><input type="email" aria-label="Email for password reset" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="Email to reset password" className="min-w-0 rounded-lg border p-2 text-sm"/><button type="button" onClick={forgot} disabled={submitting || !resetEmail} className="text-sm font-bold text-red-600">Forgot password?</button></div>}<p className="mt-5 text-center text-sm text-slate-500">New to LifeLink? <button type="button" onClick={()=>go('register')} className="font-bold text-red-600">Create an account</button></p></form></div>;
}
