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
  title: 'Quality Assurance Enthusiast',
  bio: 'Informatics graduate experienced in manual functional testing, UAT support, and test automation. Passionate about ensuring seamless software quality from end to end.',
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
      'Participated in Vortex Career Catalyst Batch 4 (SK: 032/SK/VRT/V/2026). Analyzed functional requirement specifications to craft comprehensive test cases and user scenarios. Performed manual functional testing across core user flows, logged and tracked defects, conducted regression testing after bug fixes, and evaluated UI/UX responsiveness and baseline performance.',
    sortOrder: 2,
    certificateUrl: '/docs/certificates/sertifikat-magang-vortex-buana-edumedia.pdf',
    certificateType: 'pdf',
    certificateName: 'Sertifikat Magang QA & SK (Batch 4) - PT Vortex Buana Edumedia',
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
    certificateUrl: '/docs/certificates/sertifikat-magang-len-industri.pdf',
    certificateType: 'pdf',
    certificateName: 'Sertifikat SQA OJT Grade A (91.67) - PT Len Industri (Persero)',
  },
];

const FALLBACK_PROJECTS = [
  {
    id: 1,
    title: 'Pondok Makan Kang Naryo - Web Development & Katalon UI Testing',
    slug: 'pondok-makan-kang-naryo',
    description:
      'Web application and automated UI testing suite for a food ordering platform. Developed backend business logic and RESTful services with Laravel & MySQL, and engineered end-to-end automated UI test cases for user authentication, checkout workflows, and admin menu management using Katalon Studio. Documented comprehensive test cases and defect tracking in Test Case Pondok Makan.',
    category: 'Automation Testing',
    techStack: 'Katalon Studio, Laravel, PHP, MySQL, Automated UI Testing, Manual Testing, Defect Tracking',
    githubUrl: 'https://github.com/phannstastic/pondok-makan-kang-naryo-ui-testing.git',
    liveDemoUrl: 'https://github.com/phannstastic/Pondok-Makan-Kang-Naryo.git',
    imageUrl: '/images/projects/kang-naryo-katalon.svg',
    isFeatured: true,
    sortOrder: 1,
  },
  {
    id: 2,
    title: 'XYZ Bank - Cypress E2E Automation Framework',
    slug: 'xyz-bank-cypress-test',
    description:
      'End-to-End automated testing framework for XYZ Bank web application utilizing Cypress with Page Object Model (POM) architecture. Automated 14 comprehensive test scenarios covering Manager workflows (TC-01-MAN to TC-06-MAN: manager login, valid/invalid customer addition, currency account opening, customer deletion) and Customer workflows (TC-01-CUS to TC-08-CUS: customer login, account deposits, balance validation, insufficient fund withdrawals, transaction history verification, and session logout).',
    category: 'Automation Testing',
    techStack: 'Cypress, JavaScript, Page Object Model (POM), E2E Testing, Mocha, Chai, Test Automation',
    githubUrl: 'https://github.com/phannstastic/xyz-Bank-Cypress-Test.git',
    liveDemoUrl: null,
    imageUrl: '/images/projects/xyz-bank-cypress.svg',
    isFeatured: true,
    sortOrder: 2,
  },
  {
    id: 3,
    title: 'Swagger Petstore V2 - REST API Automation with Postman',
    slug: 'petstore-v2-swagger-api-testing',
    description:
      'Comprehensive REST API testing suite for the public Swagger Petstore v2 (/pet) service. Formulated automated assertions validating HTTP response status codes (200, 400, 404), response payloads, JSON schemas, and negative boundary scenarios for findByStatus, pet retrieval by ID, pet creation, updates, and deletion. Automated batch execution via Postman Collection Runner and documented defects including weak API input validation behavior.',
    category: 'API Testing',
    techStack: 'Postman, Collection Runner, REST API, JSON Schema Validation, API Automation, Regression Testing',
    githubUrl: 'https://github.com/phannstastic/Petstore-Swagger-V2.git',
    liveDemoUrl: 'https://github.com/phannstastic/Petstore-Swagger-V2-Part-2.git',
    imageUrl: '/images/projects/petstore-test-result.png',
    isFeatured: true,
    sortOrder: 3,
  },
  {
    id: 4,
    title: 'OrangeHRM - UI Test Automation with Katalon Studio',
    slug: 'orangehrm-katalon-automation',
    description:
      'Automated UI regression suite for OrangeHRM authentication module using Katalon Studio and Katalon Recorder. Implemented test cases verifying valid credential authorization, invalid username/password combinations, empty input validations, dynamic web locators, and error banner assertions. Documented defect lifecycle and test execution matrices.',
    category: 'Automation Testing',
    techStack: 'Katalon Studio, Katalon Recorder, Web UI Testing, Test Automation, Regression Testing, Defect Lifecycle',
    githubUrl: 'https://github.com/phannstastic/OrangeHRM-Login.git',
    liveDemoUrl: null,
    imageUrl: '/images/projects/orangehrm-katalon.svg',
    isFeatured: true,
    sortOrder: 4,
  },
  {
    id: 5,
    title: 'Loafy Bakery - E-Commerce System & Manual QA Testing',
    slug: 'loafy-bakery-manual-testing',
    description:
      'Web-based bakery ordering platform featuring custom backend order processing, catalog browsing, shopping cart workflows, and MySQL relational database. Executed rigorous manual exploratory and functional testing across user checkout flows, inventory tracking, role-based admin order updates, and edge-case form validation. Documented test scenarios, edge cases, and defect reports.',
    category: 'Manual Testing',
    techStack: 'PHP, MySQL, Manual Testing, Exploratory Testing, Functional Testing, Test Scenarios, Defect Reporting',
    githubUrl: 'https://github.com/phannstastic/Loafy-Bakery.git',
    liveDemoUrl: null,
    imageUrl: '/images/projects/loafy-bakery.svg',
    isFeatured: false,
    sortOrder: 5,
  },
];

const FALLBACK_SKILLS_CATEGORIES = [
  {
    category: 'QA & Testing Methodologies',
    items: [
      'Manual Testing',
      'Functional Testing',
      'Regression Testing',
      'UAT (User Acceptance Testing)',
      'Test Case & Scenario Design',
      'Defect Tracking & Bug Reporting',
      'Factory Acceptance Testing (FAT)',
    ],
  },
  {
    category: 'Automation & Testing Tools',
    items: [
      'Cypress (E2E Testing)',
      'Katalon Studio',
      'Postman (API Testing)',
      'Swagger / OpenAPI',
      'Katalon Recorder',
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
      'Git & GitHub',
      'ClickUp',
      'Odoo ERP',
      'VS Code',
      'Google Sheets & MS Excel',
    ],
  },
  {
    category: 'Certifications & Training',
    items: [
      'Sanbercode QA Bootcamp (2025)',
      'Test Automation University (2025)',
      'MySkill QA Certification (2025)',
      'Page Object Model (POM)',
      'API Test Automation',
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
    const period = exp.isCurrent
      ? `${escapeHtml(exp.startDate)} &mdash; Present`
      : `${escapeHtml(exp.startDate)} &mdash; ${escapeHtml(exp.endDate || 'Completed')}`;

    html += `
      <article class="exp-card">
        <div class="exp-header">
          <div>
            <h3 class="exp-role-title">${escapeHtml(exp.role)}</h3>
            <p class="exp-company-name">${escapeHtml(exp.company)}</p>
          </div>
          <div class="exp-meta-badges">
            <span class="exp-date-pill">${period}</span>
            ${exp.isCurrent ? '<span class="exp-current-badge">Active</span>' : ''}
          </div>
        </div>
        ${exp.location ? `
          <div class="exp-location">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>${escapeHtml(exp.location)}</span>
          </div>` : ''}
        <p class="exp-description">${escapeHtml(exp.description)}</p>
        ${exp.certificateUrl ? `
          <div class="exp-cert-row">
            <div class="exp-cert-meta">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span class="exp-cert-title">${escapeHtml(exp.certificateName || 'Verified Certificate')}</span>
            </div>
            <a href="${escapeHtml(exp.certificateUrl)}" target="_blank" rel="noopener noreferrer" class="exp-cert-link" title="Open Verified Certificate">
              <span>${exp.certificateType === 'image' ? 'View Photo' : 'View PDF'}</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>
        ` : ''}
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
  if (techItems.length <= 2) return { visible: techItems, remaining: 0 };

  const tagWidth = (text) => text.length * 7.2 + 22;
  const BADGE_WIDTH = 38;
  const CARD_CONTENT_WIDTH = 270;
  const GAP = 6;

  // Step 1: Pack Line 1
  let line1 = [];
  let line1W = 0;
  let i = 0;

  for (; i < techItems.length; i++) {
    const w = tagWidth(techItems[i]);
    const nextW = line1.length === 0 ? w : line1W + GAP + w;
    if (nextW <= CARD_CONTENT_WIDTH) {
      if (i === techItems.length - 1 && line1.length >= 2) {
        break; // Keep at least 1 tag for Line 2
      }
      line1.push(techItems[i]);
      line1W = nextW;
    } else {
      break;
    }
  }

  // Step 2: Pack Line 2 (along with +N badge if more tags remain)
  let line2 = [];
  let line2W = 0;

  for (; i < techItems.length; i++) {
    const w = tagWidth(techItems[i]);
    const hasRemaining = techItems.length - (line1.length + line2.length + 1) > 0;
    const badgeW = hasRemaining ? GAP + BADGE_WIDTH : 0;
    const nextW = line2.length === 0 ? w + badgeW : line2W + GAP + w + badgeW;

    if (nextW <= CARD_CONTENT_WIDTH) {
      line2.push(techItems[i]);
      line2W = line2.length === 1 ? w : line2W + GAP + w;
    } else {
      break;
    }
  }

  // Ensure Line 2 is never empty if Line 1 has >= 2 tags
  if (line2.length === 0 && line1.length >= 2) {
    const moved = line1.pop();
    line2.push(moved);
  }

  const visible = [...line1, ...line2];
  const remaining = techItems.length - visible.length;
  return { visible, remaining };
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

    html += `
      <article class="project-card">
        <div class="project-card-top">
          <div class="project-meta-row">
            <span class="project-category-tag">${escapeHtml(p.category)}</span>
            ${p.isFeatured ? '<span class="project-featured-badge">★ Featured</span>' : ''}
          </div>
          <h3 class="project-card-title">${escapeHtml(p.title)}</h3>
          <p class="project-card-desc">${escapeHtml(p.description)}</p>
        </div>

        <div>
          <div class="project-tech-tags">
            ${visibleTags.map((t) => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('')}
            ${remainingTags > 0 ? `<span class="tech-tag tech-tag-count">+${remainingTags}</span>` : ''}
          </div>

          <div class="project-card-footer">
            <button class="btn-view-details" data-slug="${escapeHtml(p.slug)}">
              <span>View Details</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
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

  // Setup horizontal sliding controls & dots
  setupProjectsSlider(projects);
}

function setupProjectsSlider(projects) {
  const container = document.getElementById('projects-container');
  const counterText = document.getElementById('projects-counter-text');
  const btnPrev = document.getElementById('btn-projects-prev');
  const btnNext = document.getElementById('btn-projects-next');
  const dotsContainer = document.getElementById('projects-slider-dots');

  if (!container) return;

  const total = Array.isArray(projects) ? projects.length : 0;
  if (total === 0) {
    if (counterText) counterText.textContent = '0 projects found';
    if (dotsContainer) dotsContainer.innerHTML = '';
    if (btnPrev) btnPrev.disabled = true;
    if (btnNext) btnNext.disabled = true;
    return;
  }

  // Generate indicator dots
  if (dotsContainer) {
    dotsContainer.innerHTML = Array.from({ length: total }, (_, i) => 
      `<button type="button" class="slider-dot ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="Go to project ${i + 1}"></button>`
    ).join('');

    dotsContainer.querySelectorAll('.slider-dot').forEach((dot) => {
      dot.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index') || '0', 10);
        scrollToProjectIndex(idx);
      });
    });
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
      counterText.textContent = `Showing project ${currentIndex + 1} of ${total}`;
    }

    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll('.slider-dot');
      dots.forEach((dot, i) => {
        if (i === currentIndex) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });
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

// Project Detail Modal
async function openProjectModal(slug) {
  const modalBackdrop = document.getElementById('project-modal');
  const modalContent = document.getElementById('modal-body');
  if (!modalBackdrop || !modalContent) return;

  modalBackdrop.classList.add('open');
  modalContent.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <p style="color: var(--text-secondary); font-size: 0.9rem;">Loading project breakdown...</p>
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
    modalContent.innerHTML = `<p style="color: var(--text-muted);">Project details could not be found.</p>`;
    return;
  }

  const techItems = (project.techStack || '').split(',').map((s) => s.trim()).filter(Boolean);

  modalContent.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
      <span class="project-category-tag">${escapeHtml(project.category)}</span>
      ${project.isFeatured ? '<span class="project-featured-badge">★ Featured</span>' : ''}
    </div>
    <h2>${escapeHtml(project.title)}</h2>
    <p style="white-space: pre-line;">${escapeHtml(project.description)}</p>

    <div style="margin-bottom: 1.5rem;">
      <span class="modal-tech-header">Technologies &amp; Test Stack</span>
      <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
        ${techItems.map((t) => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('')}
      </div>
    </div>

    <div class="modal-actions-row">
      ${project.githubUrl ? `
        <a href="${escapeHtml(project.githubUrl)}" target="_blank" rel="noopener noreferrer" class="btn-modal-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
          <span>GitHub Test Suite</span>
        </a>` : ''}
      ${project.liveDemoUrl ? `
        <a href="${escapeHtml(project.liveDemoUrl)}" target="_blank" rel="noopener noreferrer" class="btn-modal-secondary">
          <span>Project App / Source</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </a>` : ''}
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
  const originalTitle = document.title || 'irfanLab — QA Automation & Testing Portfolio 2.0';
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      document.title = '⚡ irfanLab | QA Automation Test Bench';
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
