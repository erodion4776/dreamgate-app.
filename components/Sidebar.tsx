import React from 'react';
import { Dream } from '../types';


interface SidebarProps {
  dreams: Dream[];
  currentDreamId?: string;
  userEmail: string;
  isOpen: boolean;
  onNewChat: () => void;
  onSelectDream: (dreamId: string) => void;
  onDeleteDream: (dreamId: string) => void;
  onSignOut: () => void;
}


const Sidebar: React.FC<SidebarProps> = ({
  dreams,
  currentDreamId,
  userEmail,
  isOpen,
  onNewChat,
  onSelectDream,
  onDeleteDream,
  onSignOut
}) => {
  return (
    <aside className={`sidebar ${isOpen ? 'active' : ''}`}>
      <div className="sidebar-header">
        <h2 className="sidebar-title">
          🌙 Dream Interpreter
        </h2>
      </div>


      <button className="new-interpretation-btn" onClick={onNewChat}>
        ✨ New Interpretation
      </button>


      <div className="sidebar-scrollable">
        <h3 className="dreams-list-title">My Dreams</h3>
        <div className="dreams-list">
          {dreams.length === 0 ? (
            <div className="no-dreams">
              No saved dreams yet.<br/>
              Start by sharing your first dream!
            </div>
          ) : (
            dreams.map(dream => (
              <div
                key={dream.id}
                className={`dream-item ${currentDreamId === dream.id ? 'active' : ''}`}
                onClick={() => onSelectDream(dream.id)}
              >
                <span>{dream.title || 'Untitled Dream'}</span>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDream(dream.id);
                  }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>


      <div className="user-section">
        <div className="user-email">{userEmail}</div>
        <button className="logout-btn" onClick={onSignOut}>
          🚪 Sign Out
        </button>
      </div>
    </aside>
  );
};


export default Sidebar;