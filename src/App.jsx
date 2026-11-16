import { useState } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import FindBlood from './pages/FindBlood';
import FindDonor from './pages/FindDonor';
import BloodBanks from './pages/BloodBanks';
import Emergency from './pages/Emergency';
import Dashboard from './pages/Dashboard';

const pages = { home: Home, login: Login, register: Register, blood: FindBlood, donor: FindDonor, banks: BloodBanks, emergency: Emergency, dashboard: Dashboard };
export default function App() {
  const [page, setPage] = useState('home');
  const Page = pages[page] || Home;
  const go = (next) => { setPage(next); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  return <div className="min-h-screen bg-slate-50 text-slate-800"><Navbar page={page} go={go}/><main><Page go={go}/></main>{page !== 'dashboard' && <Footer go={go}/>}</div>;
}
