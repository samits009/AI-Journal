/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LogIn } from 'lucide-react';
import Dashboard from './components/Dashboard';

function LandingPage() {
  const { signInWithGoogle } = useAuth();
  
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#161616] rounded-2xl shadow-sm border border-[#262626] p-8 text-center space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-serif text-[#C5A059] italic tracking-wide">Aurelius</h1>
          <p className="text-[#666] text-sm">
            Reflect, brainstorm, and converse with your AI companion in a private, secure space.
          </p>
        </div>
        
        <button 
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-[#C5A059] text-black py-3 px-4 rounded shadow-lg hover:bg-[#D5B069] transition-colors font-bold text-xs"
        >
          <LogIn className="w-4 h-4" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#333] border-t-[#C5A059] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

