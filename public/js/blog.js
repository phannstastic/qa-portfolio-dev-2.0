/**
 * QA Portfolio 2.0 - Blog Client Script
 * Handles article listing, search/filter, and theme sync.
 */

'use strict';

// Global state
const blogState = {
  allArticles: [],
  searchQuery: '',
  activeCategory: 'ALL',
};

// Fallback articles if API is temporarily unavailable
const FALLBACK_ARTICLES = [
  {
    id: 1,
    title: 'Berburu Matcha & Artisan Gelato: Menemukan Ruang Menepi di Sudut Kota',
    slug: 'berburu-matcha-dan-artisan-gelato',
    category: 'Food & Bites',
    excerpt: 'Cerita santai tentang pencarian matcha latte pekat dan artisan gelato pistachio di akhir pekan—lengkap dengan ulasan rasa, tekstur, dan suasana kafe untuk reset energi.',
    content: '![Artisan Matcha & Pistachio Gelato](/images/articles/matcha-gelato.jpg)',
    publishedAt: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'Catatan Menepi: Jalan Pagi, Aroma Hujan, dan Sudut Tenang Kota',
    slug: 'catatan-menepi-jalan-pagi-aroma-hujan',
    category: 'Travel & Places',
    excerpt: 'Menikmati langkah pelan tanpa terburu-buru, menyusuri trotoar kota di pagi hari saat kabut tipis dan aroma kopi mulai menyapa. Sebuah jeda penting di tengah kesibukan.',
    content: '![Sudut Kota Pagi Hari](/images/articles/morning-city-walk.jpg)',
    publishedAt: new Date().toISOString(),
  },
  {
    id: 3,
    title: 'How to Formulate Bulletproof Bug Reports That Developers Love',
    slug: 'how-to-write-bulletproof-bug-reports',
    category: 'Tech & Notes',
    excerpt: 'A great bug report is not just an issue ticket—it is an actionable blueprint. Here is my structured framework for reproducible defect documentation.',
    content: '![QA Workspace Desk](/images/articles/qa-workspace-desk.jpg)',
    publishedAt: new Date().toISOString(),
  },
];

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase();
  } catch (_e) {
    return dateStr;
  }
}

function getReadTime(art) {
  if (art.readTime && art.readTime.trim()) {
    return art.readTime.toUpperCase();
  }
  const words = (art.content || art.excerpt || '').trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.ceil(words / 180));
  return `${mins} MIN READ`;
}

// -------------------------------------------------------------
// Theme Management (Light & Dark Mode)
// -------------------------------------------------------------
function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (!toggleBtn) return;

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      toggleBtn.setAttribute('aria-label', 'Switch to light mode');
      toggleBtn.setAttribute('title', 'Switch to light mode (Current: Dark)');
    } else {
      document.documentElement.classList.remove('dark');
      toggleBtn.setAttribute('aria-label', 'Switch to dark mode');
      toggleBtn.setAttribute('title', 'Switch to dark mode (Current: Light)');
    }
  }

  const saved = localStorage.getItem('theme');
  const initial = saved || getSystemTheme();
  applyTheme(initial);

  toggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
  });
}

// -------------------------------------------------------------
// Articles Fetch & Filter
// -------------------------------------------------------------
async function fetchArticles() {
  const container = document.getElementById('articles-container');
  if (!container) return;

  try {
    const res = await fetch('/api/articles');
    if (res.ok) {
      const body = await res.json();
      if (Array.isArray(body.data) && body.data.length > 0) {
        blogState.allArticles = body.data;
      } else {
        blogState.allArticles = FALLBACK_ARTICLES;
      }
    } else {
      blogState.allArticles = FALLBACK_ARTICLES;
    }
  } catch (err) {
    console.warn('API /api/articles fetch failed, using fallback:', err);
    blogState.allArticles = FALLBACK_ARTICLES;
  }

  populateCategoryFilters();
  renderArticles();
}

function populateCategoryFilters() {
  const wrap = document.getElementById('blog-categories-wrap');
  if (!wrap) return;

  const articleCategories = [];
  for (const a of blogState.allArticles) {
    if (a.category && !articleCategories.includes(a.category)) {
      articleCategories.push(a.category);
    }
  }

  const preferred = ['Food & Bites', 'Travel & Places', 'Life & Journal', 'Tech & Notes'];
  const categoriesToShow = [];

  for (const cat of preferred) {
    categoriesToShow.push(cat);
  }
  for (const cat of articleCategories) {
    if (!categoriesToShow.some((c) => c.toLowerCase() === cat.toLowerCase())) {
      categoriesToShow.push(cat);
    }
  }

  let html = `<button type="button" class="editorial-tab ${blogState.activeCategory === 'ALL' ? 'active' : ''}" data-category="ALL">All Stories</button>`;
  for (const cat of categoriesToShow) {
    const isActive = blogState.activeCategory.toLowerCase() === cat.toLowerCase();
    html += `<button type="button" class="editorial-tab ${isActive ? 'active' : ''}" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
  }
  wrap.innerHTML = html;

  wrap.querySelectorAll('.editorial-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-category');
      blogState.activeCategory = cat;
      wrap.querySelectorAll('.editorial-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderArticles();
    });
  });
}

function getFilteredArticles() {
  return blogState.allArticles.filter((art) => {
    // 1. Category filter
    if (blogState.activeCategory && blogState.activeCategory !== 'ALL') {
      const artCat = (art.category || '').toLowerCase().trim();
      const targetCat = blogState.activeCategory.toLowerCase().trim();
      if (artCat !== targetCat) {
        return false;
      }
    }

    // 2. Search query filter
    if (blogState.searchQuery.trim()) {
      const q = blogState.searchQuery.toLowerCase();
      const match =
        (art.title && art.title.toLowerCase().includes(q)) ||
        (art.excerpt && art.excerpt.toLowerCase().includes(q)) ||
        (art.category && art.category.toLowerCase().includes(q)) ||
        (art.tags && art.tags.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });
}

function resetBlogFilters() {
  const searchInput = document.getElementById('blog-search-input');
  const clearBtn = document.getElementById('blog-search-clear');
  const wrap = document.getElementById('blog-categories-wrap');

  blogState.searchQuery = '';
  blogState.activeCategory = 'ALL';

  if (searchInput) {
    searchInput.value = '';
  }
  if (clearBtn) {
    clearBtn.style.display = 'none';
  }
  if (wrap) {
    wrap.querySelectorAll('.editorial-tab').forEach((tab) => {
      if (tab.getAttribute('data-category') === 'ALL') {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  renderArticles();
}

function renderArticles() {
  const container = document.getElementById('articles-container');
  if (!container) return;

  const filtered = getFilteredArticles();

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="blog-empty-state">
        <div class="empty-state-watermark" aria-hidden="true">“</div>
        <div class="empty-state-badge">
          <span class="empty-dot">●</span> CHAPTER NOT WRITTEN YET
        </div>
        <h3 class="empty-state-headline">Still brewing this <em>story</em>.</h3>
        <p class="empty-state-body">
          Looks like this page of the journal is still blank. I’m probably still out there tasting gelato or drafting the next note.
        </p>
        <div class="empty-state-actions">
          <button type="button" class="btn-empty-reset" id="btn-empty-reset-filter" aria-label="Reset filter to view all stories">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
            </svg>
            <span>Reset filter</span>
          </button>
        </div>
      </div>
    `;

    const resetBtn = document.getElementById('btn-empty-reset-filter');
    if (resetBtn) {
      resetBtn.addEventListener('click', resetBlogFilters);
    }
    return;
  }

  let html = '';
  for (const art of filtered) {
    const formattedDate = formatDate(art.publishedAt || art.createdAt);
    const categoryName = (art.category || 'Stories').toUpperCase();
    const readTimeStr = getReadTime(art);
    const slug = art.slug || `article-${art.id}`;

    html += `
      <a href="/blog/${encodeURIComponent(slug)}" class="editorial-row">
        <div class="editorial-date-col">
          <span class="editorial-date">${escapeHtml(formattedDate)}</span>
        </div>
        <div class="editorial-main-col">
          <div class="editorial-meta-row">
            <span class="editorial-category">${escapeHtml(categoryName)}</span>
            <span class="editorial-meta-dot">•</span>
            <span class="editorial-readtime">${escapeHtml(readTimeStr)}</span>
          </div>
          <h2 class="editorial-title">
            <span>${escapeHtml(art.title)}</span>
            <svg class="editorial-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="7" y1="17" x2="17" y2="7"></line>
              <polyline points="7 7 17 7 17 17"></polyline>
            </svg>
          </h2>
          <p class="editorial-excerpt">${escapeHtml(art.excerpt || '')}</p>
        </div>
      </a>
    `;
  }

  container.innerHTML = html;
}

function initSearch() {
  const searchInput = document.getElementById('blog-search-input');
  const clearBtn = document.getElementById('blog-search-clear');
  if (!searchInput) return;

  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      blogState.searchQuery = val;
      renderArticles();
    }, 200);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      blogState.searchQuery = '';
      renderArticles();
      searchInput.focus();
    });
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSearch();
  fetchArticles();
});
