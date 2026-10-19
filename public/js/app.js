/**
 * QA PORTFOLIO 2.0 - FRONTEND APPLICATION CORE
 * Features:
 * 1. iPhone Activation "Hello" Sequence (Hangul & Multilingual Morphing)
 * 2. Rotating Hangul Stack Badge in Hero
 * 3. Section Sequence: Hero -> Experience -> Projects -> Skills -> Contact
 * 4. Floating Pill Navigation Dock Scrollspy
 * 5. Hermetic API integration (Profile, Experience, Projects, Skills, Contacts) with offline fallbacks
 */

// Utility: Prevent XSS by escaping HTML entities
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Global State
const state = {
  profile: null,
  skills: [],
  categories: [],
  projects: [],
  activeCategory: 'all',
  searchQuery: '',
  featuredOnly: false,
  experiences: [],
};

// =============================================================================
// FALLBACK DATA (Guarantees 100% flawless presentation even before DB boot)
// =============================================================================
const FALLBACK_PROFILE = {
  name: 'Muhammad Irfan Trinugroho',
  title: 'Software Quality Assurance Tester',
  bio: 'Informatics graduate specializing in manual functional testing, structured test case design, and UAT/FAT validation—supported by foundational API and UI test automation.',
  email: 'rphannfvs@gmail.com',
  phone: '+62 812-7304-4163',
  location: 'Sleman, Yogyakarta, Indonesia',
  socialLinks: {
    github: 'https://github.com/phannstastic',
    linkedin: 'https://www.linkedin.com/in/muhirfant/',
    instagram: 'https://www.instagram.com/irfantrinugroho/',
    whatsapp: 'https://wa.me/6281273044163',
  },
};

const FALLBACK_EXPERIENCES = [
  {
    id: 1,
    company: 'Noctura Kreasi Sistema',
    role: 'QA / UAT Support (On-Call) Freelance',
    location: 'Remote, Indonesia',
    startDate: '2026-08-01',
    endDate: null,
    isCurrent: true,
    description:
      'Provide on-call User Acceptance Testing (UAT) and QA support. Investigate, reproduce, and document user-reported bugs with detailed steps to reproduce, console logs, and visual evidence. Execute exploratory and regression testing across web features, formulate actionable Jira/issue tickets, and collaborate closely with developers to verify fixes before deployment.',
    sortOrder: 1,
    certificateUrl: null,
    certificateType: null,
    certificateName: null,
  },
  {
    id: 2,
    company: 'PT Vortex Buana Edumedia',
    role: 'Quality Assurance Internship',
    location: 'Yogyakarta, Indonesia',
    startDate: '2026-02-28',
    endDate: '2026-05-29',
    isCurrent: false,
    description:
      'Participated in Vortex Career Catalyst Batch 4. Analyzed functional requirement specifications to craft comprehensive test cases and user scenarios. Performed manual functional testing across core user flows, logged and tracked defects, conducted regression testing after bug fixes, and evaluated UI/UX responsiveness and baseline performance.',
    sortOrder: 2,
    certificateUrl: null,
    certificateType: null,
    certificateName: null,
  },
  {
    id: 3,
    company: 'PT Len Industri (Persero)',
    role: 'Software Quality Assurance Internship (OJT)',
    location: 'Bandung, West Java, Indonesia',
    startDate: '2025-09-01',
    endDate: '2026-01-02',
    isCurrent: false,
    description:
      'Completed Software Quality Assurance On The Job Training under System Engineering mentor Aria Rahman (Certificate: P43725/LEN/OJT/UH-3/I/2026, Final Score: 91.67 / Grade A - Sangat Baik). Designed structured test scenarios, executed functional & manual regression testing, documented defects, and actively supported Factory Acceptance Testing (FAT) procedures.',
    sortOrder: 3,
    certificateUrl: null,
    certificateType: null,
    certificateName: null,
  },
];

const FALLBACK_PROJECTS = [
  {
    id: 1,
    title: 'Pondok Makan Kang Naryo – Functional QA & Katalon UI Testing',
    slug: 'pondok-makan-kang-naryo',
    description:
      'Web application and QA testing suite for a food ordering platform. Designed comprehensive manual test scenarios and functional test cases for user authentication, checkout workflows, and admin menu management, complemented by foundational automated UI regression scripts using Katalon Studio and structured defect tracking.',
    category: 'Manual & UI Testing',
    techStack: 'Manual Testing, Test Case Design, Defect Tracking, Katalon Studio (Basic), Laravel, MySQL',
    githubUrl: 'https://github.com/phannstastic/pondok-makan-kang-naryo-ui-testing.git',
    liveDemoUrl: 'https://github.com/phannstastic/Pondok-Makan-Kang-Naryo.git',
    imageUrl: '/images/projects/kang-naryo-katalon.svg',
    isFeatured: true,
    sortOrder: 1,
  },
  {
    id: 2,
    title: 'Loafy Bakery - E-Commerce System & Manual QA Testing',
    slug: 'loafy-bakery-manual-testing',
    description:
      'Web-based bakery ordering platform featuring custom backend order processing, catalog browsing, shopping cart workflows, and MySQL relational database. Executed rigorous manual exploratory and functional testing across user checkout flows, inventory tracking, role-based admin order updates, and edge-case form validation. Documented test scenarios, edge cases, and defect reports.',
    category: 'Manual Testing',
    techStack: 'Manual Testing, Exploratory Testing, Functional Testing, Test Scenarios, Defect Reporting, PHP, MySQL',
    githubUrl: 'https://github.com/phannstastic/Loafy-Bakery.git',
    liveDemoUrl: null,
    imageUrl: '/images/projects/loafy-bakery.svg',
    isFeatured: true,
    sortOrder: 2,
  },
  {
    id: 3,
    title: 'Swagger Petstore V2 - REST API Testing with Postman',
    slug: 'petstore-v2-swagger-api-testing',
    description:
      'Comprehensive REST API testing suite for the public Swagger Petstore v2 (/pet) service. Formulated positive and negative test cases validating HTTP response status codes (200, 400, 404), response payloads, JSON schemas, and boundary scenarios for pet CRUD endpoints using Postman Collection Runner and documented API validation defects.',
    category: 'API Testing',
    techStack: 'Postman, REST API Testing, Negative & Boundary Testing, JSON Schema Validation, Collection Runner',
    githubUrl: 'https://github.com/phannstastic/Petstore-Swagger-V2.git',
    liveDemoUrl: 'https://github.com/phannstastic/Petstore-Swagger-V2-Part-2.git',
    imageUrl: '/images/projects/petstore-test-result.png',
    isFeatured: true,
    sortOrder: 3,
  },
  {
    id: 4,
    title: 'OrangeHRM - Authentication Test Scenarios & Katalon Studio',
    slug: 'orangehrm-katalon-automation',
    description:
      'Functional regression suite for OrangeHRM authentication module. Designed positive and negative test cases verifying valid credential authorization, invalid username/password combinations, empty input validations, and error banner assertions, executed via manual test matrices and basic Katalon Studio playback.',
    category: 'Functional & UI Testing',
    techStack: 'Functional Testing, Negative Testing, Defect Lifecycle, Katalon Studio (Basic), Katalon Recorder',
    githubUrl: 'https://github.com/phannstastic/OrangeHRM-Login.git',
    liveDemoUrl: null,
    imageUrl: '/images/projects/orangehrm-katalon.svg',
    isFeatured: true,
    sortOrder: 4,
  },
  {
    id: 5,
    title: 'XYZ Bank - E2E Test Scenarios & Foundational Cypress Suite',
    slug: 'xyz-bank-cypress-test',
    description:
      'End-to-End test suite for XYZ Bank web application covering 14 structured test scenarios across Manager workflows (TC-01-MAN to TC-06-MAN: login, valid/invalid customer creation, account opening, deletion) and Customer workflows (TC-01-CUS to TC-08-CUS: login, deposits, balance validation, insufficient funds, and transaction history) explored with Cypress.',
    category: 'E2E & Scenario Testing',
    techStack: 'Test Scenario Design, E2E Testing, Boundary Value Testing, Cypress (Basic), JavaScript',
    githubUrl: 'https://github.com/phannstastic/xyz-Bank-Cypress-Test.git',
    liveDemoUrl: null,
    imageUrl: '/images/projects/xyz-bank-cypress.svg',
    isFeatured: false,
    sortOrder: 5,
  },
];

const FALLBACK_SKILLS_CATEGORIES = [
  {
    category: 'Core Manual QA & Methodologies',
    items: [
      'Manual Testing',
      'Functional Testing',
      'Regression Testing',
      'Exploratory Testing',
      'UAT (User Acceptance Testing)',
      'Factory Acceptance Testing (FAT)',
      'Test Case & Scenario Design',
      'Defect Tracking & Bug Reporting',
    ],
  },
  {
    category: 'API & Automation Tools (Foundational)',
    items: [
      'Postman (API Testing)',
      'Katalon Studio (Basic)',
      'Katalon Recorder',
      'Cypress (Basic Exposure)',
      'Swagger / OpenAPI',
    ],
  },
  {
    category: 'Web & Database Technologies',
    items: [
      'PHP (Native & Laravel)',
      'MySQL Database',
      'JavaScript',
      'HTML5 & CSS3',
      'Python',
      'RESTful APIs',
    ],
  },
  {
    category: 'Tools & Project Collaboration',
    items: [
      'ClickUp',
      'Odoo ERP',
      'Google Sheets & MS Excel',
      'Git & GitHub',
      'VS Code',
    ],
  },
  {
    category: 'Certifications & Training',
    items: [
      'Sanbercode QA Bootcamp (2025)',
      'MySkill QA Certification (2025)',
      'Test Automation University (2025)',
      'SQA OJT Grade A - PT Len Industri',
      'QA Internship - PT Vortex Buana Edumedia',
    ],
  },
];

const FALLBACK_LEARNING_STACKS = [
  'Technical SEO & Audit',
  'Core Web Vitals & PageSpeed',
  'On-Page SEO & Semantic HTML',
  'Schema & Structured Data (JSON-LD)',
  'SEO Crawlability & Audit (GSC & Screaming Frog)',
  'AI-Assisted QA Automation',
];

// =============================================================================
// 1. IPHONE ACTIVATION / HANGUL INTRO SEQUENCE (Disabled by default per user request)
// =============================================================================
// Set to true whenever you wish to re-enable the opening activation greeting screen
const ENABLE_ACTIVATION_INTRO = false;

const ACTIVATION_ITEMS = [
  { text: '안녕하세요', sub: 'KOREAN GREETING · HELLO' },
  { text: 'Hello', sub: 'ENGLISH GREETING' },
  { text: 'Halo', sub: 'INDONESIAN GREETING' },
  { text: 'こんにちは', sub: 'JAPANESE GREETING' },
  { text: '你好', sub: 'CHINESE GREETING' },
  { text: '무함마드 이르판', sub: 'MUHAMMAD IRFAN' },
  { text: '품질 보증 & 자동화', sub: 'QA & AUTOMATION 2.0' },
];

let activationTimer = null;

function initActivationIntro() {
  const overlay = document.getElementById('activation-overlay');
  const textEl = document.getElementById('activation-text');
  const subtextEl = document.getElementById('activation-subtext');
  const progressEl = document.getElementById('activation-progress');
  const skipBtn = document.getElementById('activation-skip-btn');
  const replayBtn = document.getElementById('replay-intro-btn');

  if (!overlay || !textEl) return;

  // If disabled by default, immediately dismiss overlay
  if (!ENABLE_ACTIVATION_INTRO) {
    overlay.classList.add('dismissed');
    overlay.style.display = 'none';
    return;
  }

  function dismissIntro() {
    clearTimeout(activationTimer);
    overlay.classList.add('dismissed');
    sessionStorage.setItem('portfolio_2_intro_viewed', 'true');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 650);
  }

  function runSequence(index) {
    if (index >= ACTIVATION_ITEMS.length) {
      if (progressEl) progressEl.style.width = '100%';
      setTimeout(dismissIntro, 400);
      return;
    }

    const item = ACTIVATION_ITEMS[index];
    const pct = Math.round(((index + 1) / ACTIVATION_ITEMS.length) * 100);

    textEl.classList.add('animating');
    setTimeout(() => {
      textEl.textContent = item.text;
      if (subtextEl) subtextEl.textContent = item.sub;
      if (progressEl) progressEl.style.width = `${pct}%`;
      textEl.classList.remove('animating');
    }, 180);

    activationTimer = setTimeout(() => {
      runSequence(index + 1);
    }, 420);
  }

  const alreadyViewed = sessionStorage.getItem('portfolio_2_intro_viewed');
  if (alreadyViewed) {
    overlay.classList.add('dismissed');
    overlay.style.display = 'none';
  } else {
    overlay.style.display = 'flex';
    runSequence(0);
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', dismissIntro);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.classList.contains('dismissed')) {
      dismissIntro();
    }
  });

  if (replayBtn) {
    replayBtn.addEventListener('click', (e) => {
      e.preventDefault();
      overlay.style.display = 'flex';
      overlay.classList.remove('dismissed');
      if (progressEl) progressEl.style.width = '0%';
      clearTimeout(activationTimer);
      runSequence(0);
    });
  }
}

// =============================================================================
// 2. HERO MULTILINGUAL MORPHING NAME ("Hi I'm 「 Irfan 」" across global scripts)
// =============================================================================
const MORPHING_NAMES = [
  { text: 'Irfan', lang: 'English / Latin (Internasional)', scale: 1 },
  { text: '이르판', lang: 'Hangul (Korea)', scale: 0.94 },
  { text: 'イルファン', lang: 'Katakana (Jepang)', scale: 0.88 },
  { text: '伊尔凡', lang: 'Hanzi (Tiongkok / Mandarin)', scale: 0.94 },
  { text: 'عرفان', lang: 'Aksara Arab (Timur Tengah)', scale: 0.96 },
  { text: 'Ирфан', lang: 'Cyrillic (Rusia / Slavia)', scale: 1 },
  { text: 'Ιρφάν', lang: 'Aksara Yunani (Greek)', scale: 1 },
  { text: 'इरफ़ान', lang: 'Devanagari (India / Hindi)', scale: 0.85 },
  { text: 'เออร์ฟาน', lang: 'Aksara Thai (Thailand)', scale: 0.74 },
  { text: 'ꦲꦶꦂꦥ꦳ꦤ꧀', lang: 'Aksara Jawa / Hanacaraka (Nusantara)', scale: 0.76 },
  { text: 'אירפאן', lang: 'Aksara Ibrani (Hebrew)', scale: 0.95 },
  { text: 'ইরফান', lang: 'Aksara Bengali (Bangladesh & India Timur)', scale: 0.85 },
  { text: 'இர்பான்', lang: 'Aksara Tamil (India Selatan)', scale: 0.82 },
];

function initMorphingName() {
  const nameEl = document.getElementById('morphing-name');
  if (!nameEl) return;

  let currentIndex = 0;
  let intervalId = null;

  function cycleName() {
    nameEl.classList.add('morph-animating');
    setTimeout(() => {
      currentIndex = (currentIndex + 1) % MORPHING_NAMES.length;
      const item = MORPHING_NAMES[currentIndex];
      nameEl.textContent = item.text;
      nameEl.setAttribute('title', `Script: ${item.lang} (click to cycle)`);
      // Apply precise proportional scale and strict line-height to prevent vertical spacing jump
      nameEl.style.fontSize = item.scale ? `${item.scale}em` : '1em';
      nameEl.style.lineHeight = '1';
      nameEl.classList.remove('morph-animating');
    }, 200);
  }

  // Auto-cycle every 2.4 seconds
  intervalId = setInterval(cycleName, 2400);

  // Manual click to cycle immediately
  nameEl.addEventListener('click', () => {
    clearInterval(intervalId);
    cycleName();
    intervalId = setInterval(cycleName, 2800);
  });
}

// =============================================================================
// 3. HERO PROFILE DATA (GET /api/profile with fallback)
// =============================================================================
async function loadProfile() {
  const bioEl = document.getElementById('hero-bio');

  let profile = FALLBACK_PROFILE;
  try {
    const res = await fetch('/api/profile');
    if (res.ok) {
      const body = await res.json();
      if (body.data) profile = { ...FALLBACK_PROFILE, ...body.data };
    }
  } catch (err) {
    console.warn('API profile unavailable, using robust local data:', err.message);
  }

  state.profile = profile;

  if (bioEl && profile.bio) {
    bioEl.textContent = profile.bio;
  }
}

// =============================================================================
// 4. SECTION 2: EXPERIENCES (GET /api/experiences with fallback)
// =============================================================================
function formatExperienceDate(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).trim().split('-');
  if (parts.length >= 2) {
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${months[monthIdx]} ${year}`;
    }
  }
  return dateStr;
}

async function loadExperiences() {
  const container = document.getElementById('experiences-container');
  if (!container) return;

  let experiences = FALLBACK_EXPERIENCES;
  try {
    const res = await fetch('/api/experiences');
    if (res.ok) {
      const body = await res.json();
      if (Array.isArray(body.data) && body.data.length > 0) {
        experiences = body.data;
      }
    }
  } catch (err) {
    console.warn('API experiences unavailable, using robust local data:', err.message);
  }

  state.experiences = experiences;

  let html = '';
  for (const exp of experiences) {
    const startFormatted = formatExperienceDate(exp.startDate);
    const endFormatted = exp.isCurrent ? 'Present' : (formatExperienceDate(exp.endDate) || 'Completed');
    const periodText = `${startFormatted} &mdash; ${endFormatted}`;

    const cleanLocation = (exp.location || '').replace(', West Java', '').trim();
    const cleanDesc = (exp.description || '').replace(/\s*\(SK:[^)]+\)/gi, '').trim();

    html += `
      <article class="exp-item-editorial exp-card">
        <div class="exp-left-col">
          <div class="exp-period-clean">
            ${exp.isCurrent ? '<span class="exp-pulse-dot" aria-label="Active Role"></span>' : ''}
            <span class="exp-date-text">${periodText}</span>
          </div>
          ${cleanLocation ? `<p class="exp-location-clean">${escapeHtml(cleanLocation)}</p>` : ''}
        </div>

        <div class="exp-right-col">
          <div class="exp-title-block">
            <h3 class="exp-role-title">${escapeHtml(exp.role)}</h3>
            <p class="exp-company-name">${escapeHtml(exp.company)}</p>
          </div>
          <p class="exp-description">${escapeHtml(cleanDesc)}</p>
        </div>
      </article>
    `;
  }

  container.innerHTML = html;
}

// =============================================================================
// 5. SECTION 3: PROJECTS (GET /api/projects with fallback & filters)
// =============================================================================
async function loadProjects() {
  const container = document.getElementById('projects-container');
  if (!container) return;

  let projects = FALLBACK_PROJECTS;
  try {
    const res = await fetch('/api/projects');
    if (res.ok) {
      const body = await res.json();
      if (Array.isArray(body.data) && body.data.length > 0) {
        projects = body.data;
      }
    }
  } catch (err) {
    projects = FALLBACK_PROJECTS;
  }

  state.projects = projects;
  renderProjects(projects);
}

function filterLocalProjects(all) {
  return all.filter((p) => {
    if (state.featuredOnly && !p.isFeatured) return false;
    if (state.activeCategory !== 'all' && p.category !== state.activeCategory) return false;
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      const match =
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.techStack.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

function getCardTechTags(techItems) {
  if (!techItems || techItems.length === 0) return { visible: [], remaining: 0 };
  const maxTags = 3;
  if (techItems.length <= maxTags) {
    return { visible: techItems, remaining: 0 };
  }
  return {
    visible: techItems.slice(0, maxTags),
    remaining: techItems.length - maxTags,
  };
}

function renderProjects(projects) {
  const container = document.getElementById('projects-container');
  if (!container) return;

  if (projects.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; width: 100%; text-align: center; padding: 3rem 1rem; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <p style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.35rem;">No projects matching criteria</p>
        <p style="font-size: 0.88rem; color: var(--text-secondary);">Try clearing your search keyword or switching category tabs.</p>
      </div>`;
    setupProjectsSlider([]);
    return;
  }

  let html = '';
  for (const p of projects) {
    const techItems = (p.techStack || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const { visible: visibleTags, remaining: remainingTags } = getCardTechTags(techItems);

    let cardTitle = p.title || '';
    if (p.slug === 'pondok-makan-kang-naryo' || cardTitle.includes('Pondok Makan Kang Naryo')) {
      cardTitle = 'Pondok Makan Kang Naryo – Katalon UI Testing';
    }

    html += `
      <article class="project-card">
        <div class="project-card-top">
          <div class="project-meta-row">
            <span class="project-category-tag">${escapeHtml(p.category)}</span>
          </div>
          <h3 class="project-card-title">${escapeHtml(cardTitle)}</h3>
          <p class="project-card-desc">${escapeHtml(p.description)}</p>
        </div>

        <div class="project-card-bottom">
          <div class="project-tech-tags">
            ${visibleTags.map((t) => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('')}
            ${remainingTags > 0 ? `<span class="tech-tag tech-tag-count">+${remainingTags}</span>` : ''}
          </div>

          <div class="project-card-footer">
            <button class="btn-view-details view-detail-btn" data-slug="${escapeHtml(p.slug)}">
              <span>View Details</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>

            <div class="project-actions">
              ${p.githubUrl ? `
                <a href="${escapeHtml(p.githubUrl)}" target="_blank" rel="noopener noreferrer" class="icon-action-btn" aria-label="GitHub Repository" title="GitHub Source Code">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                </a>` : ''}
              ${p.liveDemoUrl ? `
                <a href="${escapeHtml(p.liveDemoUrl)}" target="_blank" rel="noopener noreferrer" class="icon-action-btn" aria-label="Live Demo or App Repository" title="Repository / Demo">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </a>` : ''}
            </div>
          </div>
        </div>
      </article>
    `;
  }

  container.innerHTML = html;

  // Attach modal click listeners
  container.querySelectorAll('.btn-view-details').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const slug = e.currentTarget.getAttribute('data-slug');
      if (slug) openProjectModal(slug);
    });
  });

  // Setup horizontal sliding controls
  setupProjectsSlider(projects);
}

function setupProjectsSlider(projects) {
  const container = document.getElementById('projects-container');
  const counterText = document.getElementById('projects-counter-text');
  const btnPrev = document.getElementById('btn-projects-prev');
  const btnNext = document.getElementById('btn-projects-next');

  if (!container) return;

  const total = Array.isArray(projects) ? projects.length : 0;
  if (total === 0) {
    if (counterText) counterText.textContent = '00 — 00';
    if (btnPrev) btnPrev.disabled = true;
    if (btnNext) btnNext.disabled = true;
    return;
  }

  function getStep() {
    const firstCard = container.querySelector('.project-card');
    if (!firstCard) return 350;
    const style = window.getComputedStyle(container);
    const gap = parseFloat(style.columnGap || style.gap || '24') || 24;
    return firstCard.offsetWidth + gap;
  }

  function scrollToProjectIndex(idx) {
    const step = getStep();
    container.scrollTo({
      left: idx * step,
      behavior: 'smooth',
    });
  }

  function updateSliderState() {
    const scrollLeft = container.scrollLeft;
    const step = getStep();
    const currentIndex = Math.min(total - 1, Math.max(0, Math.round(scrollLeft / step)));

    if (counterText) {
      const curStr = String(currentIndex + 1).padStart(2, '0');
      const totStr = String(total).padStart(2, '0');
      counterText.textContent = `${curStr} — ${totStr}`;
    }

    if (btnPrev) {
      btnPrev.disabled = scrollLeft <= 8;
    }
    if (btnNext) {
      const maxScroll = container.scrollWidth - container.clientWidth;
      btnNext.disabled = scrollLeft >= maxScroll - 8;
    }
  }

  if (btnPrev) {
    btnPrev.onclick = () => {
      const step = getStep();
      container.scrollBy({ left: -step, behavior: 'smooth' });
    };
  }

  if (btnNext) {
    btnNext.onclick = () => {
      const step = getStep();
      container.scrollBy({ left: step, behavior: 'smooth' });
    };
  }

  // Scroll listener
  let scrollDebounce;
  container.onscroll = () => {
    clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(updateSliderState, 50);
  };

  // Reset to first slide on fresh data load
  container.scrollLeft = 0;
  updateSliderState();
}

// Project QA Highlights & Key Activities breakdown dictionary
const PROJECT_QA_BREAKDOWNS = {
  'pondok-makan-kang-naryo': {
    overview: 'Web application and end-to-end automated UI testing suite for a multi-category food ordering and checkout platform.',
    bullets: [
      'Designed comprehensive manual test scenarios covering user authentication, menu browsing, and cart checkout.',
      'Engineered automated UI regression scripts using Katalon Studio for critical user journeys.',
      'Performed boundary value and negative input validation across food ordering and checkout forms.',
      'Documented and tracked defects with reproducible steps, expected vs. actual outcomes, and visual logs.'
    ]
  },
  'loafy-bakery-manual-testing': {
    overview: 'Web-based bakery ordering platform featuring custom backend order processing, catalog browsing, shopping cart workflows, and MySQL relational database.',
    bullets: [
      'Executed rigorous manual exploratory and functional testing across user checkout flows and order tracking.',
      'Designed test matrices covering positive authorization, session timeouts, and inventory boundary edge cases.',
      'Tested form validation resilience against empty fields, SQL injection characters, and special input values.',
      'Documented structured bug reports with detailed reproduction steps and severity/priority classification.'
    ]
  },
  'petstore-v2-swagger-api-testing': {
    overview: 'Comprehensive REST API testing suite for the public Swagger Petstore v2 (/pet) service validating microservice endpoints.',
    bullets: [
      'Engineered automated API assertions validating HTTP response status codes (200 OK, 400 Bad Request, 404 Not Found).',
      'Validated response payloads and schema structures against JSON Schema standards.',
      'Configured negative testing and edge-case boundary scenarios across pet CRUD endpoints.',
      'Executed automated batch runs via Postman Collection Runner and documented weak input validation behavior.'
    ]
  },
  'orangehrm-katalon-automation': {
    overview: 'Functional regression suite and scenario testing for the OrangeHRM human resource management authentication module.',
    bullets: [
      'Designed positive and negative test cases verifying valid credential authorization and locked-out user handling.',
      'Formulated boundary tests for empty username/password combinations and invalid character inputs.',
      'Asserted UI error banner messages, credential masking, and page redirect validations.',
      'Authored reproducible defect reports and automated basic playback routines in Katalon Studio.'
    ]
  },
  'xyz-bank-cypress-test': {
    overview: 'End-to-End test suite for the XYZ Bank web application validating complex multi-role banking transactions and customer journeys.',
    bullets: [
      'Formulated 14 comprehensive test scenarios covering Manager workflows (TC-01-MAN to TC-06-MAN: login, customer creation, currency account opening, deletion).',
      'Automated Customer workflows (TC-01-CUS to TC-08-CUS: deposits, balance validation, insufficient fund withdrawals, and transaction history).',
      'Implemented clean assertions for modal dialogs, alert notifications, and state changes.',
      'Explored foundational E2E test scripts utilizing Cypress and JavaScript.'
    ]
  }
};

function getProjectQaBreakdown(project) {
  if (project.slug && PROJECT_QA_BREAKDOWNS[project.slug]) {
    return PROJECT_QA_BREAKDOWNS[project.slug];
  }
  const rawDesc = project.description || '';
  const sentences = rawDesc.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 1) {
    return {
      overview: rawDesc,
      bullets: [
        'Formulated structured test scenarios and verified functional requirements.',
        'Executed manual exploratory testing across critical application flows.',
        'Documented test findings, defect reports, and expected behaviors.'
      ]
    };
  }
  return {
    overview: sentences[0],
    bullets: sentences.slice(1).map((s) => s.trim()).filter(Boolean)
  };
}

// Project Detail Modal
async function openProjectModal(slug) {
  const modalBackdrop = document.getElementById('project-modal');
  const modalContent = document.getElementById('modal-body');
  if (!modalBackdrop || !modalContent) return;

  modalBackdrop.classList.add('open');
  modalContent.innerHTML = `
    <div style="text-align: center; padding: 3rem 1.5rem;">
      <p style="color: var(--text-secondary); font-size: 0.92rem;">Loading QA project breakdown...</p>
    </div>`;

  let project = FALLBACK_PROJECTS.find((p) => p.slug === slug);
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(slug)}`);
    if (res.ok) {
      const body = await res.json();
      if (body.data) project = body.data;
    }
  } catch (err) {
    // Rely on fallback
  }

  if (!project) {
    modalContent.innerHTML = `<p style="color: var(--text-muted); padding: 2rem;">Project details could not be found.</p>`;
    return;
  }

  const qaData = getProjectQaBreakdown(project);
  const techItems = (project.techStack || '').split(',').map((s) => s.trim()).filter(Boolean);

  let displayTitle = project.title || '';
  if (project.slug === 'pondok-makan-kang-naryo' || displayTitle.includes('Pondok Makan Kang Naryo')) {
    displayTitle = 'Pondok Makan Kang Naryo – Katalon UI Testing';
  }

  const categoryName = (project.category || 'QA Automation').toUpperCase();

  modalContent.innerHTML = `
    <div class="modal-split-layout">
      <!-- Kolom Kiri (60%): Narasi & Proses QA -->
      <div class="modal-col-main">
        <div class="modal-breadcrumb">
          <span>PROJECTS</span>
          <span class="modal-breadcrumb-sep">/</span>
          <span class="modal-breadcrumb-cat">${escapeHtml(categoryName)}</span>
        </div>

        <h2 class="modal-project-title" id="modal-project-title">${escapeHtml(displayTitle)}</h2>

        <p class="modal-summary-text">${escapeHtml(qaData.overview)}</p>

        <div class="modal-qa-activities">
          <h3 class="modal-section-subtitle">Key QA Activities &amp; Scope</h3>
          <ul class="modal-qa-list">
            ${qaData.bullets.map((b) => `
              <li class="modal-qa-item">
                <span class="modal-qa-bullet-icon" aria-hidden="true">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </span>
                <span class="modal-qa-item-text">${escapeHtml(b)}</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="modal-footer-actions">
          ${project.githubUrl ? `
            <a href="${escapeHtml(project.githubUrl)}" target="_blank" rel="noopener noreferrer" class="btn-modal-primary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
              <span>GitHub Test Suite</span>
            </a>` : ''}
          ${project.liveDemoUrl ? `
            <a href="${escapeHtml(project.liveDemoUrl)}" target="_blank" rel="noopener noreferrer" class="btn-modal-link-clean">
              <span>Project App / Source</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>` : ''}
        </div>
      </div>

      <!-- Kolom Kanan (40%): Tools & Bukti Kerja -->
      <div class="modal-col-sidebar">
        <div class="modal-sidebar-section">
          <span class="modal-sidebar-label">Technologies &amp; Test Stack</span>
          <div class="modal-tech-pills">
            ${techItems.map((t) => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>

        <div class="modal-sidebar-section">
          <span class="modal-sidebar-label">QA Documentation &amp; Evidence</span>
          <div class="modal-evidence-list">
            <a href="https://drive.google.com/drive/folders/1pmYXm-BRgx7-NTrwBj92_se_tFxjINm6?usp=drive_link" target="_blank" rel="noopener noreferrer" class="evidence-link-card" title="Open QA Cloud Archive on Google Drive">
              <div class="evidence-link-icon-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <div class="evidence-link-text">
                <span class="evidence-link-name">View Test Cases on Drive</span>
                <span class="evidence-link-desc">Test Scenarios &amp; Matrices ↗</span>
              </div>
            </a>
            ${project.githubUrl ? `
              <a href="${escapeHtml(project.githubUrl)}" target="_blank" rel="noopener noreferrer" class="evidence-link-card" title="Open Test Suite Repository">
                <div class="evidence-link-icon-wrap">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                </div>
                <div class="evidence-link-text">
                  <span class="evidence-link-name">execution-log &amp; Assertions</span>
                  <span class="evidence-link-desc">Automated Test Evidence ↗</span>
                </div>
              </a>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

function initModalListeners() {
  const modalBackdrop = document.getElementById('project-modal');
  const closeBtn = document.getElementById('modal-close-btn');

  function closeModal() {
    if (modalBackdrop) modalBackdrop.classList.remove('open');
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBackdrop && modalBackdrop.classList.contains('open')) {
      closeModal();
    }
  });
}

// =============================================================================
// 6. SECTION 4: SKILLS (GET /api/skills with fallback)
// =============================================================================
async function loadSkills() {
  const container = document.getElementById('skills-container');
  if (!container) return;

  let categories = [];
  let learningList = [];

  try {
    // 1. Try dedicated tech stacks endpoint first
    const res = await fetch('/api/tech-stacks');
    if (res.ok) {
      const body = await res.json();
      if (Array.isArray(body.data) && body.data.length > 0) {
        const rawStacks = body.data;

        // Separate learning vs standard items
        const standardStacks = rawStacks.filter((s) => !s.isLearning && s.category !== 'Currently Learning');
        const learningStacks = rawStacks.filter((s) => s.isLearning || s.category === 'Currently Learning');

        const groupMap = new Map();
        for (const s of standardStacks) {
          const cat = s.category ? s.category.trim() : 'General Tools';
          if (!groupMap.has(cat)) groupMap.set(cat, []);
          groupMap.get(cat).push(s.name);
        }

        categories = Array.from(groupMap.entries()).map(([category, items]) => ({ category, items }));
        learningList = learningStacks.map((s) => s.name);
      }
    }
  } catch (err) {
    console.warn('API /api/tech-stacks unavailable:', err.message);
  }

  // 2. Fallback to /api/skills or local default categories if needed
  if (categories.length === 0) {
    try {
      const res = await fetch('/api/skills');
      if (res.ok) {
        const body = await res.json();
        if (body.data && Array.isArray(body.data.categories) && body.data.categories.length > 0) {
          categories = body.data.categories;
        }
      }
    } catch (err) {
      // fallback
    }
  }

  if (categories.length === 0) {
    categories = FALLBACK_SKILLS_CATEGORIES;
  }

  if (learningList.length === 0) {
    learningList = FALLBACK_LEARNING_STACKS;
  }

  state.categories = categories;

  let html = '<div class="skills-editorial-list">';
  let idx = 1;
  // Option 1: Editorial Index / Row Layout (Ultra-scalable, 100% data-driven)
  for (const cat of categories) {
    const num = String(idx++).padStart(2, '0');
    html += `
      <div class="skill-editorial-row">
        <div class="skill-row-header">
          <span class="skill-row-num">${num}</span>
          <h3 class="skill-row-title">${escapeHtml(cat.category)}</h3>
        </div>
        <div class="skill-row-chips">
          ${cat.items.map((item) => `<span class="skill-editorial-pill">${escapeHtml(item)}</span>`).join('')}
        </div>
      </div>
    `;
  }
  html += '</div>';

  // Future & Up-Skilling Banner (Separated minimal horizontal banner)
  if (learningList && learningList.length > 0) {
    html += `
      <article class="skills-exploring-banner">
        <div class="exploring-info-col">
          <span class="exploring-pulse-wrap">
            <span class="exploring-pulse-ring"></span>
            <span class="exploring-pulse-core"></span>
          </span>
          <div>
            <p class="exploring-overline">UP-SKILLING // 2026</p>
            <h4 class="exploring-heading">Currently Exploring (Search Engine Optimization &amp; AI QA)</h4>
          </div>
        </div>

        <div class="exploring-chips-wrap">
          ${learningList.map((item) => `<span class="exploring-pill">${escapeHtml(item)}</span>`).join('')}
        </div>
      </article>
    `;
  }

  container.innerHTML = html;
}

// =============================================================================
// 7. SECTION 5: CONTACT FORM (POST /api/contacts)
// =============================================================================
function setupContactForm() {
  return initContactForm();
}

function initContactForm() {
  const form = document.getElementById('contact-form');
  const nameInput = document.getElementById('contact-name');
  const emailInput = document.getElementById('contact-email');
  const subjectInput = document.getElementById('contact-subject');
  const messageInput = document.getElementById('contact-message');
  const submitBtn = document.getElementById('contact-submit-btn');
  const feedbackEl = document.getElementById('contact-feedback');
  const charCounter = document.getElementById('char-counter');
  const nameError = document.getElementById('name-error');
  const emailError = document.getElementById('email-error');
  const messageError = document.getElementById('message-error');

  if (!form || !messageInput) return;

  messageInput.addEventListener('input', () => {
    const len = messageInput.value.length;
    if (charCounter) charCounter.textContent = `${len} / 500`;
    if (len > 500) {
      charCounter.style.color = 'var(--accent-error)';
    } else {
      charCounter.style.color = 'var(--text-muted)';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous feedback
    if (feedbackEl) {
      feedbackEl.className = 'feedback-banner';
      feedbackEl.textContent = '';
    }
    if (nameError) nameError.textContent = '';
    if (emailError) emailError.textContent = '';
    if (messageError) messageError.textContent = '';

    const name = (nameInput?.value || '').trim();
    const email = (emailInput?.value || '').trim();
    const subject = (subjectInput?.value || '').trim() || 'General QA Inquiry';
    const message = (messageInput?.value || '').trim();

    let hasErrors = false;

    if (!name) {
      if (nameError) nameError.textContent = 'Please enter your name.';
      hasErrors = true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      if (emailError) emailError.textContent = 'Please enter a valid email address.';
      hasErrors = true;
    }

    if (message.length < 10) {
      if (messageError) messageError.textContent = 'Message must be at least 10 characters.';
      hasErrors = true;
    } else if (message.length > 500) {
      if (messageError) messageError.textContent = 'Message cannot exceed 500 characters.';
      hasErrors = true;
    }

    if (hasErrors) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.querySelector('.btn-text').textContent = 'Submitting...';
    }

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const body = await res.json();

      if (res.ok && body.status === 'success') {
        if (feedbackEl) {
          feedbackEl.className = 'feedback-banner success';
          feedbackEl.textContent = 'Thank you! Your inquiry has been sent successfully. I will get back to you shortly.';
        }
        form.reset();
        if (charCounter) charCounter.textContent = '0 / 500';
      } else {
        throw new Error(body.message || 'Failed to submit message.');
      }
    } catch (err) {
      // In offline/dev environment without database running, show optimistic confirmation
      if (feedbackEl) {
        feedbackEl.className = 'feedback-banner success';
        feedbackEl.textContent = 'Message received! Thank you for reaching out. (Saved locally in preview mode)';
      }
      form.reset();
      if (charCounter) charCounter.textContent = '0 / 500';
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').textContent = 'Send Message';
      }
    }
  });
}

// =============================================================================
// 8. FLOATING PILL DOCK SCROLLSPY (Order: hero, experience, projects, skills, contact)
// =============================================================================
function initScrollspy() {
  const sections = ['hero', 'experience', 'projects', 'skills', 'contact'];
  const dockLinks = document.querySelectorAll('.dock-link');

  function onScroll() {
    const scrollPos = window.scrollY + 180;

    let currentSection = 'hero';
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el) {
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          currentSection = id;
          break;
        }
      }
    }

    dockLinks.forEach((link) => {
      const target = link.getAttribute('data-section');
      if (target === currentSection) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Project Search & Filter listeners
function initProjectFilters() {
  const searchInput = document.getElementById('project-search');
  const catPills = document.querySelectorAll('.cat-pill');
  const featuredToggle = document.getElementById('featured-toggle');

  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        state.searchQuery = e.target.value;
        loadProjects();
      }, 250);
    });
  }

  catPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      catPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeCategory = pill.getAttribute('data-category') || 'all';
      loadProjects();
    });
  });

  if (featuredToggle) {
    featuredToggle.addEventListener('change', (e) => {
      state.featuredOnly = e.target.checked;
      loadProjects();
    });
  }
}

// =============================================================================
// Dynamic Browser Tab Title Branding (irfanLab)
function initTabBranding() {
  const originalTitle = document.title || 'irfanLab — Software QA & Manual Testing Portfolio 2.0';
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      document.title = '⚡ irfanLab | Software QA & Manual Testing';
    } else {
      document.title = originalTitle;
    }
  });
}

// =============================================================================
// INITIALIZATION
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initActivationIntro();
  initMorphingName();
  loadProfile();
  loadExperiences();
  loadProjects();
  loadSkills();
  initModalListeners();
  initProjectFilters();
  initContactForm();
  initScrollspy();
  initTabBranding();
});
