import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/landing.css';


const LandingPage: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [demoInput, setDemoInput] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();


  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const handleDemoSubmit = () => {
    if (demoInput.trim()) {
      sessionStorage.setItem('pendingDream', demoInput);
      navigate(user ? '/chat' : '/login');
    }
  };


  return (
    <div className="landing-page">
      {/* Floating Elements */}
      <div className="floating-elements">
        <div className="moon"></div>
        <div className="star" style={{ top: '20%', left: '10%' }}></div>
        <div className="star" style={{ top: '30%', left: '80%', animationDelay: '0.5s' }}></div>
        <div className="star" style={{ top: '50%', left: '5%', animationDelay: '1s' }}></div>
        <div className="star" style={{ top: '60%', left: '90%', animationDelay: '1.5s' }}></div>
        <div className="star" style={{ top: '80%', left: '20%', animationDelay: '2s' }}></div>
      </div>


      {/* Header */}
      <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
        <nav>
          <Link to="/" className="logo">
            <div className="logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#gradient)" strokeWidth="2">
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#667eea', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#764ba2', stopOpacity: 1 }} />
                  </linearGradient>
                </defs>
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            </div>
            Dream Interpreter
          </Link>


          <div className={`nav-links ${isMobileMenuOpen ? 'active' : ''}`}>
            <a href="#features" className="nav-link">Features</a>
            <Link to="/about" className="nav-link">About</Link>
            <Link to="/subscribe" className="nav-link">Subscribe</Link>
            <Link to="/contact" className="nav-link">Contact</Link>
          </div>


          <div className="auth-buttons">
            {user ? (
              <>
                <Link to="/chat" className="btn-login">Go to Chat</Link>
                <Link to="/chat" className="btn-signup">Dashboard</Link>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-login">Login</Link>
                <Link to="/login#signup" className="btn-signup">Sign Up</Link>
              </>
            )}
          </div>


          <button 
            className={`mobile-menu-btn ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </nav>
      </header>


      {/* Hero Section */}
      <main>
        <section className="hero">
          <h1>Unlock the Meaning of Your Dreams</h1>
          <p>Your dreams hold hidden messages. Chat with our AI dream guide to discover what they mean.</p>
          
          <div className="cta-buttons">
            <Link to={user ? '/chat' : '/login'} className="btn-primary">
              {user ? 'Continue to Chat' : 'Start Interpreting My Dream'}
            </Link>
            <a href="#features" className="btn-secondary">Learn More</a>
          </div>


          <div className="demo-input">
            <input 
              type="text" 
              placeholder="Type your dream here..." 
              value={demoInput}
              onChange={(e) => setDemoInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleDemoSubmit()}
            />
            <button onClick={handleDemoSubmit}>
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>


          <div className="scroll-indicator">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M7 13L12 18L17 13M7 6L12 11L17 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </section>


        {/* Features Section */}
        <section className="features" id="features">
          <div className="features-container">
            <h2>Discover Your Dream's Message</h2>
            <div className="feature-cards">
              <div className="feature-card">
                <div className="feature-icon">🌙</div>
                <h3>Personal Dream Insights</h3>
                <p>Get personalized interpretations based on your unique experiences and emotions. Our AI understands the context of your life.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⭐</div>
                <h3>Save & Revisit Your Dream Journal</h3>
                <p>Build your personal dream library. Track patterns, recurring themes, and watch your subconscious story unfold over time.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔓</div>
                <h3>3 Free Interpretations / Month</h3>
                <p>Start your journey with free monthly interpretations. Upgrade anytime for unlimited access to deeper insights.</p>
              </div>
            </div>
          </div>
        </section>
      </main>


      {/* Footer */}
      <footer>
        <div className="footer-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/disclaimer">Disclaimer</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div className="footer-copyright">
          © 2025 Dream Interpreter. All rights reserved.
        </div>
      </footer>
    </div>
  );
};


export default LandingPage;