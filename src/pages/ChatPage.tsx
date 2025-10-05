import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatView from '../components/ChatView';
import SubscribeModal from '../components/SubscribeModal';
import { dreamService, userService } from '../services/supabase';
import { Dream, Message, UserInterpretationData } from '../types';
import '../styles/chat.css';


const ChatPage: React.FC = () => {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [currentDream, setCurrentDream] = useState<Dream | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [interpretationData, setInterpretationData] = useState<UserInterpretationData>({
    is_subscribed: false,
    remaining: 3,
    total_used: 0
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { user, signOut } = useAuth();
  const navigate = useNavigate();


  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    initializeChat();
  }, [user, navigate]);


  const initializeChat = async () => {
    if (!user) return;
    
    try {
      await Promise.all([
        loadDreams(),
        loadInterpretationData()
      ]);
      
      // Check for pending dream from homepage
      const pendingDream = sessionStorage.getItem('pendingDream');
      if (pendingDream) {
        sessionStorage.removeItem('pendingDream');
        // Auto-submit the pending dream
        setTimeout(() => {
          const event = new CustomEvent('submitPendingDream', { detail: pendingDream });
          window.dispatchEvent(event);
        }, 500);
      } else {
        startNewChat();
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  };


  const loadDreams = async () => {
    if (!user) return;
    
    try {
      const userDreams = await dreamService.getDreams(user.id);
      setDreams(userDreams || []);
    } catch (error) {
      console.error('Error loading dreams:', error);
    }
  };


  const loadInterpretationData = async () => {
    if (!user) return;
    
    try {
      const data = await userService.getUserInterpretationData(user.id);
      setInterpretationData(data);
    } catch (error) {
      console.error('Error loading interpretation data:', error);
    }
  };


  const loadDream = async (dreamId: string) => {
    try {
      const dream = dreams.find(d => d.id === dreamId);
      if (!dream) return;
      
      setCurrentDream(dream);
      const dreamMessages = await dreamService.getMessages(dreamId);
      setMessages(dreamMessages || []);
      setIsSidebarOpen(false);
    } catch (error) {
      console.error('Error loading dream:', error);
    }
  };


  const deleteDream = async (dreamId: string) => {
    if (!confirm('Delete this dream conversation?')) return;
    
    try {
      await dreamService.deleteDream(dreamId);
      if (currentDream?.id === dreamId) {
        startNewChat();
      }
      await loadDreams();
    } catch (error) {
      console.error('Error deleting dream:', error);
    }
  };


  const startNewChat = () => {
    setCurrentDream(null);
    setMessages([{
      dream_id: '',
      sender: 'ai',
      content: "Welcome! Share your dream with me, and I'll help you understand its meaning... 🌙"
    }]);
    setIsSidebarOpen(false);
  };


  const handleNewMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };


  const handleNewDream = (dream: Dream) => {
    setCurrentDream(dream);
    loadDreams();
    loadInterpretationData();
  };


  const handleLimitReached = () => {
    setShowSubscribeModal(true);
  };


  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }


  return (
    <div className="chat-page">
      {/* Mobile Header */}
      <header className="mobile-header">
        <button 
          className="hamburger-menu" 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div className="mobile-header-title">
          🌙 Dream Chat
        </div>
        <div className="mobile-header-counter">
          {interpretationData.is_subscribed ? 'Unlimited' : `${interpretationData.remaining} free left`}
        </div>
      </header>


      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />


      {/* Sidebar */}
      <Sidebar
        dreams={dreams}
        currentDreamId={currentDream?.id}
        userEmail={user?.email || ''}
        isOpen={isSidebarOpen}
        onNewChat={startNewChat}
        onSelectDream={loadDream}
        onDeleteDream={deleteDream}
        onSignOut={signOut}
      />


      {/* Main Chat Area */}
      <main className="main-content">
        <ChatView
          messages={messages}
          currentDream={currentDream}
          user={user}
          interpretationData={interpretationData}
          onNewMessage={handleNewMessage}
          onNewDream={handleNewDream}
          onLimitReached={handleLimitReached}
        />
      </main>


      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        <a href="/" className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
          <span>Home</span>
        </a>
        <button className="nav-item active" onClick={startNewChat}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          <span>New</span>
        </button>
        <button className="nav-item" onClick={() => setIsSidebarOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span>Journal</span>
        </button>
        <a href="/subscribe" className="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <span>Subscribe</span>
        </a>
      </nav>


      {/* Subscribe Modal */}
      {showSubscribeModal && (
        <SubscribeModal onClose={() => setShowSubscribeModal(false)} />
      )}
    </div>
  );
};


export default ChatPage;