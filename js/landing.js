/**
 * js/landing.js
 * ─────────────────────────────────────────────────────────────────────────────
 * LandingManager — Interactive Landing / Splash Page Controller
 *
 * Responsibilities:
 *  1. Typewriter effect cycling through dynamic phrases
 *  2. Animated stat counters (rAF-based)
 *  3. Staggered card entrance animation
 *  4. Mouse parallax — floating cards shift on depth layers
 *  5. "Enter Dashboard" CTA — slide-up exit transition + reveal main dashboard
 * ─────────────────────────────────────────────────────────────────────────────
 */

var LandingManager = (function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────────────────
    // Config
    // ─────────────────────────────────────────────────────────────────────────
    var TYPEWRITER_PHRASES = [
        'streaming data',
        'platform insights',
        'content analytics',
        'ratings & trends'
    ];

    var STATS = [
        { id: 'landing-stat-titles',    target: 15000, suffix: '+',  prefix: '' },
        { id: 'landing-stat-platforms', target: 8,     suffix: '',   prefix: '' },
        { id: 'landing-stat-countries', target: 190,   suffix: '+',  prefix: '' }
    ];

    // Depth multipliers for each floating card (used in parallax)
    var CARD_DEPTHS = [0.025, 0.018, 0.030, 0.022, 0.015];

    var _typewriterEl   = null;
    var _phraseIndex    = 0;
    var _charIndex      = 0;
    var _isDeleting     = false;
    var _typewriterTimer = null;

    // ─────────────────────────────────────────────────────────────────────────
    // Public: init
    // ─────────────────────────────────────────────────────────────────────────
    function init() {
        var landingEl = document.getElementById('landing-page');
        if (!landingEl) return; // No landing page in DOM

        _staggerCardEntrance();
        _startTypewriter();
        _animateCounters();
        _setupParallax();
        _setupScrollButton();
        _setupScrollParallax();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Staggered card entrance
    // ─────────────────────────────────────────────────────────────────────────
    function _staggerCardEntrance() {
        var cards = document.querySelectorAll('.floating-card');
        cards.forEach(function (card, i) {
            setTimeout(function () {
                card.classList.add('card-visible');
            }, 200 + i * 130);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Typewriter effect
    // ─────────────────────────────────────────────────────────────────────────
    function _startTypewriter() {
        _typewriterEl = document.getElementById('landing-typewriter');
        if (!_typewriterEl) return;

        _typewriterEl.textContent = '';
        _typewriterTick();
    }

    function _typewriterTick() {
        var phrase = TYPEWRITER_PHRASES[_phraseIndex];
        var delay;

        if (!_isDeleting) {
            // Typing forward
            _typewriterEl.textContent = phrase.substring(0, _charIndex + 1);
            _charIndex++;

            if (_charIndex === phrase.length) {
                // Finished typing — pause before deleting
                delay = 1800;
                _isDeleting = true;
                _typewriterTimer = setTimeout(_typewriterTick, delay);
                return;
            }
            delay = 55 + Math.random() * 35; // Slight jitter for realism
        } else {
            // Deleting
            _typewriterEl.textContent = phrase.substring(0, _charIndex - 1);
            _charIndex--;

            if (_charIndex === 0) {
                // Done deleting — move to next phrase
                _isDeleting = false;
                _phraseIndex = (_phraseIndex + 1) % TYPEWRITER_PHRASES.length;
                delay = 320;
            } else {
                delay = 28 + Math.random() * 20;
            }
        }

        _typewriterTimer = setTimeout(_typewriterTick, delay);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Animated stat counters
    // ─────────────────────────────────────────────────────────────────────────
    function _animateCounters() {
        STATS.forEach(function (stat) {
            var el = document.getElementById(stat.id);
            if (!el) return;

            var start     = 0;
            var duration  = 1800; // ms
            var startTime = null;

            function easeOut(t) {
                return 1 - Math.pow(1 - t, 3); // Cubic ease-out
            }

            function step(timestamp) {
                if (!startTime) startTime = timestamp;
                var elapsed  = timestamp - startTime;
                var progress = Math.min(elapsed / duration, 1);
                var value    = Math.round(easeOut(progress) * stat.target);

                // Format with thousands separator
                el.textContent = stat.prefix + value.toLocaleString() + stat.suffix;

                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    el.textContent = stat.prefix + stat.target.toLocaleString() + stat.suffix;
                }
            }

            // Delay each counter slightly
            setTimeout(function () {
                requestAnimationFrame(step);
            }, 600);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Mouse parallax
    // ─────────────────────────────────────────────────────────────────────────
    function _setupParallax() {
        var cards = document.querySelectorAll('.floating-card');
        if (!cards.length) return;

        var cx = window.innerWidth  / 2;
        var cy = window.innerHeight / 2;

        document.addEventListener('mousemove', function (e) {
            var dx = e.clientX - cx;
            var dy = e.clientY - cy;

            cards.forEach(function (card, i) {
                var depth = CARD_DEPTHS[i] || 0.02;
                var tx    = dx * depth;
                var ty    = dy * depth;

                // Inject as CSS custom props so they stack with the float animation
                card.style.setProperty('--px', tx + 'px');
                card.style.setProperty('--py', ty + 'px');
            });
        });

        // Keep parallax properties so animations can read them
        // We use a wrapper transform approach: inject a translateX/Y offset via JS
        // by slightly adjusting the animation via inline style on a wrapper
        // Actually let's directly nudge via a CSS variable read trick:
        // We apply the parallax as an additional inline transform on the card wrapper
        // by overriding via a translate in a requestAnimationFrame loop
        var prevDx = 0;
        var prevDy = 0;

        document.addEventListener('mousemove', function (e) {
            prevDx = (e.clientX - cx) ;
            prevDy = (e.clientY - cy) ;
        });

        // Smooth lerp loop
        var lerpDx = 0;
        var lerpDy = 0;

        function rafLoop() {
            lerpDx += (prevDx - lerpDx) * 0.08;
            lerpDy += (prevDy - lerpDy) * 0.08;

            cards.forEach(function (card, i) {
                var depth = CARD_DEPTHS[i] || 0.02;
                var tx    = lerpDx * depth;
                var ty    = lerpDy * depth;
                // Write to data attr so CSS animation still owns the base transform
                // Use a secondary transform layer via CSS variable in the element
                card.setAttribute('data-tx', tx);
                card.setAttribute('data-ty', ty);
                // Apply an additional translate using filter trick won't work cleanly,
                // so we use a wrapper margin nudge instead
                card.style.marginLeft = tx + 'px';
                card.style.marginTop  = ty + 'px';
            });

            requestAnimationFrame(rafLoop);
        }

        requestAnimationFrame(rafLoop);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Scroll to dashboard (replaces vanish-on-click)
    //    Buttons smoothly scroll the page so the header comes into view.
    // ─────────────────────────────────────────────────────────────────────────
    function _setupScrollButton() {
        var btn         = document.getElementById('btnEnterDashboard');
        var scrollHint  = document.querySelector('.landing-scroll-hint');

        function _scrollToDashboard() {
            var header = document.querySelector('.top-header');
            if (header) {
                header.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
            }
            console.log('[LandingManager] Scrolled to dashboard.');
        }

        if (btn)        btn.addEventListener('click',     _scrollToDashboard);
        if (scrollHint) scrollHint.addEventListener('click', _scrollToDashboard);

        // Keyboard: Enter or Space on the main CTA
        if (btn) {
            btn.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    _scrollToDashboard();
                }
            });
        }

        // ── Navigation Modal Handling ──
        var modalOverlay = document.getElementById('landing-modal');
        var modalTitle   = document.getElementById('landingModalTitle');
        var modalBody    = document.getElementById('landingModalBody');
        var modalIcon    = document.getElementById('landingModalIcon');
        var closeBtn     = document.getElementById('closeLandingModal');

        function _openModal(title, iconSvg, contentHtml) {
            if (!modalOverlay || !modalTitle || !modalBody || !modalIcon) return;
            modalTitle.textContent = title;
            modalIcon.innerHTML = iconSvg;
            modalBody.innerHTML = contentHtml;
            modalOverlay.style.display = 'flex';
            modalOverlay.setAttribute('aria-hidden', 'false');
        }

        function _closeModal() {
            if (!modalOverlay) return;
            modalOverlay.style.display = 'none';
            modalOverlay.setAttribute('aria-hidden', 'true');
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', _closeModal);
        }
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function (e) {
                if (e.target === modalOverlay) _closeModal();
            });
        }

        // Icons
        var iconInfo = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
        var iconKey = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
        var iconUser = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        var iconCpu = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>';

        // About Button
        var aboutBtn = document.getElementById('btnLandingAbout');
        if (aboutBtn) {
            aboutBtn.addEventListener('click', function () {
                _openModal(
                    'About StreamMetrics',
                    iconInfo,
                    '<p><strong>StreamMetrics</strong> is a modern analytics interface designed to synthesize multi-platform streaming data in real time.</p>' +
                    '<p>By leveraging the high-speed associative Qlik Sense Engine, this workspace presents up-to-date indicators for catalog volume, release trends, geography distributions, and rating feedback across Netflix, Prime Video, Hulu, Disney+, and Apple TV+.</p>' +
                    '<p style="font-size: 0.8rem; color: rgba(255,255,255,0.4); margin-top: 20px;">Developed by Priyanshi Varshney · UPES, Dehradun</p>'
                );
            });
        }

        // Features Button
        var featuresBtn = document.getElementById('btnLandingFeatures');
        if (featuresBtn) {
            featuresBtn.addEventListener('click', function () {
                _openModal(
                    'Platform Features',
                    iconCpu,
                    '<ul style="text-align: left; margin: 0 0 16px 20px; padding: 0; color: rgba(255,255,255,0.85);">' +
                    '  <li style="margin-bottom: 8px;"><strong>Live Qlik Engine Sync:</strong> Every selection calculates metrics on the fly.</li>' +
                    '  <li style="margin-bottom: 8px;"><strong>Custom Accordion Filters:</strong> Streamlined accordion filters matching Power BI and Netflix structures.</li>' +
                    '  <li style="margin-bottom: 8px;"><strong>Apache ECharts Integration:</strong> Interactive scatter plots, treemaps, and line charts with automatic resizing.</li>' +
                    '  <li style="margin-bottom: 8px;"><strong>Glassmorphic Dark Mode:</strong> Clean minimal design built using CSS custom properties.</li>' +
                    '</ul>'
                );
            });
        }

        // Docs Button
        var docsBtn = document.getElementById('btnLandingDocs');
        if (docsBtn) {
            docsBtn.addEventListener('click', function () {
                _openModal(
                    'Documentation',
                    iconInfo,
                    '<p>Need help navigating the dashboard? Launch the dashboard and click the <strong>"Interactive Tour"</strong> button inside the workspace hero panel to see an automated walk-through of the main analytics components.</p>' +
                    '<p>To select data, click check boxes in the sidebar. To reset all selectors, click <strong>"Clear All"</strong> at the top of the filter panel.</p>'
                );
            });
        }

        // Log In Button
        var loginBtn = document.getElementById('btnLandingLogin');
        if (loginBtn) {
            loginBtn.addEventListener('click', function () {
                _openModal(
                    'Log In to StreamMetrics',
                    iconKey,
                    '<form class="landing-modal-form" onsubmit="event.preventDefault(); alert(\'Logged in successfully! (Demo account activated)\'); document.getElementById(\'closeLandingModal\').click();">' +
                    '  <label>Email Address</label>' +
                    '  <input type="email" placeholder="name@company.com" required value="priyanshi.v@upes.edu"/>' +
                    '  <label>Password</label>' +
                    '  <input type="password" placeholder="••••••••" required value="12345678"/>' +
                    '  <button type="submit">Log In</button>' +
                    '</form>'
                );
            });
        }

        // Sign Up Button
        var signupBtn = document.getElementById('btnLandingSignup');
        if (signupBtn) {
            signupBtn.addEventListener('click', function () {
                _openModal(
                    'Create an Account',
                    iconUser,
                    '<form class="landing-modal-form" onsubmit="event.preventDefault(); alert(\'Account created successfully! Welcome to StreamMetrics!\'); document.getElementById(\'closeLandingModal\').click();">' +
                    '  <label>Full Name</label>' +
                    '  <input type="text" placeholder="Priyanshi Varshney" required />' +
                    '  <label>Email Address</label>' +
                    '  <input type="email" placeholder="name@company.com" required />' +
                    '  <label>Password</label>' +
                    '  <input type="password" placeholder="••••••••" required />' +
                    '  <button type="submit">Register Now</button>' +
                    '</form>'
                );
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Scroll-driven parallax fade
    //    As the user scrolls past the landing, the content fades + rises slightly.
    // ─────────────────────────────────────────────────────────────────────────
    function _setupScrollParallax() {
        var landing  = document.getElementById('landing-page');
        var content  = document.querySelector('#landing-page .landing-content');
        var cardsLayer = document.querySelector('#landing-page .landing-cards-layer');
        if (!landing || !content) return;

        window.addEventListener('scroll', function () {
            var scrollY  = window.pageYOffset || document.documentElement.scrollTop;
            var h        = landing.offsetHeight || window.innerHeight;
            // progress: 0 at top of landing, 1 when landing fully scrolled past
            var progress = Math.min(scrollY / h, 1);

            // Fade out + slight upward drift as landing exits viewport
            var opacity  = 1 - progress * 1.4;          // fades out before fully gone
            var translateY = -progress * 60;             // lifts 60px over the scroll

            content.style.opacity   = Math.max(opacity, 0);
            content.style.transform = 'translateY(' + translateY + 'px)';

            if (cardsLayer) {
                cardsLayer.style.opacity   = Math.max(opacity + 0.15, 0); // cards linger a bit longer
                cardsLayer.style.transform = 'translateY(' + (translateY * 0.5) + 'px)';
            }

            // Once scrolled well past the landing, trigger ECharts resize once
            if (progress >= 0.5 && !landing.dataset.resizeTriggered) {
                landing.dataset.resizeTriggered = '1';
                window.dispatchEvent(new Event('resize'));
            }
        }, { passive: true });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────────
    return {
        init: init
    };

}());

// Auto-initialize on DOMContentLoaded
(function () {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', LandingManager.init);
    } else {
        LandingManager.init();
    }
}());
