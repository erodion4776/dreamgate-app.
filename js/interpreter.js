/* =====================================
   DREAMGATE INTERPRETER JAVASCRIPT
   ===================================== */


'use strict';


// ===== GLOBAL VARIABLES =====
const DreamInterpreter = {
    // DOM Elements
    elements: {},
    
    // State
    state: {
        isRecording: false,
        isProcessing: false,
        currentDream: null,
        interpretationHistory: []
    },
    
    // Configuration
    config: {
        maxCharacters: 5000,
        minCharacters: 10,
        apiEndpoint: '/.netlify/functions/interpret-dream',
        storageKey: 'dreamHistory',
        maxHistoryItems: 50
    }
};


// ===== DOM ELEMENTS INITIALIZATION =====
function initializeElements() {
    DreamInterpreter.elements = {
        // Navigation
        navMenu: document.getElementById('nav-menu'),
        navToggle: document.getElementById('nav-toggle'),
        navClose: document.getElementById('nav-close'),
        navLinks: document.querySelectorAll('.nav__link'),
        header: document.getElementById('header'),
        
        // Form Elements
        dreamForm: document.getElementById('dream-form'),
        dreamInput: document.getElementById('dream-input'),
        charCurrent: document.getElementById('char-current'),
        voiceButton: document.getElementById('voice-button'),
        focusSelect: document.getElementById('focus-select'),
        categorySelect: document.getElementById('category-select'),
        submitButton: document.getElementById('submit-button'),
        
        // Output Elements
        outputPlaceholder: document.getElementById('output-placeholder'),
        loadingState: document.getElementById('loading-state'),
        resultsContainer: document.getElementById('results-container'),
        errorState: document.getElementById('error-state'),
        progressBar: document.getElementById('progress-bar'),
        
        // Result Sections
        coreInterpretation: document.getElementById('core-interpretation'),
        keySymbols: document.getElementById('key-symbols'),
        symbolTags: document.getElementById('symbol-tags'),
        emotionalSignificance: document.getElementById('emotional-significance'),
        guidanceActions: document.getElementById('guidance-actions'),
        personalReflection: document.getElementById('personal-reflection'),
        
        // Action Buttons
        saveButton: document.getElementById('save-button'),
        shareButton: document.getElementById('share-button'),
        newDreamButton: document.getElementById('new-dream-button'),
        retryButton: document.getElementById('retry-button'),
        
        // Other
        loginBtn: document.getElementById('login-btn'),
        signupBtn: document.getElementById('signup-btn'),
        scrollTop: document.getElementById('scroll-top'),
        errorMessage: document.getElementById('error-message')
    };
}


// ===== NAVIGATION FUNCTIONALITY =====
function initNavigation() {
    const { navToggle, navClose, navMenu, navLinks } = DreamInterpreter.elements;
    
    // Mobile menu toggle
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.add('show-menu');
        });
    }
    
    if (navClose) {
        navClose.addEventListener('click', () => {
            navMenu.classList.remove('show-menu');
        });
    }
    
    // Close menu when clicking nav links
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('show-menu');
        });
    });
    
    // Header shadow on scroll
    window.addEventListener('scroll', () => {
        const header = DreamInterpreter.elements.header;
        if (window.scrollY >= 80) {
            header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        } else {
            header.style.boxShadow = 'none';
        }
    });
}


// ===== CHARACTER COUNTER =====
function initCharacterCounter() {
    const { dreamInput, charCurrent } = DreamInterpreter.elements;
    
    if (dreamInput && charCurrent) {
        dreamInput.addEventListener('input', (e) => {
            const length = e.target.value.length;
            charCurrent.textContent = length;
            
            // Update counter color based on length
            if (length > 4500) {
                charCurrent.parentElement.classList.add('error');
                charCurrent.parentElement.classList.remove('warning');
            } else if (length > 4000) {
                charCurrent.parentElement.classList.add('warning');
                charCurrent.parentElement.classList.remove('error');
            } else {
                charCurrent.parentElement.classList.remove('warning', 'error');
            }
        });
    }
}


// ===== VOICE INPUT FUNCTIONALITY =====
function initVoiceInput() {
    const { voiceButton, dreamInput } = DreamInterpreter.elements;
    
    if (!voiceButton) return;
    
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        voiceButton.style.display = 'none';
        return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    let finalTranscript = '';
    
    voiceButton.addEventListener('click', () => {
        if (!DreamInterpreter.state.isRecording) {
            startRecording();
        } else {
            stopRecording();
        }
    });
    
    function startRecording() {
        DreamInterpreter.state.isRecording = true;
        voiceButton.classList.add('recording');
        voiceButton.innerHTML = '<i class="fas fa-stop"></i>';
        finalTranscript = dreamInput.value;
        recognition.start();
    }
    
    function stopRecording() {
        DreamInterpreter.state.isRecording = false;
        voiceButton.classList.remove('recording');
        voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
        recognition.stop();
    }
    
    recognition.onresult = (event) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        
        dreamInput.value = finalTranscript + interimTranscript;
        dreamInput.dispatchEvent(new Event('input'));
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopRecording();
        showNotification('Voice input error. Please try again.', 'error');
    };
    
    recognition.onend = () => {
        stopRecording();
    };
}


// ===== FORM SUBMISSION =====
function initFormSubmission() {
    const { dreamForm } = DreamInterpreter.elements;
    
    if (dreamForm) {
        dreamForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (DreamInterpreter.state.isProcessing) return;
            
            const dreamText = DreamInterpreter.elements.dreamInput.value.trim();
            const focusType = DreamInterpreter.elements.focusSelect.value;
            const category = DreamInterpreter.elements.categorySelect.value;
            
            // Validation
            if (dreamText.length < DreamInterpreter.config.minCharacters) {
                showNotification('Please describe your dream in more detail (at least 10 characters)', 'warning');
                return;
            }
            
            // Store current dream
            DreamInterpreter.state.currentDream = {
                text: dreamText,
                focusType,
                category,
                timestamp: new Date().toISOString()
            };
            
            // Process the dream
            await interpretDream(dreamText, focusType, category);
        });
    }
}


// ===== DREAM INTERPRETATION =====
async function interpretDream(dreamText, focusType, category) {
    const { submitButton, outputPlaceholder, loadingState, resultsContainer, errorState } = DreamInterpreter.elements;
    
    // Update UI state
    DreamInterpreter.state.isProcessing = true;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    
    // Hide all output states
    outputPlaceholder.style.display = 'none';
    resultsContainer.style.display = 'none';
    errorState.style.display = 'none';
    
    // Show loading
    loadingState.style.display = 'flex';
    
    // Reset progress bar
    const progressBar = DreamInterpreter.elements.progressBar;
    progressBar.style.animation = 'none';
    setTimeout(() => {
        progressBar.style.animation = 'progress 3s ease-in-out';
    }, 10);
    
    try {
        console.log('Sending interpretation request...');
        
        const response = await fetch(DreamInterpreter.config.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dream: dreamText,
                focusType: focusType,
                category: category
            })
        });
        
        console.log('Response status:', response.status);
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Invalid response format from server');
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || data.message || 'Failed to interpret dream');
        }
        
        // Display the interpretation
        displayInterpretation(data.interpretation);
        
        // Save to history
        saveToHistory(dreamText, data.interpretation);
        
        // Show success notification
        showNotification('Dream interpretation complete!', 'success');
        
    } catch (error) {
        console.error('Interpretation error:', error);
        displayError(error.message);
    } finally {
        // Reset UI state
        DreamInterpreter.state.isProcessing = false;
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-sparkles"></i> <span>Interpret My Dream</span>';
        loadingState.style.display = 'none';
    }
}


// ===== DISPLAY INTERPRETATION =====
function displayInterpretation(interpretation) {
    const { resultsContainer } = DreamInterpreter.elements;
    
    // Populate sections
    if (interpretation.core_interpretation) {
        DreamInterpreter.elements.coreInterpretation.textContent = interpretation.core_interpretation;
    }
    
    if (interpretation.key_symbols) {
        DreamInterpreter.elements.keySymbols.textContent = interpretation.key_symbols;
    }
    
    if (interpretation.emotional_significance) {
        DreamInterpreter.elements.emotionalSignificance.textContent = interpretation.emotional_significance;
    }
    
    if (interpretation.guidance_actions) {
        DreamInterpreter.elements.guidanceActions.textContent = interpretation.guidance_actions;
    }
    
    if (interpretation.personal_reflection) {
        const reflection = DreamInterpreter.elements.personalReflection;
        
        // If it's a string with questions separated by newlines or periods
        if (typeof interpretation.personal_reflection === 'string') {
            const questions = interpretation.personal_reflection
                .split(/[.?]/)
                .filter(q => q.trim().length > 0)
                .map(q => q.trim() + '?');
            
            reflection.innerHTML = questions
                .map(q => `<li>${q}</li>`)
                .join('');
            reflection.classList.add('reflection-questions');
        } else {
            reflection.textContent = interpretation.personal_reflection;
        }
    }
    
    // Display tags
    if (interpretation.tags && Array.isArray(interpretation.tags)) {
        const symbolTags = DreamInterpreter.elements.symbolTags;
        symbolTags.innerHTML = interpretation.tags
            .map(tag => `<span class="symbol-tag">${tag}</span>`)
            .join('');
    }
    
    // Show results
    resultsContainer.style.display = 'block';
    
    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// ===== DISPLAY ERROR =====
function displayError(message) {
    const { errorState, errorMessage } = DreamInterpreter.elements;
    
    errorMessage.textContent = message || 'An unexpected error occurred. Please try again.';
    errorState.style.display = 'flex';
}


// ===== SAVE TO HISTORY =====
function saveToHistory(dreamText, interpretation) {
    try {
        const history = JSON.parse(localStorage.getItem(DreamInterpreter.config.storageKey) || '[]');
        
        const entry = {
            id: Date.now(),
            date: new Date().toISOString(),
            dream: dreamText,
            interpretation: interpretation,
            focusType: DreamInterpreter.state.currentDream.focusType,
            category: DreamInterpreter.state.currentDream.category,
            timestamp: new Date().toLocaleString()
        };
        
        // Add to beginning
        history.unshift(entry);
        
        // Limit history size
        if (history.length > DreamInterpreter.config.maxHistoryItems) {
            history.pop();
        }
        
        localStorage.setItem(DreamInterpreter.config.storageKey, JSON.stringify(history));
        
        // Update state
        DreamInterpreter.state.interpretationHistory = history;
        
    } catch (error) {
        console.error('Error saving to history:', error);
    }
}


// ===== ACTION BUTTONS =====
function initActionButtons() {
    const { saveButton, shareButton, newDreamButton, retryButton } = DreamInterpreter.elements;
    
    // Save button
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            showNotification('Dream saved to your journal!', 'success');
            saveButton.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                saveButton.innerHTML = '<i class="fas fa-bookmark"></i>';
            }, 2000);
        });
    }
    
    // Share button
    if (shareButton) {
        shareButton.addEventListener('click', async () => {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'My Dream Interpretation',
                        text: 'Check out my dream interpretation from DreamGate!',
                        url: window.location.href
                    });
                } catch (error) {
                    console.log('Share cancelled or failed:', error);
                }
            } else {
                // Fallback - copy to clipboard
                copyToClipboard(window.location.href);
                showNotification('Link copied to clipboard!', 'success');
            }
        });
    }
    
    // New dream button
    if (newDreamButton) {
        newDreamButton.addEventListener('click', () => {
            resetForm();
            DreamInterpreter.elements.dreamInput.focus();
        });
    }
    
    // Retry button
    if (retryButton) {
               retryButton.addEventListener('click', () => {
            DreamInterpreter.elements.errorState.style.display = 'none';
            if (DreamInterpreter.state.currentDream) {
                interpretDream(
                    DreamInterpreter.state.currentDream.text,
                    DreamInterpreter.state.currentDream.focusType,
                    DreamInterpreter.state.currentDream.category
                );
            }
        });
    }
}


// ===== RESET FORM =====
function resetForm() {
    const { dreamForm, dreamInput, resultsContainer, outputPlaceholder } = DreamInterpreter.elements;
    
    // Reset form
    dreamForm.reset();
    
    // Reset character counter
    dreamInput.dispatchEvent(new Event('input'));
    
    // Hide results, show placeholder
    resultsContainer.style.display = 'none';
    outputPlaceholder.style.display = 'flex';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// ===== UTILITY FUNCTIONS =====


// Copy to clipboard
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}


// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    
    // Set icon based on type
    let icon = '';
    switch(type) {
        case 'success':
            icon = '<i class="fas fa-check-circle"></i>';
            break;
        case 'error':
            icon = '<i class="fas fa-exclamation-circle"></i>';
            break;
        case 'warning':
            icon = '<i class="fas fa-exclamation-triangle"></i>';
            break;
        default:
            icon = '<i class="fas fa-info-circle"></i>';
    }
    
    notification.innerHTML = `${icon}<span>${message}</span>`;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#4ade80' : 
                     type === 'error' ? '#ef4444' : 
                     type === 'warning' ? '#fbbf24' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        max-width: 90%;
        word-wrap: break-word;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after delay
    const duration = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, duration);
}


// ===== SCROLL TO TOP =====
function initScrollToTop() {
    const scrollTop = DreamInterpreter.elements.scrollTop;
    
    if (scrollTop) {
        // Show/hide based on scroll position
        window.addEventListener('scroll', () => {
            if (window.scrollY >= 560) {
                scrollTop.classList.add('show-scroll');
            } else {
                scrollTop.classList.remove('show-scroll');
            }
        });
        
        // Scroll to top when clicked
        scrollTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}


// ===== AUTH BUTTONS =====
function initAuthButtons() {
    const { loginBtn, signupBtn } = DreamInterpreter.elements;
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }
    
    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            window.location.href = 'signup.html';
        });
    }
}


// ===== LOAD PENDING DREAM =====
function loadPendingDream() {
    // Check if there's a pending dream from the homepage
    const pendingDream = localStorage.getItem('pendingDream');
    
    if (pendingDream && DreamInterpreter.elements.dreamInput) {
        DreamInterpreter.elements.dreamInput.value = pendingDream;
        DreamInterpreter.elements.dreamInput.dispatchEvent(new Event('input'));
        localStorage.removeItem('pendingDream');
        
        // Auto-focus and show notification
        DreamInterpreter.elements.dreamInput.focus();
        showNotification('Your dream has been loaded. Click interpret when ready!', 'info');
    }
}


// ===== LOAD HISTORY =====
function loadHistory() {
    try {
        const history = JSON.parse(localStorage.getItem(DreamInterpreter.config.storageKey) || '[]');
        DreamInterpreter.state.interpretationHistory = history;
    } catch (error) {
        console.error('Error loading history:', error);
        DreamInterpreter.state.interpretationHistory = [];
    }
}


// ===== KEYBOARD SHORTCUTS =====
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to submit
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const dreamForm = DreamInterpreter.elements.dreamForm;
            if (dreamForm && !DreamInterpreter.state.isProcessing) {
                dreamForm.dispatchEvent(new Event('submit'));
            }
        }
        
        // Escape to close mobile menu
        if (e.key === 'Escape') {
            const navMenu = DreamInterpreter.elements.navMenu;
            if (navMenu && navMenu.classList.contains('show-menu')) {
                navMenu.classList.remove('show-menu');
            }
        }
    });
}


// ===== ANIMATIONS =====
function initAnimations() {
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .notification {
            animation: slideInRight 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}


// ===== DEBUG MODE =====
function initDebugMode() {
    // Check for debug parameter
    const urlParams = new URLSearchParams(window.location.search);
    const debug = urlParams.get('debug');
    
    if (debug === 'true') {
        console.log('🔧 Debug mode enabled');
        
        // Add debug panel
        const debugPanel = document.createElement('div');
        debugPanel.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-size: 12px;
            font-family: monospace;
            z-index: 9999;
            max-width: 300px;
        `;
        
        debugPanel.innerHTML = `
            <h4 style="margin: 0 0 10px 0;">Debug Info</h4>
            <p>State: <span id="debug-state">Ready</span></p>
            <p>History Items: <span id="debug-history">${DreamInterpreter.state.interpretationHistory.length}</span></p>
            <p>API: ${DreamInterpreter.config.apiEndpoint}</p>
            <button onclick="localStorage.clear(); location.reload();" style="margin-top: 10px;">Clear Storage</button>
        `;
        
        document.body.appendChild(debugPanel);
        
        // Update debug info
        window.updateDebugState = (state) => {
            const debugState = document.getElementById('debug-state');
            if (debugState) debugState.textContent = state;
        };
    }
}


// ===== INITIALIZATION =====
function init() {
    console.log('🌙 DreamGate Interpreter initializing...');
    
    // Initialize elements
    initializeElements();
    
    // Initialize all features
    initNavigation();
    initCharacterCounter();
    initVoiceInput();
    initFormSubmission();
    initActionButtons();
    initScrollToTop();
    initAuthButtons();
    initKeyboardShortcuts();
    initAnimations();
    
    // Load data
    loadHistory();
    loadPendingDream();
    
    // Initialize debug mode
    initDebugMode();
    
    console.log('✨ DreamGate Interpreter ready!');
}


// ===== DOM READY =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}


// ===== EXPORT FOR TESTING =====
window.DreamInterpreter = DreamInterpreter;