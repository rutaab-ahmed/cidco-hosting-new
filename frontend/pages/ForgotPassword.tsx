
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, MailCheck } from 'lucide-react';
import { ApiService } from '../services/api';

export const ForgotPassword: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) return;
    
    setLoading(true);
    setMessage('');
    
    const result = await ApiService.forgotPassword(identifier);
    
    setLoading(false);
    if (result.success) {
      setSubmitted(true);
      setMessage(result.message);
    } else {
      setIsError(true);
      setMessage(result.message);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in">
          <div className="bg-indigo-700 p-10 text-center">
            <div className="mx-auto w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <MailCheck className="text-white w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white">Check Your Email</h2>
          </div>
          <div className="p-8 text-center">
            <p className="text-gray-600 mb-8 leading-relaxed">
              We've sent a password reset link to the email associated with <strong>{identifier}</strong>. Please check your inbox and spam folder.
            </p>
            <Link 
              to="/login" 
              className="inline-flex items-center justify-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition"
            >
              <ArrowLeft size={18} /> Return to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gray-800 p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="text-white w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Forgot Password</h2>
          <p className="text-gray-400 mt-2 text-sm">Enter your registered username or email</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {message && (
              <div className={`p-3 rounded-lg text-center text-sm font-medium ${isError ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                {message}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-2 tracking-widest">Username or Email</label>
              <input 
                type="text" 
                value={identifier} 
                onChange={(e) => setIdentifier(e.target.value)} 
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition shadow-sm" 
                placeholder="e.g. john_doe@pfepl.com" 
                required 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || !identifier} 
              className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-indigo-700 transition shadow-lg hover:shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Send Reset Link'}
            </button>
            
            <div className="text-center pt-2">
              <Link to="/login" className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-900 text-xs font-bold uppercase tracking-widest">
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
