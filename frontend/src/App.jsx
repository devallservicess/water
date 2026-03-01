import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, Users, Calendar, CalendarOff, MessageSquare, BarChart3, ChevronRight } from 'lucide-react';

import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Planning from './pages/Planning';
import Absences from './pages/Absences';
import Chat from './pages/Chat';
import Analytics from './pages/Analytics';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } }
};

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/employees', label: 'Employés', icon: <Users size={20} /> },
    { path: '/planning', label: 'Planning', icon: <Calendar size={20} /> },
    { path: '/absences', label: 'Absences', icon: <CalendarOff size={20} /> },
    { path: '/analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
    { path: '/chat', label: 'Chat AI', icon: <MessageSquare size={20} /> },
  ];

  return (
    <motion.div
      className="w-64 bg-white border-r h-full flex flex-col shadow-sm"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-6 border-b flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
          💊
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800">Pharma RH</h1>
          <p className="text-[10px] text-slate-400 font-medium tracking-wide">AI-POWERED AGENT</p>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
            >
              <div className="flex items-center space-x-3">
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </div>
              {isActive && <ChevronRight size={14} className="text-blue-400" />}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t text-xs text-slate-400 text-center">
        © 2026 Pharma RH Agent · v2.0
      </div>
    </motion.div>
  );
};

const Toast = ({ toast }) => {
  if (!toast) return null;
  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  };
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  return (
    <motion.div
      className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl border shadow-lg text-sm font-medium ${colors[toast.type]}`}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
    >
      {icons[toast.type]} {toast.msg}
    </motion.div>
  );
};

const AnimatedPage = ({ children }) => (
  <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
    {children}
  </motion.div>
);

export default function App() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8 relative">
          <AnimatePresence>
            <Toast toast={toast} />
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<AnimatedPage><Dashboard showToast={showToast} /></AnimatedPage>} />
              <Route path="/employees" element={<AnimatedPage><Employees showToast={showToast} /></AnimatedPage>} />
              <Route path="/planning" element={<AnimatedPage><Planning showToast={showToast} /></AnimatedPage>} />
              <Route path="/absences" element={<AnimatedPage><Absences showToast={showToast} /></AnimatedPage>} />
              <Route path="/analytics" element={<AnimatedPage><Analytics /></AnimatedPage>} />
              <Route path="/chat" element={<AnimatedPage><Chat /></AnimatedPage>} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </BrowserRouter>
  );
}
