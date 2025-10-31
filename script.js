// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initMobileNavigation();
    initSmoothScrolling();
    initActiveNavigation();
    initFormHandling();
    initFormStepper();
    initPhoneMask();
    initScrollAnimations();
    initButtonInteractions();
    initNavbarScroll();
    initServiceCards();
    initServicesMultiselect();
    initMegaMenu();
    initScrollProgress();
    initMobileStickyCta();
    initMenuSheet();
    initReviewsRotator();
    initGoalPlanner();
    initDiCalculator();
});

// Mobile Navigation Toggle
function initMobileNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    const backdrop = document.querySelector('.nav-backdrop');

    if (hamburger && navMenu) {
        let releaseFocusTrap = null;

        const openMenu = () => {
            hamburger.classList.add('active');
            navMenu.classList.add('active');
            document.body.classList.add('menu-open');
            if (backdrop) backdrop.hidden = false;
            releaseFocusTrap = trapFocus(navMenu);
        };
        const closeMenu = () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
            if (backdrop) backdrop.hidden = true;
            if (releaseFocusTrap) releaseFocusTrap();
        };

        hamburger.addEventListener('click', () => {
            const isOpen = navMenu.classList.contains('active');
            isOpen ? closeMenu() : openMenu();
        });

        // Close menu when clicking on nav links
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                closeMenu();
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) closeMenu();
        });

        // Close via Esc
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMenu();
        });

        // Backdrop click
        if (backdrop) backdrop.addEventListener('click', closeMenu);
    }
}

// Smooth Scrolling for Navigation Links
function initSmoothScrolling() {
    const navLinks = document.querySelectorAll('a[href^="#"]');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetSection.offsetTop - navbarHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Active Navigation Highlighting
function initActiveNavigation() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    if (!sections.length || !navLinks.length) return;

    const navbar = document.querySelector('.navbar');
    const topOffset = (navbar?.offsetHeight || 70) + 10;

    const byId = new Map();
                navLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        if (href.startsWith('#')) byId.set(href.slice(1), link);
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const id = entry.target.getAttribute('id');
            if (!id) return;
            if (entry.isIntersecting) {
                navLinks.forEach(l => l.classList.remove('active'));
                const link = byId.get(id);
                if (link) link.classList.add('active');
            }
        });
    }, {
        root: null,
        rootMargin: `-${topOffset}px 0px -60% 0px`,
        threshold: 0.3
    });

    sections.forEach(sec => observer.observe(sec));
}

// Form Handling and Validation
function initFormHandling() {
    const quoteForm = document.querySelector('.quote-form');

    if (quoteForm) {
        // Error summary element
        const errorSummary = document.getElementById('mcf-error-summary');

        // Add real-time validation
        const inputs = quoteForm.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', validateField);
            input.addEventListener('input', clearFieldError);
            input.addEventListener('invalid', (e) => {
                e.preventDefault();
                validateField({ target: input });
            });
        });

        quoteForm.addEventListener('submit', function(e) {
            e.preventDefault();

            if (validateForm(this)) {
                if (errorSummary) {
                    errorSummary.hidden = true;
                    errorSummary.innerHTML = '';
                }
                // Honeypot check
                const honeypot = this.querySelector('#website');
                if (honeypot && honeypot.value) {
                    // Silently block
                    return;
                }
                submitForm(this);
            }
            else {
                // Build and show error summary
                if (errorSummary) {
                    const messages = collectFormErrors(this);
                    if (messages.length) {
                        const list = document.createElement('ul');
                        list.style.margin = '0';
                        list.style.paddingLeft = '1.25rem';
                        messages.forEach(({ id, message, label }) => {
                            const li = document.createElement('li');
                            const a = document.createElement('a');
                            a.href = `#${id}`;
                            a.textContent = label ? `${label}: ${message}` : message;
                            a.addEventListener('click', (evt) => {
                                evt.preventDefault();
                                const field = document.getElementById(id);
                                field?.focus();
                            });
                            li.appendChild(a);
                            list.appendChild(li);
                        });
                        errorSummary.innerHTML = '';
                        const heading = document.createElement('div');
                        heading.textContent = 'Please fix the following:';
                        heading.style.fontWeight = '600';
                        heading.style.marginBottom = '0.5rem';
                        errorSummary.appendChild(heading);
                        errorSummary.appendChild(list);
                        errorSummary.hidden = false;
                        errorSummary.focus();
                        errorSummary.style.background = '#fef2f2';
                        errorSummary.style.border = '1px solid #fecaca';
                        errorSummary.style.color = '#991b1b';
                        errorSummary.style.padding = '0.75rem 1rem';
                        errorSummary.style.borderRadius = '0.5rem';
                        errorSummary.style.margin = '0 0 1rem 0';
                    }
                }
            }
        });
    }
}

// Stepper: handles next/back, progress, and accessible announcements
function initFormStepper() {
    const form = document.querySelector('.modern-contact-form');
    if (!form) return;

    const stepsContainer = form.querySelector('.mcf-steps');
    const steps = Array.from(form.querySelectorAll('.mcf-step'));
    const progress = form.querySelector('.mcf-progress');
    const progressBar = form.querySelector('.mcf-progress-bar');
    const announcer = form.querySelector('#mcf-announcer');

    const setStep = (index) => {
        steps.forEach((step, i) => {
            const isActive = i === index;
            step.classList.toggle('active', isActive);
            step.toggleAttribute('hidden', !isActive);
        });

        const percent = Math.round(((index + 1) / steps.length) * 100);
        if (progressBar) progressBar.style.width = percent + '%';
        if (progress) progress.setAttribute('aria-valuenow', String(percent));
        if (announcer) announcer.textContent = `Step ${index + 1} of ${steps.length}`;
        stepsContainer?.setAttribute('data-current', String(index + 1));
    };

    const validateCurrent = (index) => {
        const current = steps[index];
        if (!current) return true;
        const inputs = current.querySelectorAll('input, textarea, select');
        let valid = true;
        inputs.forEach((el) => {
            if (!validateField({ target: el })) valid = false;
        });
        return valid;
    };

    let currentIndex = 0;
    setStep(currentIndex);

    form.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('mcf-next')) {
            e.preventDefault();
            if (!validateCurrent(currentIndex)) return;
            currentIndex = Math.min(currentIndex + 1, steps.length - 1);
            setStep(currentIndex);
            const firstFocusable = steps[currentIndex].querySelector('input, textarea, select, button');
            firstFocusable?.focus();
        }
        if (target.classList.contains('mcf-back')) {
            e.preventDefault();
            currentIndex = Math.max(currentIndex - 1, 0);
            setStep(currentIndex);
            const firstFocusable = steps[currentIndex].querySelector('input, textarea, select, button');
            firstFocusable?.focus();
        }
    });

    // Disable Next/Submit until current step valid
    const updateNavDisabled = () => {
        const isStepValid = validateCurrent(currentIndex);
        const nextBtn = form.querySelector('.mcf-step.active .mcf-next');
        const submitBtn = form.querySelector('.mcf-step.active .mcf-submit');
        if (nextBtn) {
            nextBtn.disabled = !isStepValid;
            nextBtn.setAttribute('aria-disabled', String(!isStepValid));
        }
        if (submitBtn) {
            submitBtn.disabled = !isStepValid;
            submitBtn.setAttribute('aria-disabled', String(!isStepValid));
        }
    };

    form.addEventListener('input', updateNavDisabled, true);
    form.addEventListener('blur', updateNavDisabled, true);
    updateNavDisabled();

    // Enter key advances to next if valid, except in textarea
    form.addEventListener('keydown', (e) => {
        const target = e.target;
        if (e.key === 'Enter' && target.tagName !== 'TEXTAREA') {
            const isValid = validateCurrent(currentIndex);
            if (!isValid) return;
            e.preventDefault();
            if (currentIndex < steps.length - 1) {
                currentIndex++;
                setStep(currentIndex);
            } else {
                const submit = form.querySelector('.mcf-submit');
                submit?.click();
            }
        }
    });
}

// Live US phone input mask: formats as (XXX) XXX-XXXX
function initPhoneMask() {
    const phoneInput = document.getElementById('phone');
    if (!phoneInput) return;

    phoneInput.addEventListener('input', () => {
        const digits = phoneInput.value.replace(/\D/g, '').slice(0, 10);
        let formatted = digits;
        if (digits.length > 6) {
            formatted = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
        } else if (digits.length > 3) {
            formatted = `(${digits.slice(0,3)}) ${digits.slice(3)}`;
        } else if (digits.length > 0) {
            formatted = `(${digits}`;
        }
        phoneInput.value = formatted;
    });
}

function validateField(e) {
    const field = e.target;
    const value = field.value.trim();

    // Clear previous errors
    clearFieldError(e);

    // Validation rules
    if (field.hasAttribute('required') && !value) {
        showFieldError(field, 'This field is required');
        field.setAttribute('aria-invalid', 'true');
        return false;
    }

    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showFieldError(field, 'Please enter a valid email address');
            field.setAttribute('aria-invalid', 'true');
            return false;
        }
    }

    if (field.type === 'tel' && value) {
        // US only: (555) 000-0000 or 555-000-0000
        const usPhoneRegex = /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
        if (!usPhoneRegex.test(value)) {
            showFieldError(field, 'Please enter a valid phone number');
            field.setAttribute('aria-invalid', 'true');
            return false;
        }
    }

    field.removeAttribute('aria-invalid');
    return true;
}

function clearFieldError(e) {
    const field = e.target;
    const errorElement = field.parentElement.querySelector('.field-error');
    if (errorElement) {
        errorElement.remove();
    }
    field.classList.remove('error');
}

function showFieldError(field, message) {
    field.classList.add('error');

    const errorElement = document.createElement('span');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    errorElement.style.color = '#ef4444';
    errorElement.style.fontSize = '0.875rem';
    errorElement.style.marginTop = '0.25rem';
    errorElement.style.display = 'block';

    field.parentElement.appendChild(errorElement);
}

function validateForm(form) {
    let isValid = true;
    const inputs = form.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
        if (!validateField({ target: input })) {
            isValid = false;
        }
    });

    // Ensure at least one service is selected
    const serviceChecks = form.querySelectorAll('input[name="services"]');
    if (serviceChecks.length) {
        const anyChecked = Array.from(serviceChecks).some(cb => cb.checked);
        if (!anyChecked) {
            // Attach an error to the fieldset legend
            const fieldset = serviceChecks[0].closest('fieldset');
            if (fieldset && !fieldset.querySelector('.field-error')) {
                const error = document.createElement('span');
                error.className = 'field-error';
                error.textContent = 'Select at least one service';
                error.style.color = '#ef4444';
                error.style.fontSize = '0.875rem';
                error.style.marginTop = '0.25rem';
                error.style.display = 'block';
                fieldset.appendChild(error);
            }
            isValid = false;
        }
    }

    return isValid;
}

function collectFormErrors(form) {
    const messages = [];
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        const err = input.parentElement.querySelector('.field-error');
        if (err) {
            const label = form.querySelector(`label[for="${input.id}"]`)?.textContent?.trim();
            messages.push({ id: input.id, message: err.textContent, label });
        }
    });

    // Fieldset service error
    const fieldset = form.querySelector('fieldset');
    const fsErr = fieldset?.querySelector('.field-error');
    if (fsErr) {
        const legend = fieldset.querySelector('legend')?.textContent?.trim() || 'Services';
        messages.push({ id: fieldset.id || 'services', message: fsErr.textContent, label: legend });
    }
    return messages;
}

function submitForm(form) {
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;

    // Show loading state
    submitButton.textContent = 'Sending...';
    submitButton.disabled = true;
    submitButton.style.opacity = '0.7';

    // Collect data in a structured way
    const formData = new FormData(form);
    const services = [];
    form.querySelectorAll('input[name="services"]:checked').forEach(cb => services.push(cb.value));
    const payload = {
        firstName: formData.get('firstName')?.toString().trim() || '',
        lastName: formData.get('lastName')?.toString().trim() || '',
        email: formData.get('email')?.toString().trim() || '',
        phone: formData.get('phone')?.toString().trim() || '',
        message: formData.get('message')?.toString().trim() || '',
        services,
        meta: {
            page: window.location.pathname,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        }
    };

    // Simulate async submission (replace with real fetch)
    setTimeout(async () => {
        try {
            // Example stub for future backend
            // await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            console.log('Form payload:', payload);
            showNotification('Thank you! Your quote request has been submitted. We\'ll contact you within 24 hours.', 'success');
        } catch (err) {
            showNotification('There was a problem submitting your request. Please try again.', 'error');
        } finally {
            form.reset();
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            submitButton.style.opacity = '1';
        }
    }, 1200);
}

// Scroll Animations
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.service-card, .feature, .contact-method');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Button Interactions
function initButtonInteractions() {
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .service-btn');

    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Create ripple effect
            const ripple = document.createElement('span');
            ripple.className = 'ripple';

            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.style.position = 'absolute';
            ripple.style.borderRadius = '50%';
            ripple.style.background = 'rgba(255, 255, 255, 0.6)';
            ripple.style.transform = 'scale(0)';
            ripple.style.animation = 'ripple 0.6s linear';
            ripple.style.pointerEvents = 'none';

            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // Add ripple animation CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }

        .field-error {
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
}

// Navbar Scroll Effect
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    const utility = document.querySelector('.utility-bar');
    let lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        // Toggle scrolled class for shrink/solid styles
        if (currentScrollY > 10) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');

        // Keep navbar always visible; hide utility bar after scrolling past it
        navbar.style.transform = 'translateY(0)';
        if (utility) {
            if (currentScrollY > 40) {
                utility.classList.add('hidden');
                navbar.classList.add('docked');
        } else {
                utility.classList.remove('hidden');
                navbar.classList.remove('docked');
            }
        }

        lastScrollY = currentScrollY;
    }, { passive: true });
}

// Scroll progress under navbar
function initScrollProgress() {
    const progress = document.querySelector('.scroll-progress');
    if (!progress) return;
    const update = () => {
        const doc = document.documentElement;
        const scrollTop = window.scrollY || doc.scrollTop || 0;
        const max = (doc.scrollHeight - window.innerHeight) || 1;
        const percent = Math.min(100, Math.max(0, (scrollTop / max) * 100));
        progress.style.width = percent + '%';
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
}

// Mega menu (desktop) and mobile accordion
function initMegaMenu() {
    const dropdown = document.querySelector('.nav-dropdown');
    if (!dropdown) return;
    const toggle = dropdown.querySelector('.dropdown-toggle');
    const mega = document.getElementById('services-mega');
    const mobileSub = dropdown.querySelector('.mobile-submenu');

    if (toggle && mega) {
        const openMega = () => {
            mega.hidden = false;
            toggle.setAttribute('aria-expanded', 'true');

            // Align mega menu center to trigger center and clamp to viewport
            if (window.matchMedia('(min-width: 769px)').matches) {
                const toggleRect = toggle.getBoundingClientRect();
                const viewportW = window.innerWidth;
                // Temporarily show to measure
                mega.style.position = 'fixed';
                mega.style.top = (toggleRect.bottom + 8) + 'px';
                mega.style.left = '0px';
                mega.style.right = 'auto';
                mega.style.transform = 'none';
                const menuRect = mega.getBoundingClientRect();
                const desiredCenter = toggleRect.left + toggleRect.width / 2;
                let left = Math.round(desiredCenter - menuRect.width / 2);
                const margin = 16;
                left = Math.max(margin, Math.min(left, viewportW - menuRect.width - margin));
                mega.style.left = left + 'px';
        } else {
                // Reset for mobile (sheet is used)
                mega.style.position = '';
                mega.style.left = '';
                mega.style.top = '';
                mega.style.transform = '';
            }
        };
        const closeMega = () => {
            // Only close if neither trigger nor panel are hovered/focused
            const isAnyHovered = dropdown.matches(':hover') || mega.matches(':hover') || toggle === document.activeElement || mega.contains(document.activeElement);
            if (isAnyHovered) return;
            mega.hidden = true;
            toggle.setAttribute('aria-expanded', 'false');
            mega.style.position = '';
            mega.style.left = '';
            mega.style.top = '';
            mega.style.transform = '';
        };

        // Desktop hover/focus behavior (keep open when moving from trigger to panel)
        let hoverTimeout;
        dropdown.addEventListener('mouseenter', () => {
            if (!window.matchMedia('(min-width: 769px)').matches) return;
            clearTimeout(hoverTimeout);
            openMega();
        });
        dropdown.addEventListener('mouseleave', () => {
            if (!window.matchMedia('(min-width: 769px)').matches) return;
            hoverTimeout = setTimeout(closeMega, 120);
        });
        // Also open when hovering the toggle specifically (guards against tiny gaps)
        toggle.addEventListener('mouseenter', () => {
            if (!window.matchMedia('(min-width: 769px)').matches) return;
            clearTimeout(hoverTimeout);
            openMega();
        });
        toggle.addEventListener('focus', () => {
            if (window.matchMedia('(min-width: 769px)').matches) openMega();
        });
        // Keep open when hovering the mega panel itself
        mega.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimeout);
        });
        mega.addEventListener('mouseleave', () => {
            hoverTimeout = setTimeout(closeMega, 160);
        });
        mega.addEventListener('focusout', (e) => {
            if (!dropdown.contains(e.relatedTarget)) closeMega();
        });

        // Keyboard/tap toggle
        const toggleAction = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (mega.hidden) openMega(); else closeMega();
            }
            if (e.key === 'Escape') closeMega();
        };
        toggle.addEventListener('keydown', toggleAction);

        // Tap/click on mobile to open/close
        toggle.addEventListener('click', (e) => {
            if (window.matchMedia('(max-width: 768px)').matches) {
                e.preventDefault();
                if (mega.hidden) openMega(); else closeMega();
            }
        });

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) closeMega();
        });
    }

    // Mobile accordion removed in desktop-like mobile layout
}

// Sticky bottom CTA bar on mobile
function initMobileStickyCta() {
    const bar = document.querySelector('.mobile-sticky-cta');
    if (!bar) return;
    const update = () => {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const menuOpen = document.body.classList.contains('menu-open');
        bar.hidden = !(isMobile && !menuOpen);
    };
    update();
    window.addEventListener('resize', update);
    document.addEventListener('click', (e) => {
        // Recompute when menu opens/closes via hamburger
        setTimeout(update, 0);
    });
}

// Full-screen menu sheet for mobile
function initMenuSheet() {
    const sheet = document.querySelector('.menu-sheet');
    const backdrop = document.querySelector('.nav-backdrop');
    const hamburger = document.querySelector('.hamburger');
    if (!sheet || !hamburger) return;

    const closeBtn = sheet.querySelector('.menu-close');
    const tabs = sheet.querySelectorAll('.menu-tab');
    const panels = sheet.querySelectorAll('.menu-panel');
    let releaseTrap = null;

    const openSheet = () => {
        if (!window.matchMedia('(max-width: 768px)').matches) return;
        sheet.hidden = false;
        requestAnimationFrame(() => sheet.classList.add('open'));
        if (backdrop) backdrop.hidden = false;
        document.body.classList.add('menu-open');
        releaseTrap = trapFocus(sheet);
    };
    const closeSheet = () => {
        sheet.classList.remove('open');
        setTimeout(() => { sheet.hidden = true; }, 250);
        if (backdrop) backdrop.hidden = true;
        document.body.classList.remove('menu-open');
        if (releaseTrap) releaseTrap();
        hamburger.focus();
    };

    hamburger.addEventListener('click', (e) => {
        if (window.matchMedia('(max-width: 768px)').matches) {
            e.preventDefault();
            openSheet();
        }
    });
    if (closeBtn) closeBtn.addEventListener('click', closeSheet);
    if (backdrop) backdrop.addEventListener('click', closeSheet);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

    // Tabs behavior
    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
            tab.classList.add('is-active');
            tab.setAttribute('aria-selected', 'true');
            const id = tab.getAttribute('data-tab');
            panels.forEach(p => p.toggleAttribute('hidden', p.getAttribute('data-panel') !== id));
        });
    });

    // Other links visible by default now
}

// Accessible FAQ accordions with auto icons
function initFaqAccordions() {
    const faqSections = document.querySelectorAll('.faq-section');
    if (!faqSections.length) return;
    // Ensure in-page anchors work with existing links to #faq
    faqSections.forEach((sec) => { if (!sec.id) sec.id = 'faq'; });

    // Light-blue icon chooser based on question keywords
    const keywordToIcon = [
        { key: /price|cost|billing|premium/i, src: 'icons/blue-dollar.svg', alt: 'Dollar icon' },
        { key: /support|help|contact|agent/i, src: 'icons/blue-megaphone.svg', alt: 'Support icon' },
        { key: /savings|money|income|refund/i, src: 'icons/blue-hand-coins.svg', alt: 'Savings icon' },
        // Default minimal blue icon for any other topic
        { key: /./, src: 'icons/blue-circle.svg', alt: 'Info icon' }
    ];

    const chooseIcon = (text) => {
        for (const mapping of keywordToIcon) {
            if (mapping.key.test(text)) return mapping;
        }
        return { src: 'icons/blue-circle.svg', alt: 'Info icon' };
    };

    const allItems = document.querySelectorAll('.faq-item');
    allItems.forEach((item, index) => {
        const titleEl = item.querySelector('.faq-question');
        const answerEl = item.querySelector('.faq-answer');
        if (!titleEl || !answerEl) return;
        item.classList.add('is-ready');

        // Build header button
        const questionId = `faq-q-${index}`;
        const panelId = `faq-a-${index}`;
        const titleText = titleEl.textContent.trim();
        const { src, alt } = chooseIcon(titleText);

        const headerBtn = document.createElement('button');
        headerBtn.className = 'faq-trigger';
        headerBtn.type = 'button';
        headerBtn.setAttribute('aria-expanded', 'false');
        headerBtn.setAttribute('aria-controls', panelId);
        headerBtn.id = questionId;

        const iconWrap = document.createElement('span');
        iconWrap.className = 'faq-icon';
        const iconImg = document.createElement('img');
        iconImg.src = src;
        iconImg.alt = '';
        iconImg.setAttribute('aria-hidden', 'true');
        iconWrap.appendChild(iconImg);

        const titleSpan = document.createElement('span');
        titleSpan.className = 'faq-title';
        titleSpan.textContent = titleText;

        const chevron = document.createElement('span');
        chevron.className = 'faq-chevron';
        chevron.setAttribute('aria-hidden', 'true');
        chevron.textContent = '▾';

        headerBtn.appendChild(iconWrap);
        headerBtn.appendChild(titleSpan);
        headerBtn.appendChild(chevron);

        // Content container
        const content = document.createElement('div');
        content.className = 'faq-content collapse';
        content.id = panelId;
        content.setAttribute('role', 'region');
        content.setAttribute('aria-labelledby', questionId);
        content.hidden = true;
        content.appendChild(answerEl);

        // Replace original heading with new header, and insert content
        titleEl.replaceWith(headerBtn);
        item.appendChild(content);

        // Toggle behavior
        const open = () => {
            headerBtn.setAttribute('aria-expanded', 'true');
            item.classList.add('is-open');
            content.hidden = false;
            // measure -> animate
            const full = content.scrollHeight;
            content.style.height = '0px';
            requestAnimationFrame(() => {
                content.style.height = full + 'px';
            });
        };
        const close = () => {
            headerBtn.setAttribute('aria-expanded', 'false');
            item.classList.remove('is-open');
            const full = content.scrollHeight;
            content.style.height = full + 'px';
            requestAnimationFrame(() => {
                content.style.height = '0px';
            });
            // after transition, hide
            content.addEventListener('transitionend', function onEnd() {
                if (headerBtn.getAttribute('aria-expanded') === 'false') content.hidden = true;
                content.removeEventListener('transitionend', onEnd);
            });
        };

        headerBtn.addEventListener('click', () => {
            const isOpen = headerBtn.getAttribute('aria-expanded') === 'true';
            isOpen ? close() : open();
        });
    });
}

// Enhance service cards selection UI for step 2
function initServiceCards() {
    const form = document.querySelector('.modern-contact-form');
    if (!form) return;
    const cards = form.querySelectorAll('.mcf-service-card');
    if (!cards.length) return;

    cards.forEach((card) => {
        const input = card.querySelector('input[type="checkbox"]');
        if (!input) return;

        const sync = () => {
            card.classList.toggle('is-selected', input.checked);
        };
        sync();

        card.addEventListener('click', (e) => {
            // Avoid double toggling when clicking label's children by delegating to input
            if (e.target.tagName !== 'INPUT') {
                input.checked = !input.checked;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            sync();
        });

        input.addEventListener('change', sync);
    });
}

// Multiselect dropdown behavior for Services
function initServicesMultiselect() {
    const ms = document.querySelector('[data-ms]');
    if (!ms) return;
    const trigger = ms.querySelector('.mcf-ms-trigger');
    const panel = ms.querySelector('.mcf-ms-panel');
    const label = ms.querySelector('.mcf-ms-label');
    const checkboxes = ms.querySelectorAll('input[type="checkbox"][name="services"]');

    const updateLabel = () => {
        const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.parentElement.querySelector('span')?.textContent || cb.value);
        label.textContent = selected.length ? selected.join(', ') : 'Select services';
    };
    updateLabel();

    const openPanel = () => {
        panel.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        document.addEventListener('click', outsideHandler, { once: true });
    };
    const closePanel = () => {
        panel.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
    };
    const togglePanel = () => panel.hidden ? openPanel() : closePanel();

    const outsideHandler = (e) => {
        if (!ms.contains(e.target)) closePanel();
    };

    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        togglePanel();
    });

    panel.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePanel();
            trigger.focus();
        }
    });

    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            updateLabel();
        });
    });
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${type === 'success' ? '✓' : 'ℹ'}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;

    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.75rem;
        box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        z-index: 10000;
        max-width: 400px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;

    const content = notification.querySelector('.notification-content');
    content.style.cssText = `
        display: flex;
        align-items: center;
        gap: 0.75rem;
    `;

    const closeButton = notification.querySelector('.notification-close');
    closeButton.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 1.25rem;
        cursor: pointer;
        margin-left: auto;
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

// Quote button handlers
document.addEventListener('DOMContentLoaded', function() {
    const quoteButtons = document.querySelectorAll('.btn-primary, .cta-button');

    quoteButtons.forEach(button => {
        if (button.textContent.toLowerCase().includes('quote')) {
            button.addEventListener('click', function(e) {
                e.preventDefault();

                // Scroll to contact form
                const contactSection = document.querySelector('#contact');
                if (contactSection) {
                    const navbarHeight = document.querySelector('.navbar').offsetHeight;
                    const targetPosition = contactSection.offsetTop - navbarHeight;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });

                    // Focus on form after scroll
                    setTimeout(() => {
                        const firstInput = contactSection.querySelector('input');
                        if (firstInput) {
                            firstInput.focus();
                        }
                    }, 800);
                }
            });
        }
    });
});

// Marketplace deep links: open HealthCare.gov plan browse and application
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('marketplaceForm');
    const startBtn = document.getElementById('startEnrollmentBtn');

    function sanitizeZip(zip) {
        return (zip || '').toString().trim().replace(/[^0-9]/g, '').slice(0, 5);
    }

    function openHealthcareGovPlans(params) {
        // HealthCare.gov does not offer a public unauthenticated JSON API for plans.
        // Best practice for agents/brokers is to deep-link users to official tools.
        // We'll route users to the plan browsing flow and pass minimal hints when possible.
        const base = 'https://www.healthcare.gov/see-plans/#/';
        const url = base;
        window.open(url, '_blank', 'noopener');
    }

    function openHealthcareGovApplication() {
        // Direct users to start their application on the official Marketplace
        const url = 'https://www.healthcare.gov/apply-and-enroll/';
        window.open(url, '_blank', 'noopener');
    }

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const zip = sanitizeZip(document.getElementById('mpZip')?.value);
            const state = document.getElementById('mpState')?.value || '';
            const hh = document.getElementById('mpHousehold')?.value || '';
            const incomeVal = document.getElementById('mpIncome')?.value;
            const income = incomeVal ? Math.max(0, parseInt(incomeVal, 10) || 0) : undefined;
            const agesRaw = document.getElementById('mpAges')?.value || '';
            const ages = agesRaw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isFinite(n) && n > 0);

            // Basic client-side validation
            if (!zip || zip.length !== 5) {
                showNotification('Please enter a valid 5-digit ZIP.', 'error');
                document.getElementById('mpZip')?.focus();
                return;
            }
            if (!state) {
                showNotification('Please select your state.', 'error');
                document.getElementById('mpState')?.focus();
                return;
            }
            if (!hh) {
                showNotification('Please select household size.', 'error');
                document.getElementById('mpHousehold')?.focus();
                return;
            }
            if (!ages.length) {
                showNotification('Please enter at least one valid age.', 'error');
                document.getElementById('mpAges')?.focus();
                return;
            }

            // Fetch live plans from backend proxy and render
            fetchLivePlans({ zip, state, householdSize: hh, income, ages });
        });
    }

    if (startBtn) {
        startBtn.addEventListener('click', function() {
            openHealthcareGovApplication();
        });
    }
});

async function fetchLivePlans(params) {
    const results = document.getElementById('marketplaceResults');
    const list = document.getElementById('mpList');
    const status = document.getElementById('mpStatus');
    if (!results || !list || !status) return;

    results.hidden = false;
    list.innerHTML = '';
    status.hidden = false;
    status.textContent = 'Loading plans...';

    try {
        const qs = new URLSearchParams();
        // Pull from session if not supplied from UI
        const zip = params.zip || sessionStorage.getItem('mp_zip') || '';
        const state = params.state || sessionStorage.getItem('mp_state') || '';
        const income = params.income != null ? params.income : (sessionStorage.getItem('mp_income') ? Number(sessionStorage.getItem('mp_income')) : undefined);
        const people = (() => { try { return JSON.parse(sessionStorage.getItem('mp_people')||''); } catch { return []; } })();
        if (Array.isArray(people) && people.length) {
            // override ages
            params.ages = people.map(p => Number(p.age)).filter(n => Number.isFinite(n) && n > 0);
            params.householdSize = String(people.length);
        }
        qs.set('zip', zip);
        qs.set('state', state);
        qs.set('householdSize', params.householdSize);
        if (income != null) qs.set('income', String(income));

        const res = await fetch(`/api/marketplace/plans?${qs.toString()}`, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) {
            const msg = await res.text().catch(() => '');
            throw new Error(msg || `Request failed (${res.status})`);
        }
        const data = await res.json();
        const plans = Array.isArray(data?.plans) ? data.plans : [];

        if (!plans.length) {
            status.textContent = 'No plans found for your inputs. Try adjusting ZIP or state.';
            return;
        }

        status.hidden = true;
        list.innerHTML = plans.map(renderPlanCard).join('');
    } catch (err) {
        status.textContent = `Could not load plans: ${err?.message || 'Unknown error'}`;
    }
}

function renderPlanCard(p) {
    const premium = p.monthlyPremium == null ? '—' : `$${Number(p.monthlyPremium).toLocaleString()}`;
    const deductible = p.deductible == null ? '—' : `$${Number(p.deductible).toLocaleString()}`;
    const oop = p.outOfPocketMax == null ? '—' : `$${Number(p.outOfPocketMax).toLocaleString()}`;

    return `
    <div class="mp-card">
        <div class="mp-card-header">
            <div class="mp-plan-name">${escapeHtml(p.planName)}</div>
            <div class="mp-carrier">${escapeHtml(p.issuerName || '')}</div>
        </div>
        <div class="mp-card-body">
            <div class="mp-row"><span>Metal Level</span><span>${escapeHtml(p.metalLevel || '-')}</span></div>
            <div class="mp-row"><span>Monthly Premium</span><span>${premium}</span></div>
            <div class="mp-row"><span>Deductible</span><span>${deductible}</span></div>
            <div class="mp-row"><span>Out-of-Pocket Max</span><span>${oop}</span></div>
            <div class="mp-row"><span>Network</span><span>${escapeHtml(p.networkType || '-')}</span></div>
        </div>
    </div>`;
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Focus trap helper for mobile menu
function trapFocus(container) {
    const focusableSelectors = [
        'a[href]', 'button:not([disabled])', 'textarea', 'input', 'select', '[tabindex]:not([tabindex="-1"])'
    ];
    const getFocusable = () => Array.from(container.querySelectorAll(focusableSelectors.join(',')))
        .filter(el => el.offsetParent !== null || window.getComputedStyle(el).position === 'fixed');
    const onKeyDown = (e) => {
        if (e.key !== 'Tab') return;
        const focusable = getFocusable();
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    };
    document.addEventListener('keydown', onKeyDown);
    // Move focus to first link
    const first = getFocusable()[0];
    first?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
}

// Performance optimization: Throttle scroll events
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Apply throttling to scroll events
window.addEventListener('scroll', throttle(function() {
    // Scroll-dependent functions are already handled above
}, 16), { passive: true }); // ~60fps

// Preload critical resources
function preloadResources() {
    const preloadLinks = [
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
    ];

    preloadLinks.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = href;
        link.as = 'style';
        document.head.appendChild(link);
    });
}

// Initialize preloading
preloadResources();

// Testimonial Reviews Rotator
function initReviewsRotator() {
    const rotator = document.querySelector('.reviews-rotator');
    if (!rotator) return;

    const track = rotator.querySelector('.rr-track');
    const dots = rotator.querySelector('.rr-dots');

    // Placeholder data; will be replaced once you provide final six screenshots/text
    const reviews = [
        {
            name: 'Michael Logan',
            sub: 'Google Review • 9 months ago',
            quote: 'Johnny was great!!! Kept me in the loop for the whole process. Was able to get me a preferred rate and just felt they really cared about my situation on a personal level.',
            avatar: 'M'
        },
        {
            name: 'Mandi B',
            sub: 'Google Review • a year ago',
            quote: 'These guys at the insurance company are awesome! They made sorting out my insurance a breeze. Super friendly and professional team. I\'m very grateful for their help and definitely recommend them!',
            avatar: 'M'
        },
        {
            name: 'Joshua Boothe',
            sub: 'Google Review • a year ago',
            quote: 'These guys are awesome! They really helped me out with my insurance needs. Super friendly and knowledgeable team. I highly recommend them!',
            avatar: 'J'
        },
        {
            name: 'Allan Boothe',
            sub: 'Google Review • 2 years ago',
            quote: 'The Insurance Box services went above and beyond my expectations! Polite, helpful, and knowledgeable... Thank you!',
            avatar: 'A'
        },
        {
            name: 'Jamie',
            sub: 'Google Review • a year ago',
            quote: 'Super helpful and friendly team!',
            avatar: 'J'
        }
    ];

    // Generate slides and dots
    track.innerHTML = '';
    reviews.forEach((r, i) => {
        const slide = document.createElement('div');
        slide.className = 'rr-slide' + (i === 0 ? ' is-active' : '');
        slide.setAttribute('role', 'group');
        slide.setAttribute('aria-roledescription', 'slide');
        slide.setAttribute('aria-label', `${i + 1} of ${reviews.length}`);
        const highlighted = highlightKeyPhrases(r.quote);
        slide.innerHTML = `
            <div class="rr-stars" aria-label="5 out of 5 stars" title="5 out of 5 stars">★★★★★</div>
            <p class="rr-quote">"${highlighted}"</p>
            <div class="rr-author">
                <div class="rr-avatar" aria-hidden="true">${escapeHtml(r.avatar)}</div>
                <div class="rr-meta">
                    <span class="rr-name">${escapeHtml(r.name)}</span>
                    <span class="rr-sub">${escapeHtml(r.sub)}</span>
                </div>
            </div>`;
        track.appendChild(slide);

        const dot = document.createElement('button');
        dot.className = 'rr-dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        dot.setAttribute('aria-controls', '');
        dot.addEventListener('click', () => goTo(i));
        dots.appendChild(dot);
    });

    let index = 0;
    let timer = null;
    const slides = Array.from(track.children);
    const dotEls = Array.from(dots.children);

    function goTo(i) {
        slides[index]?.classList.remove('is-active');
        dotEls[index]?.setAttribute('aria-selected', 'false');
        index = (i + slides.length) % slides.length;
        slides[index]?.classList.add('is-active');
        dotEls[index]?.setAttribute('aria-selected', 'true');
        // Auto-fit track height to active slide to avoid overlap with dots
        fitTrackHeight();
        restart();
    }

    function nextSlide() { goTo(index + 1); }

    function start() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // respect
        stop();
        timer = setInterval(nextSlide, 3500);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }

    rotator.addEventListener('mouseenter', stop);
    rotator.addEventListener('mouseleave', start);

    // Keyboard support
    rotator.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { nextSlide(); }
    });

    // Size track initially and on resize
    function fitTrackHeight() {
        const active = slides[index];
        if (!active) return;
        // Temporarily ensure active is measurable
        const prevPosition = active.style.position;
        active.style.position = 'relative';
        // Adjust font size if quote is very long so it fits without truncation
        const quoteEl = active.querySelector('.rr-quote');
        if (quoteEl) {
            quoteEl.classList.remove('rr-long');
            // If the quote spans beyond ~12 lines at current size, mark as long
            const tooTall = quoteEl.scrollHeight > 360; // ~12 * 30px line
            if (tooTall) quoteEl.classList.add('rr-long');
        }
        const h = active.scrollHeight;
        track.style.height = h +  'px';
        active.style.position = prevPosition || '';
    }

    window.addEventListener('resize', () => {
        // debounce slighty
        clearTimeout(window.__rr_resize_timer);
        window.__rr_resize_timer = setTimeout(fitTrackHeight, 100);
    });

    fitTrackHeight();
    start();
}

// Disability Insurance Calculator
function initDiCalculator() {
    const incomeEl = document.getElementById('diIncome');
    const occEl = document.getElementById('diOcc');
    const replaceEl = document.getElementById('diReplace');
    const replaceOut = document.getElementById('diReplaceOut');
    const elimEl = document.getElementById('diElim');
    const periodEl = document.getElementById('diPeriod');
    const defEl = document.getElementById('diOwnOcc');
    const residualEl = document.getElementById('diResidual');
    const colaEl = document.getElementById('diCola');
    const benefitOut = document.getElementById('diBenefitOut');
    const calcBtn = document.getElementById('diCalcBtn');
    const results = document.getElementById('diResults');

    if (!incomeEl || !occEl || !replaceEl || !elimEl || !periodEl || !defEl || !benefitOut || !calcBtn) return;

    // Result fields
    const resBenefit = document.getElementById('diResBenefit');
    const resPremium = document.getElementById('diResPremium');
    const resAmount = document.getElementById('diResAmount');
    const resReplace = document.getElementById('diResReplace');
    const resBase = document.getElementById('diResBase');
    const resElim = document.getElementById('diResElim');
    const resPeriod = document.getElementById('diResPeriod');
    const resDef = document.getElementById('diResDef');
    const resRiders = document.getElementById('diResRiders');
    const resPremMonth = document.getElementById('diResPremMonth');
    const resPremRange = document.getElementById('diResPremRange');

    const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
    const toCurrency = (n) => `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

    function computeBenefit(income, replacePct) {
        const pct = clamp(replacePct, 40, 70) / 100;
        // Benefit caps are common. We'll softly cap at $20,000/mo for illustration.
        return Math.min(income * pct, 20000);
    }

    function occupationFactor(occClass) {
        // Lower risk (higher class) tends to lower premiums
        switch (String(occClass)) {
            case '1': return 1.20; // heavy/manual
            case '2': return 1.05; // mixed
            case '3': return 1.00; // standard office
            case '4': return 0.90; // professional
            default: return 1.00;
        }
    }

    function eliminationFactor(days) {
        // Longer waiting period reduces premium
        const d = Number(days);
        if (d <= 30) return 1.10;
        if (d <= 60) return 1.00;
        if (d <= 90) return 0.90;
        return 0.80; // 180+
    }

    function periodFactor(periodVal) {
        // Longer benefit period -> higher premium
        if (periodVal === 'to65') return 1.25;
        const months = Number(periodVal) || 60;
        if (months <= 24) return 0.90;
        if (months <= 60) return 1.00;
        if (months <= 120) return 1.10;
        return 1.20;
    }

    function definitionFactor(defVal) {
        // Own-occ generally increases premium
        return defVal === 'own' ? 1.10 : 0.95;
    }

    function ridersFactor(hasResidual, hasCola) {
        let factor = 1.00;
        if (hasResidual) factor *= 1.05; // partial disability rider
        if (hasCola) factor *= 1.08; // COLA
        return factor;
    }

    function basePremiumFromIncome(income) {
        // Rough midpoint 1.6% of monthly income for illustrative purposes
        return income * 0.016;
    }

    function updateOutputs() {
        const income = Math.max(0, Number(incomeEl.value) || 0);
        const replace = clamp(Number(replaceEl.value) || 60, 40, 70);
        const benefit = computeBenefit(income, replace);
        replaceOut.textContent = String(replace);
        benefitOut.textContent = `Benefit: ${toCurrency(benefit)} / month`;
    }

    function calculate() {
        const income = Math.max(0, Number(incomeEl.value) || 0);
        const replace = clamp(Number(replaceEl.value) || 60, 40, 70);
        const benefit = computeBenefit(income, replace);

        // Base monthly premium approximation
        let premium = basePremiumFromIncome(income);
        const of = occupationFactor(occEl.value);
        const ef = eliminationFactor(elimEl.value);
        const pf = periodFactor(periodEl.value);
        const df = definitionFactor(defEl.value);
        const rf = ridersFactor(residualEl.checked, colaEl.checked);
        const totalFactor = of * ef * pf * df * rf;
        premium *= totalFactor;

        // Present a range ±25%
        const low = premium * 0.75;
        const high = premium * 1.25;

        // Update results UI
        if (results) results.hidden = false;
        if (resBenefit) resBenefit.textContent = `${toCurrency(benefit)}/mo`;
        if (resPremium) resPremium.textContent = `${toCurrency(low)}–${toCurrency(high)}/mo`;
        if (resAmount) resAmount.textContent = toCurrency(benefit);
        if (resReplace) resReplace.textContent = `${replace}%`;

        // Breakdown
        const base = basePremiumFromIncome(income);
        if (resBase) resBase.textContent = toCurrency(base);
        if (resElim) resElim.textContent = formatFactorDelta(eliminationFactor(elimEl.value));
        if (resPeriod) resPeriod.textContent = formatFactorDelta(periodFactor(periodEl.value));
        if (resDef) resDef.textContent = formatFactorDelta(definitionFactor(defEl.value));
        if (resRiders) resRiders.textContent = formatFactorDelta(ridersFactor(residualEl.checked, colaEl.checked));
        if (resPremMonth) resPremMonth.textContent = `${toCurrency(premium)}/mo`;
        if (resPremRange) resPremRange.textContent = `${toCurrency(low)}–${toCurrency(high)}/mo`;
    }

    function formatFactorDelta(f) {
        const pct = Math.round((f - 1) * 100);
        const sign = pct > 0 ? '+' : '';
        return `${sign}${pct}%`;
    }

    // Live updates
    incomeEl.addEventListener('input', updateOutputs);
    replaceEl.addEventListener('input', updateOutputs);
    replaceEl.addEventListener('change', updateOutputs);

    // Compute on button click and when key inputs change
    calcBtn.addEventListener('click', calculate);
    [incomeEl, occEl, replaceEl, elimEl, periodEl, defEl, residualEl, colaEl].forEach(el => {
        el.addEventListener('change', calculate);
        el.addEventListener('input', (e) => {
            if (e.target === replaceEl) updateOutputs();
        });
    });

    // Initialize outputs
    updateOutputs();
}

// Light-blue highlight for key phrases in review text
function highlightKeyPhrases(text) {
    const phrases = [
        'helpful', 'responsive', 'highly recommend', 'kept me in the loop',
        'preferred rate', 'super friendly', 'professional', 'knowledgeable',
        'beyond my expectations', 'recommend'
    ];
    let result = escapeHtml(text);
    phrases.forEach((p) => {
        const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
        result = result.replace(re, (m) => `<mark>${m}</mark>`);
    });
    return result;
}

// Interactive Financial Goal Planner (calculator-section)
function initGoalPlanner() {
    const container = document.getElementById('goal-planner');
    if (!container) return;

    const els = {
        current: document.getElementById('gp-current'),
        monthly: document.getElementById('gp-monthly'),
        years: document.getElementById('gp-years'),
        ret: document.getElementById('gp-return'),
        infl: document.getElementById('gp-inflation'),
        risk: document.getElementById('gp-risk'),
        run: document.getElementById('gp-run'),
        reset: document.getElementById('gp-reset'),
        fv: document.getElementById('gp-fv'),
        contrib: document.getElementById('gp-contrib'),
        growth: document.getElementById('gp-growth'),
        real: document.getElementById('gp-real'),
        canvas: document.getElementById('gp-chart')
    };

    // Guard against missing elements
    if (!els.current || !els.monthly || !els.years || !els.ret || !els.infl || !els.risk || !els.fv || !els.contrib || !els.growth || !els.real || !els.canvas) return;

    const defaults = {
        current: Number(els.current.value) || 25000,
        monthly: Number(els.monthly.value) || 600,
        years: Number(els.years.value) || 25,
        ret: Number(els.ret.value) || 6.5,
        infl: Number(els.infl.value) || 2.5,
        risk: els.risk.value || 'balanced'
    };

    const riskReturn = { conservative: 4.5, balanced: 6.5, growth: 8.0 };
    let userEditedReturn = false;
    els.ret.addEventListener('input', () => { userEditedReturn = true; });

    function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

    function parseNumber(el, fallback) {
        const v = parseFloat(el.value);
        return Number.isFinite(v) ? v : fallback;
    }

    function computeModel() {
        const current = Math.max(0, parseNumber(els.current, defaults.current));
        const monthly = Math.max(0, parseNumber(els.monthly, defaults.monthly));
        const years = clamp(Math.round(parseNumber(els.years, defaults.years)), 1, 60);
        const annualReturn = Math.max(0, parseNumber(els.ret, defaults.ret)) / 100;
        const inflation = Math.max(0, parseNumber(els.infl, defaults.infl)) / 100;
        const months = years * 12;
        const r = annualReturn / 12;

        let balance = current;
        const series = [{ year: 0, balance }];
        for (let y = 1; y <= years; y++) {
            for (let m = 0; m < 12; m++) {
                balance = balance * (1 + r) + monthly; // contribution at month end
            }
            series.push({ year: y, balance });
        }

        const fv = balance;
        const totalContrib = monthly * months;
        const growth = Math.max(0, fv - current - totalContrib);
        const realFv = inflation > 0 ? fv / Math.pow(1 + inflation, years) : fv;

        return { current, monthly, years, annualReturn, inflation, months, fv, totalContrib, growth, realFv, series };
    }

    function formatCurrency(n) {
        const rounded = Math.round(n);
        return '$' + rounded.toLocaleString();
    }

    function updateMetrics(model) {
        els.fv.textContent = formatCurrency(model.fv);
        els.contrib.textContent = formatCurrency(model.totalContrib);
        els.growth.textContent = formatCurrency(model.growth);
        els.real.textContent = formatCurrency(model.realFv) + ' (inflation‑adjusted)';
    }

    function drawChartLine(canvas, series) {
        const dpr = window.devicePixelRatio || 1;
        const ctx = canvas.getContext('2d');
        const cssWidth = canvas.clientWidth || canvas.width;
        const cssHeight = canvas.clientHeight || canvas.height;
        const width = Math.max(320, Math.floor(cssWidth * dpr));
        const height = Math.max(180, Math.floor(cssHeight * dpr));
        canvas.width = width;
        canvas.height = height;

        // Padding for axes
        const padLeft = Math.floor(56 * dpr);
        const padRight = Math.floor(12 * dpr);
        const padTop = Math.floor(14 * dpr);
        const padBottom = Math.floor(28 * dpr);
        const plotW = width - padLeft - padRight;
        const plotH = height - padTop - padBottom;

        // Background
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Determine scales
        const xs = series.map(p => p.year);
        const ys = series.map(p => p.balance);
        const xMin = 0;
        const xMax = Math.max(1, xs[xs.length - 1]);
        const yMax = Math.max(1, Math.max.apply(null, ys));
        const yMin = 0;

        const xToPx = (x) => padLeft + (x - xMin) / (xMax - xMin) * plotW;
        const yToPx = (y) => padTop + (1 - (y - yMin) / (yMax - yMin)) * plotH;

        // Grid lines (Y)
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1 * dpr;
        ctx.fillStyle = '#6b7280';
        ctx.font = `${12 * dpr}px Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
        const steps = 4;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const yVal = yMin + (yMax - yMin) * t;
            const y = yToPx(yVal);
            ctx.beginPath();
            ctx.moveTo(padLeft, y);
            ctx.lineTo(width - padRight, y);
            ctx.stroke();
            // Tick labels
            const label = formatCurrency(yVal);
            ctx.fillText(label, 6 * dpr, y - 2 * dpr);
        }

        // X axis labels (every ~years/5)
        const xTicks = Math.min(5, series.length - 1);
        for (let i = 0; i <= xTicks; i++) {
            const yr = Math.round(xMax * (i / xTicks));
            const x = xToPx(yr);
            const y = height - padBottom + 16 * dpr;
            ctx.fillStyle = '#6b7280';
            ctx.fillText(String(yr) + 'y', x - 8 * dpr, y);
        }

        // Line
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        series.forEach((p, i) => {
            const px = xToPx(p.year);
            const py = yToPx(p.balance);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.stroke();

        // Fill under line
        const gradient = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.18)');
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.02)');
        ctx.fillStyle = gradient;
        ctx.lineTo(xToPx(series[series.length - 1].year), yToPx(0));
        ctx.lineTo(xToPx(series[0].year), yToPx(0));
        ctx.closePath();
        ctx.fill();
    }

    function run() {
        const model = computeModel();
        updateMetrics(model);
        drawChartLine(els.canvas, model.series);
    }

    // Listeners
    const inputs = [els.current, els.monthly, els.years, els.ret, els.infl];
    inputs.forEach((el) => el.addEventListener('input', run));
    if (els.run) els.run.addEventListener('click', run);
    if (els.reset) els.reset.addEventListener('click', () => {
        els.current.value = String(defaults.current);
        els.monthly.value = String(defaults.monthly);
        els.years.value = String(defaults.years);
        els.risk.value = defaults.risk;
        userEditedReturn = false;
        els.ret.value = String(riskReturn[els.risk.value] || defaults.ret);
        els.infl.value = String(defaults.infl);
        run();
    });
    els.risk.addEventListener('change', () => {
        if (!userEditedReturn) {
            const mapped = riskReturn[els.risk.value];
            if (mapped) {
                els.ret.value = String(mapped);
            }
        }
        run();
    });

    // Initial paint
    if (!userEditedReturn && !els.ret.value) {
        const mapped = riskReturn[els.risk.value];
        if (mapped) els.ret.value = String(mapped);
    }
    // Re-render on resize to keep chart crisp
    window.addEventListener('resize', () => { run(); });
    run();
}