import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/login.css';


const LoginPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasPendingDream, setHasPendingDream] = useState(false);
  
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();


  useEffect(() => {
    if (location.hash === '#signup') {
      setIsSignUp(true);
    }
    
    const pendingDream = sessionStorage.getItem('pendingDream');
    setHasPendingDream(!!pendingDream);
    
    if (user) {
      navigate('/chat');
    }
  }, [location, user, navigate]);


  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);


    try {
      if (isSignUp) {
        await signUp(email, password);
        setSuccess('Account created! Redirecting...');
      } else {
        await signIn(email, password);
        setSuccess('Successfully signed in! Redirecting...');
      }
    } catch (err: any) {
      let errorMessage = 'Authentication failed';
      
      if (err.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password';
      } else if (err.message.includes('Email not confirmed')) {
        errorMessage = 'Please confirm your email before signing in';
      } else if (err.message.includes('User already registered')) {
        errorMessage = 'This email is already registered. Please sign in instead.';
      } else if (err.message.includes('Password should be')) {
        errorMessage = 'Password must be at least 6 characters';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="login-page">
      <div className="container">
        <Link to="/" className="back-to-home">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M5 12L12 19M5 12L12 5" />
          </svg>
          Back to Home
        </Link>


        <div className="logo-header">
          <div className="logo">
            <svg width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" strokeWidth="2">
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#667eea', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#764ba2', stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </div>
          <div className="app-title">Dream Interpreter</div>
        </div>


        <div className="login-card">
          <h1>{isSignUp ? 'Create your dream account' : 'Welcome back'}</h1>
          <p className="tagline">
            Unlock the hidden meanings in your dreams with AI-powered insights.
          </p>


          {hasPendingDream && (
            <div className="pending-dream-notice">
              ✨ Sign in to interpret your dream!
            </div>
          )}


          <button 
            className="google-button" 
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.6-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.78 2.72v2.26h2.91c1.7-1.57 2.68-3.87 2.68-6.62z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.83.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.96 10.71c-.18-.54-.29-1.13-.29-1.71s.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33z" fill="#FBBC05"/>
              <path d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96L3.96 7.3C4.67 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            <span>Continue with Google</span>
          </button>


          <div className="divider">or</div>


          <form className="email-form" onSubmit={handleEmailAuth}>
            <div className="input-group">
              <input 
                type="email" 
                placeholder="Enter your email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="input-group">
              <input 
                type="password" 
                placeholder="Enter your password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            <button type="submit" className="submit-button" disabled={loading}>
              <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>
            </button>
          </form>


          <div className="toggle-auth">
            <span>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>
            <button
              type="button"
              className="toggle-link"
              onClick={(e) => {
                e.preventDefault();
                setIsSignUp(!isSignUp);
                setError('');
                setSuccess('');
              }}
            >
              {isSignUp ? 'Log in here' : 'Sign up here'}
            </button>
          </div>


          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}


          <div className="footer-text">
            By signing up, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
};


export default LoginPage;