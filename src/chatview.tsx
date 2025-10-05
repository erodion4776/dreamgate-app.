import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { dreamInterpreterService } from '../services/dreamInterpreterService';
import { dreamService } from '../services/supabase';
import { Dream, Message, User, UserInterpretationData } from '../types';


interface ChatViewProps {
  messages: Message[];
  currentDream: Dream | null;
  user: User | null;
  interpretationData: UserInterpretationData;
  onNewMessage: (message: Message) => void;
  onNewDream: (dream: Dream) => void;
  onLimitReached: () => void;
}


const ChatView: React.FC<ChatViewProps> = ({
  messages,
  currentDream,
  user,
  interpretationData,
  onNewMessage,
  onNewDream,
  onLimitReached
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  useEffect(() => {
    // Listen for pending dream from homepage
    const handlePendingDream = (event: CustomEvent) => {
      setInput(event.detail);
      setTimeout(() => handleSubmit(event.detail), 100);
    };
    
    window.addEventListener('submitPendingDream' as any, handlePendingDream as any);
    return () => {
      window.removeEventListener('submitPendingDream' as any, handlePendingDream as any);
    };
  }, []);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };


  const handleSubmit = async (dreamText?: string) => {
    const text = dreamText || input.trim();
    if (!text || !user) return;


    setInput('');
    setIsLoading(true);


    // Add user message
    const userMessage: Message = {
      dream_id: currentDream?.id || '',
      sender: 'user',
      content: text
    };
    onNewMessage(userMessage);


    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');


      const response = await dreamInterpreterService.interpretDream(
        text,
        session.access_token,
        currentDream?.id,
        !!currentDream
      );


      // Add AI response
      const aiMessage: Message = {
        dream_id: response.dream_id || currentDream?.id || '',
        sender: 'ai',
        content: response.reply
      };
      onNewMessage(aiMessage);


      // If this created a new dream, update the current dream
      if (response.dream_id && !currentDream) {
        const title = text.length > 50 ? text.substring(0, 47) + '...' : text;
        const newDream: Dream = {
          id: response.dream_id,
          user_id: user.id,
          title,
          content: text,
          interpretation: response.reply,
          created_at: new Date().toISOString()
        };
        onNewDream(newDream);
      }


      // Save messages if we have a dream
      if (currentDream?.id || response.dream_id) {
        const dreamId = currentDream?.id || response.dream_id!;
        await dreamService.addMessage(dreamId, 'user', text);
        await dreamService.addMessage(dreamId, 'ai', response.reply);
      }


    } catch (error: any) {
      if (error.message === 'LIMIT_REACHED') {
        onLimitReached();
      } else {
        const errorMessage: Message = {
          dream_id: currentDream?.id || '',
          sender: 'ai',
          content: 'Sorry, there was an error. Please try again.'
        };
        onNewMessage(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
  };


  const formatMessage = (content: string, sender: 'user' | 'ai') => {
    if (sender === 'ai') {
      return (
        <div 
          dangerouslySetInnerHTML={{ 
            __html: dreamInterpreterService.formatAIResponse(content) 
          }} 
        />
      );
    }
    return content;
  };


  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.sender}`}>
            <div className="message-bubble">
              {formatMessage(message.content, message.sender)}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message ai">
            <div className="loading">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        )}
        
        {currentDream && !isLoading && (
          <div className="continue-notice">
            💬 You can continue this conversation. Ask follow-up questions or share more details!
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>


      <div className="input-container">
        <form 
          className="input-form" 
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <textarea
            ref={textareaRef}
            className="dream-input"
            placeholder={currentDream ? "Continue the conversation..." : "Describe your dream..."}
            value={input}
            onChange={handleInputChange}
            rows={1}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="send-btn"
            disabled={isLoading || !input.trim()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};


export default ChatView;