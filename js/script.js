/* =====================================
   DREAMGATE JAVASCRIPT - MAIN
   ===================================== */


'use strict';


// ===== GLOBAL VARIABLES =====
const doc = document;
const win = window;


// ===== DOM ELEMENTS =====
const elements = {
    // Navigation
    navMenu: doc.getElementById('nav-menu'),
    navToggle: doc.getElementById('nav-toggle'),
    navClose: doc.getElementById('nav-close'),
    navLinks: doc.querySelectorAll('.nav__link'),
    header: doc.getElementById('header'),
    
    // Hero Section
    dreamInput: doc.getElementById('dream-input'),
    charCount: doc.getElementById('current-chars'),
    interpretBtn: doc.getElementById('interpret-btn'),
    voiceBtn: doc.getElementById('voice-input'),
    
    // Stats
    statNumbers: doc.querySelectorAll('.stat__number'),
    
    // Testimonials
    testimonials: doc.querySelectorAll('.testimonial'),
    testimonialDots: doc.querySelectorAll('.dot'),
    
    // Buttons
    loginBtn: doc.getElementById('login-btn'),
    signupBtn: doc.getElementById('signup-btn'),
    watchDemoBtn: doc.getElementById('watch-demo'),
    newsletterForm: doc.getElementById('newsletter-form'),
    scrollTop: doc.getElementById('scroll-top')
};


// ===== MOBILE MENU FUNCTIONALITY =====
function initMobileMenu() {
    // Show menu
    if (elements.navToggle) {
        elements.navToggle.addEventListener('click', () => {
            elements.navMenu.classList.add('show-menu');
        });
    }
    
    // Hide menu
    if (elements.navClose) {
        elements.navClose.addEventListener('click', () => {
            elements.navMenu.classList.remove('show-menu');
        });
    }
    
    // Hide menu when clicking nav links
    elements.navLinks.forEach(link => {
        link.addEventListener('click', () => {
            elements.navMenu.classList.remove('show-menu');
        });
    });
}


// ===== ACTIVE LINK ON SCROLL =====
function initActiveLink() {
    const sections = doc.querySelectorAll('section[id]');
    
    function scrollActive() {
        const scrollY = win.pageYOffset;
        
        sections.forEach(current => {
            const sectionHeight = current.offsetHeight;
            const sectionTop = current.offsetTop - 100;
            const sectionId = current.getAttribute('id');
            const link = doc.querySelector(`.nav__link[href*="${sectionId}"]`);
            
            if (link) {
                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            }
        });
    }
    
    win.addEventListener('scroll', scrollActive);
}


// ===== HEADER SHADOW ON SCROLL =====
function initHeaderScroll() {
    function scrollHeader() {
        if (win.scrollY >= 80) {
            elements.header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        } else {
            elements.header.style.boxShadow = 'none';
        }
    }
    
    win.addEventListener('scroll', scrollHeader);
}


// ===== CHARACTER COUNTER =====
function initCharCounter() {
    if (elements.dreamInput && elements.charCount) {
        elements.dreamInput.addEventListener('input', (e) => {
            const currentLength = e.target.value.length;
            elements.charCount.textContent = currentLength;
            
            // Change color when approaching limit
            if (currentLength > 4500) {
                elements.charCount.style.color = '#ef4444';
            } else {
                elements.charCount.style.color = '#c7c7c7';
            }
        });
    }
}


// ===== ANIMATED NUMBER COUNTER =====
function animateNumbers() {
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px'
    };
    
    const startCounting = (entry) => {
        const element = entry.target;
        const target = parseFloat(element.getAttribute('data-target'));
        const duration = 2000; // 2 seconds
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;
        
        const updateNumber = () => {
            current += increment;
            
            if (current >= target) {
                current = target;
                
                // Format based on the type of number
                if (element.textContent.includes('.')) {
                    element.textContent = target.toFixed(1);
                } else if (target >= 1000) {
                    element.textContent = Math.floor(target).toLocaleString() + '+';
                } else {
                    element.textContent = Math.floor(target) + '+';
                }
            } else {
                if (element.textContent.includes('.')) {
                    element.textContent = current.toFixed(1);
                } else {
                    element.textContent = Math.floor(current).toLocaleString();
                }
                requestAnimationFrame(updateNumber);
            }
        };
        
        updateNumber();
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                startCounting(entry);
                entry.target.classList.add('counted');
            }
        });
    }, observerOptions);
    
    elements.statNumbers.forEach(stat => {
        observer.observe(stat);
    });
}


// ===== TESTIMONIALS SLIDER =====
function initTestimonials() {
    let currentTestimonial = 0;
    const testimonials = Array.from(elements.testimonials);
    const dots = Array.from(elements.testimonialDots);
    
    if (testimonials.length === 0) return;
    
    function showTestimonial(index) {
        // Hide all testimonials
        testimonials.forEach(t => t.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        
        // Show selected testimonial
        testimonials[index].classList.add('active');
        dots[index].classList.add('active');
        
        currentTestimonial = index;
    }
    
    // Dot navigation
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showTestimonial(index);
        });
    });
    
    // Auto-rotate testimonials
    setInterval(() => {
        const nextIndex = (currentTestimonial + 1) % testimonials.length;
        showTestimonial(nextIndex);
    }, 5000); // Change every 5 seconds
}


// ===== DREAM INTERPRETATION =====
function initDreamInterpretation() {
    if (elements.interpretBtn) {
        elements.interpretBtn.addEventListener('click', () => {
            const dreamText = elements.dreamInput.value.trim();
            
            if (dreamText.length < 10) {
                showNotification('Please describe your dream in more detail (at least 10 characters)', 'warning');
                return;
            }
            
            // Store dream in localStorage
            localStorage.setItem('pendingDream', dreamText);
            localStorage.setItem('dreamTimestamp', new Date().toISOString());
            
            // Redirect to interpreter page
            window.location.href = 'interpreter.html';
        });
    }
}


// ===== VOICE INPUT =====
function initVoiceInput() {
    if (elements.voiceBtn) {
        // Check if browser supports speech recognition
        const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            
            let isRecording = false;
            
            elements.voiceBtn.addEventListener('click', () => {
                if (!isRecording) {
                    recognition.start();
                    elements.voiceBtn.style.color = '#ef4444';
                    elements.voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
                    isRecording = true;
                } else {
                    recognition.stop();
                    elements.voiceBtn.style.color = '';
                    elements.voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                    isRecording = false;
                }
            });
            
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                elements.dreamInput.value += transcript + ' ';
                
                // Update character count
                const charEvent = new Event('input');
                elements.dreamInput.dispatchEvent(charEvent);
            };
            
            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                showNotification('Voice input error. Please try again.', 'error');
                
                elements.voiceBtn.style.color = '';
                elements.voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                isRecording = false;
            };
            
            recognition.onend = () => {
                elements.voiceBtn.style.color = '';
                elements.voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                isRecording = false;
            };
        } else {
            elements.voiceBtn.style.display = 'none';
        }
    }
}


// ===== NEWSLETTER SUBSCRIPTION =====
function initNewsletter() {
    if (elements.newsletterForm) {
        elements.newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const emailInput = e.target.querySelector('input[type="email"]');
            const email = emailInput.value.trim();
            
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            // Simulate subscription (in production, this would call an API)
            localStorage.setItem('newsletterEmail', email);
            
            // Show success message
            showNotification('Successfully subscribed to newsletter!', 'success');
            
            // Reset form
            emailInput.value = '';
        });
    }
}


// ===== AUTH BUTTONS =====
function initAuthButtons() {
    if (elements.loginBtn) {
        elements.loginBtn.addEventListener('click', () => {
            // Check if login page exists
            checkPageAndNavigate('login.html');
        });
    }
    
    if (elements.signupBtn) {
        elements.signupBtn.addEventListener('click', () => {
            // Check if signup page exists
            checkPageAndNavigate('signup.html');
        });
    }
}


// ===== WATCH DEMO =====
function initWatchDemo() {
    if (elements.watchDemoBtn) {
        elements.watchDemoBtn.addEventListener('click', () => {
            // In production, this would open a video modal
            showNotification('Demo video coming soon!', 'info');
        });
    }
}


// ===== SCROLL TO TOP =====
function initScrollTop() {
    if (elements.scrollTop) {
        // Show/hide scroll to top button
        win.addEventListener('scroll', () => {
            if (win.scrollY >= 560) {
                elements.scrollTop.classList.add('show-scroll');
            } else {
                elements.scrollTop.classList.remove('show-scroll');
            }
        });
        
        // Scroll to top when clicked
        elements.scrollTop.addEventListener('click', () => {
            win.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}


// ===== NOTIFICATION SYSTEM =====
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = doc.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = doc.createElement('div');
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
    
    notification.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;
    
    // Add to page
    doc.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}


// ===== LOCAL STORAGE UTILITIES =====
const storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            return false;
        }
    },
    
    get: (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.error('Storage error:', e);
            return null;
        }
    },
    
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            return false;
        }
    },
    
    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            return false;
        }
    }
};


// ===== PAGE NAVIGATION HELPER =====
function checkPageAndNavigate(page) {
    // List of pages that might not exist yet
    const placeholderPages = [
        'community.html',
        'about.html',
        'careers.html',
        'press.html',
        'help.html',
        'faq.html',
        'privacy.html',
        'terms.html',
        'cookies.html',
        'login.html',
        'signup.html'
    ];
    
    if (placeholderPages.includes(page)) {
        const pageName = page.replace('.html', '').replace('-', ' ');
        showNotification(`The ${pageName} page is coming soon!`, 'info');
    } else {
        window.location.href = page;
    }
}


// ===== HANDLE MISSING PAGES =====
function handleMissingPages() {
    // List of pages that might not exist yet
    const placeholderPages = [
        'community.html',
        'about.html',
        'careers.html',
        'press.html',
        'help.html',
        'faq.html',
        'privacy.html',
        'terms.html',
        'cookies.html',
        'login.html',
        'signup.html'
    ];
    
    // Add event listeners to links
    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href');
        if (placeholderPages.includes(href)) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageName = href.replace('.html', '').replace('-', ' ');
                showNotification(`The ${pageName} page is coming soon!`, 'info');
            });
        }
    });
}


// ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
function initSmoothScroll() {
    doc.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            
            // Skip if it's just "#"
            if (href === '#') return;
            
            e.preventDefault();
            const target = doc.querySelector(href);
            
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + win.pageYOffset - headerOffset;
                
                win.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}


// ===== LAZY LOADING IMAGES =====
function initLazyLoading() {
    const images = doc.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback for older browsers
        images.forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }
}


// ===== FORM VALIDATION =====
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}


function validateForm(formElement) {
    const inputs = formElement.querySelectorAll('input[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('error');
            isValid = false;
        } else {
            input.classList.remove('error');
        }
        
        if (input.type === 'email' && !validateEmail(input.value)) {
            input.classList.add('error');
            isValid = false;
        }
    });
    
    return isValid;
}


// ===== KEYBOARD NAVIGATION =====
function initKeyboardNav() {
    doc.addEventListener('keydown', (e) => {
        // ESC key closes mobile menu
        if (e.key === 'Escape' && elements.navMenu.classList.contains('show-menu')) {
            elements.navMenu.classList.remove('show-menu');
        }
        
        // Ctrl/Cmd + K focuses search/dream input
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (elements.dreamInput) {
                elements.dreamInput.focus();
            }
        }
    });
}


// ===== PERFORMANCE MONITORING =====
function monitorPerformance() {
    if ('performance' in window && 'measure' in window.performance) {
        window.addEventListener('load', () => {
            const perfData = performance.getEntriesByType('navigation')[0];
            
            if (perfData) {
                console.log('Page Load Metrics:', {
                    'DOM Content Loaded': Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart) + 'ms',
                    'Page Load Time': Math.round(perfData.loadEventEnd - perfData.loadEventStart) + 'ms',
                    'Total Load Time': Math.round(perfData.loadEventEnd - perfData.fetchStart) + 'ms'
                });
            }
        });
    }
}


// ===== ANIMATION UTILITIES =====
function animateOnScroll() {
    const animatedElements = doc.querySelectorAll('[data-animate]');
    
    if ('IntersectionObserver' in window) {
        const animationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const animation = element.dataset.animate;
                    element.classList.add('animated', animation);
                    animationObserver.unobserve(element);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        animatedElements.forEach(el => animationObserver.observe(el));
    }
}


// ===== THEME MANAGEMENT =====
const theme = {
    init: function() {
        const savedTheme = storage.get('theme') || 'dark';
        this.apply(savedTheme);
    },
    
    apply: function(themeName) {
        doc.documentElement.setAttribute('data-theme', themeName);
        storage.set('theme', themeName);
    },
    
    toggle: function() {
        const currentTheme = doc.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.apply(newTheme);
    }
};


// ===== INITIALIZATION =====
function init() {
    // Core functionality
    initMobileMenu();
    initActiveLink();
    initHeaderScroll();
    initScrollTop();
    initSmoothScroll();
    
    // Homepage specific
    initCharCounter();
    animateNumbers();
    initTestimonials();
    initDreamInterpretation();
    initVoiceInput();
    
    // Forms
    initNewsletter();
    initAuthButtons();
    initWatchDemo();
    
    // Enhancements
    initLazyLoading();
    initKeyboardNav();
    animateOnScroll();
    handleMissingPages();
    theme.init();
    
    // Development only
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        monitorPerformance();
    }
}


// ===== DOM READY =====
if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
} else {
    init();
}


// ===== EXPORT FOR OTHER MODULES =====
window.DreamGate = {
    storage,
    theme,
    showNotification,
    validateForm,
    validateEmail
};


console.log('DreamGate initialized successfully! 🌙');