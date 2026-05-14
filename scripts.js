/* ==========================================================================
   Silver Shield LLC - Shared JavaScript
   4-page static site: Home, Services, Story, Contact
   Requires: GSAP 3.12 + ScrollTrigger + ScrollToPlugin (loaded via CDN)
   ========================================================================== */

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/* --------------------------------------------------------------------------
   Globals & Utilities
   -------------------------------------------------------------------------- */
const PAGE = document.body.dataset.page;
const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const PREFERS_REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --------------------------------------------------------------------------
   1. (Custom cursor removed - using default browser cursor)
   -------------------------------------------------------------------------- */
function initCustomCursor() {
  // No custom cursor - default browser cursor is used
}

/* --------------------------------------------------------------------------
   2. Gold Star Click Effect
   -------------------------------------------------------------------------- */
function initClickStars() {
  if (PREFERS_REDUCED) return;

  const starSVG = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <polygon points="8,0.5 10.1,5.4 15.5,5.9 11.4,9.5 12.6,15 8,12 3.4,15 4.6,9.5 0.5,5.9 5.9,5.4"
             fill="#e8b84c" opacity="0.9"/>
  </svg>`;

  document.addEventListener('click', function (e) {
    const star = document.createElement('div');
    star.innerHTML = starSVG;
    star.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 100000;
      left: ${e.clientX}px;
      top: ${e.clientY}px;
      transform: translate(-50%, -50%) scale(0);
      opacity: 1;
    `;
    document.body.appendChild(star);

    gsap.to(star, {
      scale: 1.2,
      opacity: 0,
      y: -15,
      duration: 0.7,
      ease: 'power2.out',
      onComplete: function () {
        star.remove();
      }
    });
  });
}

/* --------------------------------------------------------------------------
   2b. Shimmer Text — split .shimmer-text elements into per-letter spans
       so each letter can animate independently (gold glimmer wave on hover)
   -------------------------------------------------------------------------- */
function initShimmerText() {
  const elements = document.querySelectorAll('.shimmer-text');
  elements.forEach(function (el) {
    if (el.dataset.shimmerProcessed === 'true') return;

    const text = el.textContent;
    if (!text || !text.trim()) return;

    el.setAttribute('aria-label', text.trim());
    el.innerHTML = '';

    // Split into words AND whitespace tokens so we can wrap each word
    // in a non-breaking container. Inline-block letters would otherwise
    // create break opportunities between every letter — wrapping per
    // word prevents words from splitting mid-letter on narrow columns.
    const tokens = text.split(/(\s+)/);
    let charIndex = 0;

    tokens.forEach(function (token) {
      if (!token) return;
      if (/^\s+$/.test(token)) {
        // Preserve word spacing as a real text node — gives the browser
        // a real break opportunity between words.
        el.appendChild(document.createTextNode(token));
        return;
      }
      // Real word — wrap in a per-word container that holds together
      const wordSpan = document.createElement('span');
      wordSpan.className = 'sh-word';
      wordSpan.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < token.length; i++) {
        const charSpan = document.createElement('span');
        charSpan.className = 'ch';
        charSpan.textContent = token[i];
        // Global index drives the staggered wave across the whole line
        charSpan.style.setProperty('--i', charIndex);
        wordSpan.appendChild(charSpan);
        charIndex++;
      }
      el.appendChild(wordSpan);
    });

    el.dataset.shimmerProcessed = 'true';
  });
}

/* --------------------------------------------------------------------------
   3. Loading Screen
   -------------------------------------------------------------------------- */
function runLoader(onComplete) {
  const loader = document.getElementById('loader');
  if (!loader) {
    if (onComplete) onComplete();
    return;
  }

  const shield = loader.querySelector('.loader-shield');
  const bar = loader.querySelector('.loader-bar');
  const barFill = loader.querySelector('.loader-bar-fill');
  const text = loader.querySelector('.loader-text');

  if (PREFERS_REDUCED) {
    loader.style.display = 'none';
    if (onComplete) onComplete();
    return;
  }

  const tl = gsap.timeline({
    onComplete: function () {
      gsap.to(loader, {
        opacity: 0,
        duration: 0.4,
        ease: 'power2.inOut',
        onComplete: function () {
          loader.style.display = 'none';
          if (onComplete) onComplete();
        }
      });
    }
  });

  tl.fromTo(shield,
    { opacity: 0, scale: 0.6 },
    { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.2)' }
  )
  .to(bar, { opacity: 1, duration: 0.2 }, '-=0.1')
  .fromTo(barFill,
    { scaleX: 0 },
    { scaleX: 1, duration: 1.2, ease: 'power1.inOut', transformOrigin: 'left center' },
    '-=0.1'
  )
  .to(text, { opacity: 1, duration: 0.3 }, '-=0.8');
}

/* --------------------------------------------------------------------------
   4. Hero Entrance (Home page only)
   -------------------------------------------------------------------------- */
function runHeroEntrance() {
  if (PAGE !== 'home') return;
  if (PREFERS_REDUCED) {
    gsap.set('.hero-shield-wrap, .hero-title, .hero-tagline, .hero-sub, .hero-cta, .scroll-hint', {
      opacity: 1, y: 0, scale: 1
    });
    return;
  }

  gsap.timeline()
    .fromTo('.hero-shield-wrap',
      { opacity: 0, scale: 0.7, y: 30 },
      { opacity: 1, scale: 1, y: 0, duration: 1, ease: 'back.out(1.4)' }
    )
    .fromTo('.hero-title',
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' },
      '-=0.4'
    )
    .fromTo('.hero-tagline',
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' },
      '-=0.3'
    )
    .fromTo('.hero-sub',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' },
      '-=0.3'
    )
    .fromTo('.hero-cta',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
      '-=0.2'
    )
    .fromTo('.scroll-hint',
      { opacity: 0 },
      { opacity: 1, duration: 0.8 },
      '-=0.1'
    );
}

/* --------------------------------------------------------------------------
   5. Navigation
   -------------------------------------------------------------------------- */
function initNavigation() {
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  const scrollHint = document.querySelector('.scroll-hint');

  // Scrolled state
  if (nav) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 60) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  // Mobile toggle
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      toggle.classList.toggle('open');
      links.classList.toggle('open');
    });

    // Close on link click
    links.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        toggle.classList.remove('open');
        links.classList.remove('open');
      });
    });
  }

  // Scroll hint
  if (scrollHint) {
    scrollHint.addEventListener('click', function () {
      if (PREFERS_REDUCED) {
        window.scrollTo(0, window.innerHeight);
      } else {
        gsap.to(window, {
          scrollTo: window.innerHeight,
          duration: 1,
          ease: 'power3.inOut'
        });
      }
    });
  }
}

/* --------------------------------------------------------------------------
   6. Scroll Progress Bar
   -------------------------------------------------------------------------- */
function initScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;

  window.addEventListener('scroll', function () {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;
    const scrollPercent = (scrollTop / (docHeight - winHeight)) * 100;
    bar.style.width = scrollPercent + '%';
  }, { passive: true });
}

/* --------------------------------------------------------------------------
   7. Section Animations (all pages)
   -------------------------------------------------------------------------- */
function initSectionAnimations() {
  if (PREFERS_REDUCED) {
    gsap.set('.section-eyebrow, .section-heading, .section-sub, .divider, .service-card, .scene-visual, .scene-text', {
      opacity: 1, y: 0, x: 0
    });
    return;
  }

  // Section text elements
  const sectionEls = gsap.utils.toArray('.section-eyebrow, .section-heading, .section-sub, .divider');
  sectionEls.forEach(function (el) {
    gsap.fromTo(el,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );
  });

  // Service cards with stagger
  const cardGroups = document.querySelectorAll('.services-grid, .service-cards');
  cardGroups.forEach(function (group) {
    const cards = group.querySelectorAll('.service-card');
    if (cards.length === 0) return;

    gsap.fromTo(cards,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: group,
          start: 'top 80%',
          toggleActions: 'play none none none'
        }
      }
    );
  });

  // Scene elements (story page) — supports both legacy and new selectors
  gsap.utils.toArray('.scene-visual, .story-scene-visual').forEach(function (el) {
    // Determine which side of the layout this visual is on by checking its sibling
    const scene = el.closest('.story-scene') || el.parentElement;
    const isReverse = scene && scene.querySelector('.reverse, .story-scene-inner.reverse');
    const fromX = isReverse ? -60 : 60;
    gsap.fromTo(el,
      { opacity: 0, x: fromX },
      {
        opacity: 1,
        x: 0,
        duration: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );
  });

  gsap.utils.toArray('.scene-text, .story-scene-text, .story-final-text').forEach(function (el) {
    const scene = el.closest('.story-scene') || el.parentElement;
    const isReverse = scene && scene.querySelector('.reverse, .story-scene-inner.reverse');
    const fromX = isReverse ? 60 : -60;
    gsap.fromTo(el,
      { opacity: 0, x: fromX, y: 20 },
      {
        opacity: 1,
        x: 0,
        y: 0,
        duration: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none'
        }
      }
    );
  });

  // Chapter labels — slide in with the text but slightly earlier
  gsap.utils.toArray('.story-chapter').forEach(function (el) {
    gsap.fromTo(el,
      { opacity: 0, x: -20 },
      {
        opacity: 1,
        x: 0,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none'
        }
      }
    );
  });
}

/* --------------------------------------------------------------------------
   8. Service Card 3D Tilt (desktop only)
   -------------------------------------------------------------------------- */
function initCardTilt() {
  if (IS_TOUCH || PREFERS_REDUCED) return;

  document.querySelectorAll('.service-card').forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;

      const rotateX = (mouseY / (rect.height / 2)) * -4;
      const rotateY = (mouseX / (rect.width / 2)) * 4;

      card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener('mouseleave', function () {
      card.style.transition = 'transform 0.4s ease';
      card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg)';
      // Remove inline transition after it completes so mousemove isn't sluggish
      setTimeout(function () {
        card.style.transition = '';
      }, 400);
    });
  });
}

/* --------------------------------------------------------------------------
   9. Process Line Animation (services page)
   -------------------------------------------------------------------------- */
function initProcessLine() {
  if (PAGE !== 'services') return;

  const lineFill = document.querySelector('.process-line-fill');
  const markers = gsap.utils.toArray('.step-marker');

  if (!lineFill || markers.length === 0) return;

  if (PREFERS_REDUCED) {
    lineFill.style.height = '100%';
    markers.forEach(function (m) { m.classList.add('lit'); });
    return;
  }

  const processSection = document.querySelector('.process-steps') || lineFill.closest('section');
  if (!processSection) return;

  gsap.fromTo(lineFill,
    { height: '0%' },
    {
      height: '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: processSection,
        start: 'top 70%',
        end: 'bottom 30%',
        scrub: 0.5,
        onUpdate: function (self) {
          const progress = self.progress;
          markers.forEach(function (marker, i) {
            const threshold = (i + 1) / (markers.length + 1);
            if (progress >= threshold) {
              marker.classList.add('lit');
            } else {
              marker.classList.remove('lit');
            }
          });
        }
      }
    }
  );
}

/* --------------------------------------------------------------------------
   10. Story Scene Parallax (story page)
   -------------------------------------------------------------------------- */
function initStoryParallax() {
  if (PAGE !== 'story' || PREFERS_REDUCED) return;

  gsap.utils.toArray('.scene-glow').forEach(function (glow) {
    gsap.to(glow, {
      y: -40,
      ease: 'none',
      scrollTrigger: {
        trigger: glow.closest('.story-scene') || glow,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1
      }
    });
  });
}

/* --------------------------------------------------------------------------
   11. FAQ Accordion (contact page)
   -------------------------------------------------------------------------- */
function initFAQ() {
  if (PAGE !== 'contact') return;

  const triggers = document.querySelectorAll('.faq-trigger');
  if (triggers.length === 0) return;

  triggers.forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      const item = trigger.closest('.faq-item');
      const answer = item.querySelector('.faq-answer');
      const inner = item.querySelector('.faq-answer-inner');
      const isOpen = item.classList.contains('open');

      // Close all other items
      document.querySelectorAll('.faq-item.open').forEach(function (openItem) {
        if (openItem !== item) {
          openItem.classList.remove('open');
          const openAnswer = openItem.querySelector('.faq-answer');
          const openTrigger = openItem.querySelector('.faq-trigger');
          if (openAnswer) openAnswer.style.maxHeight = '0';
          if (openTrigger) openTrigger.setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle current item
      if (isOpen) {
        item.classList.remove('open');
        if (answer) answer.style.maxHeight = '0';
        trigger.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('open');
        if (answer && inner) {
          answer.style.maxHeight = inner.scrollHeight + 'px';
        }
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* --------------------------------------------------------------------------
   12. Contact Form (contact page)
   -------------------------------------------------------------------------- */
function initContactForm() {
  if (PAGE !== 'contact') return;

  const form = document.getElementById('contactForm');
  if (!form) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Clear previous errors
    form.querySelectorAll('.form-field.error').forEach(function (field) {
      field.classList.remove('error');
    });

    let isValid = true;

    // Required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'service'];
    requiredFields.forEach(function (name) {
      const input = form.querySelector('[name="' + name + '"]');
      if (!input) return;

      const field = input.closest('.form-field');
      const value = input.value.trim();

      if (!value) {
        if (field) field.classList.add('error');
        isValid = false;
      }
    });

    // Email validation
    const emailInput = form.querySelector('[name="email"]');
    if (emailInput && emailInput.value.trim() && !emailRegex.test(emailInput.value.trim())) {
      const field = emailInput.closest('.form-field');
      if (field) field.classList.add('error');
      isValid = false;
    }

    if (!isValid) return;

    // Build a mailto: link populated with all the form fields and open
    // the visitor's email client. The actual send happens from their email
    // app, with info@silvershield.llc as the recipient.
    const get = function (name) {
      const el = form.querySelector('[name="' + name + '"]');
      return el ? el.value.trim() : '';
    };

    const firstName = get('firstName');
    const lastName  = get('lastName');
    const subject = 'New Discovery Call Request — ' + firstName + ' ' + lastName;
    const body = [
      'Name: ' + firstName + ' ' + lastName,
      'Email: ' + get('email'),
      'Company: ' + (get('company') || '(not provided)'),
      'Service Interest: ' + get('service'),
      '',
      'Message:',
      get('message') || '(no message provided)',
      '',
      '---',
      'Sent from the silvershield.llc contact form'
    ].join('\n');

    const mailto = 'mailto:info@silvershield.llc'
      + '?subject=' + encodeURIComponent(subject)
      + '&body='   + encodeURIComponent(body);

    // Open the email client. Show the success message a moment later so the
    // visitor sees confirmation even if the mail app pops over the page.
    window.location.href = mailto;
    setTimeout(showFormSuccess, 700);
  });

  // Clear error on input
  form.querySelectorAll('input, select, textarea').forEach(function (input) {
    input.addEventListener('input', function () {
      const field = input.closest('.form-field');
      if (field) field.classList.remove('error');
    });
  });
}

function showFormSuccess() {
  const form = document.getElementById('contactForm');
  const success = document.querySelector('.form-success');
  const celebration = document.getElementById('celebration');

  if (form) form.style.display = 'none';
  if (success) {
    success.style.display = 'block';
    if (!PREFERS_REDUCED) {
      gsap.fromTo(success,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );
    }
  }

  // Trigger celebration overlay
  if (celebration) {
    celebration.classList.add('active');
    celebration.addEventListener('click', function dismissCelebration() {
      celebration.classList.remove('active');
      celebration.removeEventListener('click', dismissCelebration);
    });
  }
}

/* --------------------------------------------------------------------------
   13. Back to Top Button
   -------------------------------------------------------------------------- */
function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', function () {
    if (window.scrollY > 500) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });

  btn.addEventListener('click', function () {
    if (PREFERS_REDUCED) {
      window.scrollTo(0, 0);
    } else {
      gsap.to(window, {
        scrollTo: 0,
        duration: 1,
        ease: 'power3.inOut'
      });
    }
  });
}

/* --------------------------------------------------------------------------
   14. Page-Hero Entrance (inner pages)
   -------------------------------------------------------------------------- */
function runPageHeroEntrance() {
  if (PAGE === 'home') return;

  // Support both .page-hero and .story-hero (story page uses .story-hero)
  const heroRoot = document.querySelector('.story-hero, .page-hero');
  if (!heroRoot) return;

  const eyebrow = heroRoot.querySelector('.section-eyebrow');
  const heading = heroRoot.querySelector('h1');
  const subtitle = heroRoot.querySelector('.story-hero-sub, p');
  const divider = heroRoot.querySelector('.story-divider');
  const prelude = heroRoot.querySelector('.story-hero-prelude');

  if (PREFERS_REDUCED) {
    [eyebrow, heading, subtitle, divider, prelude].forEach(function (el) {
      if (el) gsap.set(el, { opacity: 1, y: 0 });
    });
    return;
  }

  const tl = gsap.timeline();

  if (eyebrow) {
    tl.fromTo(eyebrow,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
    );
  }
  if (heading) {
    tl.fromTo(heading,
      { opacity: 0, y: 35 },
      { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' },
      eyebrow ? '-=0.3' : 0
    );
  }
  if (subtitle) {
    tl.fromTo(subtitle,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' },
      '-=0.4'
    );
  }
  if (divider) {
    tl.fromTo(divider,
      { opacity: 0, scaleX: 0.4 },
      { opacity: 1, scaleX: 1, duration: 0.6, ease: 'power2.out' },
      '-=0.3'
    );
  }
  if (prelude) {
    tl.fromTo(prelude,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' },
      '-=0.2'
    );
  }
}

/* --------------------------------------------------------------------------
   Wizard Narrator — pre-recorded MP3 narration triggered by hover (with
   600ms delay) or by clicking the "Hear the Tale" button. Hover starts
   playback tentatively (mouse-leave pauses it). Button starts playback
   committed (mouse-leave does NOT pause it). Only one chapter plays at a
   time; switching chapters stops the previous one.
   -------------------------------------------------------------------------- */
function initWizardNarrator() {
  // Touch devices have no hover — they get the button only (no auto-play on tap).
  const HOVER_DELAY = 600; // ms

  const blocks = document.querySelectorAll('[data-narration]');
  if (!blocks.length) return;

  // One Audio object reused across all chapters keeps memory low and
  // guarantees only one stream plays at any time.
  const audio = new Audio();
  audio.preload = 'none';

  let currentBlock = null;
  let hoverTimer = null;
  let committed = false; // true when started via button click

  function setPlayingUI(block, isPlaying) {
    if (!block) return;
    block.classList.toggle('is-narrating', isPlaying);
    const btn = block.querySelector('.wizard-btn');
    if (btn) {
      btn.classList.toggle('is-playing', isPlaying);
      const label = btn.querySelector('.wizard-btn-label');
      if (label) label.textContent = isPlaying ? 'Hush the Tale' : 'Hear the Tale';
    }
  }

  function stop(block) {
    if (!block) return;
    audio.pause();
    setPlayingUI(block, false);
    if (currentBlock === block) {
      currentBlock = null;
      committed = false;
    }
  }

  function play(block, viaCommit) {
    // If we're already playing this block, just upgrade commit state if needed.
    if (currentBlock === block && !audio.paused) {
      if (viaCommit) committed = true;
      return;
    }
    // Stop whatever was previously playing.
    if (currentBlock && currentBlock !== block) stop(currentBlock);

    const src = block.dataset.narration;
    const absoluteSrc = new URL(src, location.href).href;
    if (audio.src !== absoluteSrc) {
      audio.src = src;
    } else {
      // Same chapter being resumed — start from beginning for clarity.
      audio.currentTime = 0;
    }
    const playPromise = audio.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function (err) {
        // Autoplay policies may reject playback that wasn't initiated by a
        // direct user gesture. Hover doesn't always count. Silently fail —
        // the button click will work because that IS a gesture.
        console.warn('Wizard narration blocked by browser autoplay policy:', err);
        setPlayingUI(block, false);
        if (currentBlock === block) {
          currentBlock = null;
          committed = false;
        }
      });
    }
    currentBlock = block;
    committed = !!viaCommit;
    setPlayingUI(block, true);
  }

  audio.addEventListener('ended', function () {
    if (currentBlock) setPlayingUI(currentBlock, false);
    currentBlock = null;
    committed = false;
  });

  blocks.forEach(function (block) {
    const btn = block.querySelector('.wizard-btn');

    // Hover-with-delay (skipped on touch devices — they get button only)
    if (!IS_TOUCH) {
      block.addEventListener('mouseenter', function () {
        if (currentBlock === block && !audio.paused) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () { play(block, false); }, HOVER_DELAY);
      });
      block.addEventListener('mouseleave', function () {
        clearTimeout(hoverTimer);
        if (currentBlock === block && !committed) {
          stop(block);
        }
      });
    }

    if (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        clearTimeout(hoverTimer);
        if (currentBlock === block && !audio.paused) {
          stop(block);
        } else {
          play(block, true);
        }
      });
    }
  });
}

/* --------------------------------------------------------------------------
   Initialization
   -------------------------------------------------------------------------- */
function init() {
  // Features that run on all pages
  initCustomCursor();
  initClickStars();
  initShimmerText();   // Split shimmer-text elements into letter spans BEFORE GSAP touches them
  initNavigation();
  initScrollProgress();
  initBackToTop();

  // Run loader, then trigger entrance animations
  runLoader(function () {
    runHeroEntrance();
    runPageHeroEntrance();

    // Delay section animations slightly so ScrollTrigger measures correctly
    setTimeout(function () {
      initSectionAnimations();
      initCardTilt();
      initProcessLine();
      initStoryParallax();
      initFAQ();
      initContactForm();
      initWizardNarrator();
      ScrollTrigger.refresh();
    }, 100);
  });
}

document.addEventListener('DOMContentLoaded', init);
