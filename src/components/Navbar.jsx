import { useState } from 'react';
import { Droplets, Menu, X, LayoutDashboard } from 'lucide-react';
import { getCurrentUser, logout } from '../services/api';

const links = [['home', 'Home'], ['blood', 'Find Blood'], ['donor', 'Find Donor'], ['banks', 'Blood Banks'], ['emergency', 'Emergency']];

export default function Navbar({ page, go }) {
  const [open, setOpen] = useState(false);
  const click = (next) => { go(next); setOpen(false); };
  const user = getCurrentUser();
  return <header className="site-header"><div className="nav-inner"><button onClick={() => click('home')} className="brand"><span className="brand-mark"><Droplets size={21} fill="currentColor" /></span><span>Life<span>Link</span></span></button><nav className="desktop-nav">{links.map(([id, label]) => <button key={id} onClick={() => click(id)} className={page === id ? 'active' : ''}>{label}</button>)}</nav><div className="nav-actions">{user ? <><button onClick={() => click('dashboard')} className="login-link">{user.name}</button><button onClick={() => { logout(); click('home'); }} className="login-link">Log out</button></> : <button onClick={() => click('login')} className="login-link">Log in</button>}<button onClick={() => click('register')} className="button primary donor-button">Become a donor</button><button onClick={() => click('dashboard')} aria-label="Open dashboard" className="dashboard-button"><LayoutDashboard size={19} /></button></div><button className="menu-button" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div>{open && <div className="mobile-menu">{links.map(([id, label]) => <button onClick={() => click(id)} key={id} className={page === id ? 'active' : ''}>{label}</button>)}{user ? <button onClick={() => { logout(); click('home'); }}>Log out</button> : <button onClick={() => click('login')}>Log in</button>}<button onClick={() => click('dashboard')}>Dashboard</button><button onClick={() => click('register')} className="button primary">Become a donor</button></div>}</header>;
}