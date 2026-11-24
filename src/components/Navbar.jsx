import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useCampaign } from '../context/CampaignContext';
import { Sparkles, LogOut, X } from 'lucide-react';

function SignUpModal({ onClose, onSuccess }) {
  const { handleRegister } = useCampaign();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await handleRegister(name.trim(), email.trim(), password);
    setLoading(false);
    if (ok) onSuccess();
  };

  const inputCls =
    'w-full px-4 py-3 rounded-xl bg-[#0d0f17] border border-[#202436] text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-admint-500 transition-colors';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#11131c] border border-[#1c1f2e] p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-white mb-1">Create your account</h2>
        <p className="text-sm text-slate-400 mb-6">Start generating ad creatives with AdGenie.</p>

        <form onSubmit={submit} className="space-y-4">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className={inputCls}
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className={inputCls}
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className={inputCls}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full px-5 py-3 rounded-xl bg-admint-500 hover:bg-admint-600 active:scale-95 disabled:opacity-60 text-white font-semibold text-sm shadow-lg shadow-admint-500/25 transition-all"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="text-sm text-slate-400 mt-5 text-center">
          Already have an account?{' '}
          <button
            onClick={onSuccess}
            className="text-admint-400 hover:text-white font-semibold transition-colors"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

export default function Navbar() {
  const { user, setIsSignInOpen, activeTab, setActiveTab, handleSignOut } = useCampaign();
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);

  const scrollToSection = (id) => {
    if (activeTab !== 'home') {
      setActiveTab('home');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#090a0f]/90 backdrop-blur-md border-b border-[#1c1f2e] transition-all">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={() => {
            setActiveTab('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-3 text-left focus:outline-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-admint-500 flex items-center justify-center text-white shadow-lg shadow-admint-500/30 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 fill-white/20" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">AdGenie</span>
        </button>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="hover:text-white transition-colors"
          >
            How it works
          </button>
          <button
            onClick={() => scrollToSection('studio')}
            className="hover:text-white transition-colors"
          >
            Studio
          </button>
          <button
            onClick={() => {
              setActiveTab('samples');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`transition-colors ${activeTab === 'samples' ? 'text-admint-400 font-semibold' : 'hover:text-white'
              }`}
          >
            Samples
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="hover:text-white transition-colors"
          >
            Features
          </button>
        </nav>

        {/* Right Auth / Action Controls */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-300">
                Hi, <strong className="text-white">{user.name}</strong>
              </span>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-3 py-2 rounded-lg border border-[#202436] hover:bg-[#151824] transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSignInOpen(true)}
                className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={() => setIsSignUpOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-admint-500 hover:bg-admint-600 active:scale-95 text-white font-semibold text-sm shadow-lg shadow-admint-500/25 transition-all"
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </div>

      {isSignUpOpen &&
        createPortal(
          <SignUpModal
            onClose={() => setIsSignUpOpen(false)}
            onSuccess={() => {
              setIsSignUpOpen(false);
              setIsSignInOpen(true);
            }}
          />,
          document.body
        )}
    </header>
  );
}