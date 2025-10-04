import React from 'react';


interface SubscribeModalProps {
  onClose: () => void;
}


const SubscribeModal: React.FC<SubscribeModalProps> = ({ onClose }) => {
  const handleSubscribe = () => {
    // Implement subscription logic here
    window.location.href = '/subscribe';
  };


  return (
    <div className="modal active">
      <div className="modal-content">
        <h2>Unlock Unlimited Dreams</h2>
        <p>You've used your free interpretations this month. Subscribe for unlimited access!</p>
        <button className="modal-btn" onClick={handleSubscribe}>
          Subscribe for ₦2,000/month
        </button>
        <button className="modal-close" onClick={onClose}>
          Maybe later
        </button>
      </div>
    </div>
  );
};


export default SubscribeModal;