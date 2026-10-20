/**
 * QA Portfolio 2.0 - Article Reader Script
 * Fetches single article by slug, renders Markdown with editorial styling,
 * eliminates duplicate headers/captions, and enhances images and summary cards.
 */

'use strict';

function getSlugFromPath() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  // Expected path: /blog/:slug or /articles/:slug
  if (parts.length >= 2 && (parts[0] === 'blog' || parts[0] === 'articles')) {
    return decodeURIComponent(parts[1]);
  }
  return '';
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
    return (dateStr || '').toUpperCase();
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

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
// Reading Progress Indicator
// -------------------------------------------------------------
function initReadingProgress() {
  const fill = document.getElementById('reading-progress-fill');
  if (!fill) return;

  function updateProgress() {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (totalHeight <= 0) {
      fill.style.width = '0%';
      return;
    }
    const currentScroll = window.scrollY || document.documentElement.scrollTop;
    const progress = Math.min(100, Math.max(0, (currentScroll / totalHeight) * 100));
    fill.style.width = `${progress}%`;
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();
}

// -------------------------------------------------------------
// Copy Code Blocks Enhancement
// -------------------------------------------------------------
function enhanceCodeBlocks(container) {
  if (!container) return;
  const preElements = container.querySelectorAll('pre');

  preElements.forEach((pre) => {
    if (pre.parentElement && pre.parentElement.classList.contains('code-block-wrapper')) {
      return;
    }

    const code = pre.querySelector('code');
    const className = code ? code.className : '';
    const match = /language-(\w+)/.exec(className);
    const lang = match ? match[1] : 'code';

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';

    const header = document.createElement('div');
    header.className = 'code-block-header';
    header.innerHTML = `
      <span>${lang}</span>
      <button type="button" class="btn-copy-code" title="Copy code">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>Copy</span>
      </button>
    `;

    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(header);
    wrapper.appendChild(pre);

    const copyBtn = header.querySelector('.btn-copy-code');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const textToCopy = code ? code.innerText : pre.innerText;
        try {
          await navigator.clipboard.writeText(textToCopy);
          copyBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Copied!</span>
          `;
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            `;
          }, 2000);
        } catch (_err) {
          // Fallback
        }
      });
    }
  });
}

// -------------------------------------------------------------
// Share Buttons (Top Minimal + Bottom Row)
// -------------------------------------------------------------
function setupShare(article) {
  const currentUrl = window.location.href;
  const title = encodeURIComponent(article.title || 'QA Portfolio 2.0 Article');

  // Copy Link buttons (top minimal and bottom button)
  const topBtn = document.getElementById('btn-copy-link-top');
  const bottomBtn = document.getElementById('btn-copy-link-bottom');

  const copyBtns = [topBtn, bottomBtn].filter(Boolean);
  copyBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(currentUrl);
        const span = btn.querySelector('span');
        const orig = span ? span.innerText : 'Share';
        if (span) span.innerText = 'Copied!';
        setTimeout(() => {
          if (span) span.innerText = orig;
        }, 2000);
      } catch (_e) {
        // Fallback
      }
    });
  });

  // LinkedIn Share
  const lnkBtn = document.getElementById('btn-share-linkedin');
  if (lnkBtn) {
    lnkBtn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`;
  }

  // Twitter / X Share
  const twBtn = document.getElementById('btn-share-twitter');
  if (twBtn) {
    twBtn.href = `https://twitter.com/intent/tweet?text=${title}&url=${encodeURIComponent(currentUrl)}`;
  }
}

// -------------------------------------------------------------
// Image Lightbox & Bleed-Out Enhancement (No Double Captions)
// -------------------------------------------------------------
function enhanceImages(container) {
  if (!container) return;

  const lightbox = document.getElementById('image-lightbox');
  const lightboxImg = document.getElementById('image-lightbox-img');
  const lightboxCaption = document.getElementById('image-lightbox-caption');

  function openLightbox(src, captionText) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = captionText || '';
    if (lightboxCaption) {
      if (captionText && captionText.trim() && !captionText.startsWith('http')) {
        lightboxCaption.textContent = captionText;
        lightboxCaption.style.display = 'block';
      } else {
        lightboxCaption.style.display = 'none';
      }
    }
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target !== lightboxCaption) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('active')) {
        closeLightbox();
      }
    });
  }

  const images = Array.from(container.querySelectorAll('img'));
  images.forEach((img) => {
    img.setAttribute('loading', 'lazy');
    img.style.cursor = 'zoom-in';

    const parentP = img.closest('p');
    let captionText = '';

    // Check if the next sibling is an italic caption paragraph: <p><em>...</em></p>
    if (parentP && parentP.nextElementSibling && parentP.nextElementSibling.tagName === 'P') {
      const nextP = parentP.nextElementSibling;
      const em = nextP.querySelector('em');
      if (em && nextP.textContent.trim() === em.textContent.trim()) {
        captionText = em.textContent.trim();
        nextP.remove(); // Safely remove duplicate caption
      }
    }

    // Fallback to alt text if not an URL or dummy text
    if (!captionText) {
      const alt = (img.getAttribute('alt') || '').trim();
      if (alt && !alt.startsWith('http') && alt.toLowerCase() !== 'image') {
        captionText = alt;
      }
    }

    // Wrap into an editorial bleed-out figure
    const figure = document.createElement('figure');
    figure.className = 'article-bleed-figure';

    const figureImg = img.cloneNode(true);
    figureImg.addEventListener('click', () => {
      openLightbox(figureImg.src, captionText);
    });
    figure.appendChild(figureImg);

    if (captionText) {
      const figcaption = document.createElement('figcaption');
      figcaption.className = 'article-img-caption';
      figcaption.textContent = captionText;
      figcaption.style.textAlign = 'center';
      figcaption.style.textAlignLast = 'center';
      figcaption.style.display = 'block';
      figcaption.style.margin = '0.75rem auto 0.5rem';
      figure.appendChild(figcaption);
    }

    if (parentP && parentP.parentNode) {
      const nextNode = img.nextSibling;
      if (nextNode && (nextNode.nodeName === 'BR' || (nextNode.nodeName === '#text' && !nextNode.textContent.trim()))) {
        nextNode.remove();
      }
      parentP.parentNode.insertBefore(figure, parentP);
      img.remove();
      if (!parentP.textContent.trim() && parentP.children.length === 0) {
        parentP.remove();
      }
    } else if (img.parentNode) {
      img.parentNode.replaceChild(figure, img);
    }
  });
}

// -------------------------------------------------------------
// Tasting / Place Notes 2x2 Summary Card Transformer
// -------------------------------------------------------------
function enhancePlaceNotes(container) {
  if (!container) return;

  const uls = Array.from(container.querySelectorAll('ul'));
  uls.forEach((ul) => {
    const items = Array.from(ul.querySelectorAll(':scope > li'));
    if (items.length < 2 || items.length > 8) return;

    const parsedItems = [];
    let isPlaceNote = false;

    for (const li of items) {
      const strong = li.querySelector('strong, b');
      if (!strong) continue;

      const key = strong.textContent.trim().replace(/[:：]+$/, '');
      const clone = li.cloneNode(true);
      const cloneStrong = clone.querySelector('strong, b');
      if (cloneStrong) cloneStrong.remove();
      const value = clone.textContent.trim().replace(/^[:：\s-]+/, '');

      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('lokasi') ||
        lowerKey.includes('location') ||
        lowerKey.includes('menu') ||
        lowerKey.includes('suasana') ||
        lowerKey.includes('vibe') ||
        lowerKey.includes('ambience') ||
        lowerKey.includes('rating') ||
        lowerKey.includes('score') ||
        lowerKey.includes('hours') ||
        lowerKey.includes('jam') ||
        lowerKey.includes('price') ||
        lowerKey.includes('harga') ||
        lowerKey.includes('environment') ||
        lowerKey.includes('setup')
      ) {
        isPlaceNote = true;
      }

      parsedItems.push({ key, value });
    }

    if (isPlaceNote && parsedItems.length === items.length) {
      const card = document.createElement('div');
      card.className = 'place-notes-card';

      let gridHtml = '<div class="place-notes-grid">';
      for (const item of parsedItems) {
        const isRating = item.key.toLowerCase().includes('rating');
        const formattedVal = isRating && !item.value.includes('★') ? `★ ${item.value}` : item.value;
        const ratingClass = isRating ? ' place-note-rating' : '';

        gridHtml += `
          <div class="place-note-item">
            <span class="place-note-label">${escapeHtml(item.key)}</span>
            <span class="place-note-value${ratingClass}">${escapeHtml(formattedVal)}</span>
          </div>
        `;
      }
      gridHtml += '</div>';

      card.innerHTML = gridHtml;
      ul.parentNode.replaceChild(card, ul);
    }
  });
}

// -------------------------------------------------------------
// Article Loader
// -------------------------------------------------------------
async function loadArticle() {
  const slug = getSlugFromPath();
  const bodyContainer = document.getElementById('article-markdown-body');
  const titleEl = document.getElementById('article-title');
  const catEl = document.getElementById('article-category');
  const dateEl = document.getElementById('article-date');
  const readTimeEl = document.getElementById('article-readtime');

  if (!slug) {
    if (titleEl) titleEl.textContent = 'Story Not Found';
    if (bodyContainer) {
      bodyContainer.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem;">
          <p style="font-size: 1.15rem; color: var(--text-secondary); margin-bottom: 1.5rem;">No story slug specified in URL.</p>
          <a href="/blog" class="btn-hero-primary" style="display: inline-flex;"><span>Browse All Stories</span></a>
        </div>
      `;
    }
    return;
  }

  try {
    const res = await fetch(`/api/articles/${encodeURIComponent(slug)}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const payload = await res.json();
    const article = payload.data;

    if (!article) {
      throw new Error('Empty article payload');
    }

    // Update document title and metadata
    document.title = `${article.title} — irfanLab`;
    const metaDesc = document.getElementById('meta-description');
    if (metaDesc && article.excerpt) {
      metaDesc.setAttribute('content', article.excerpt);
    }

    // Populate header metadata
    if (titleEl) titleEl.textContent = article.title;
    if (catEl) catEl.textContent = (article.category || 'Stories').toUpperCase();
    if (dateEl) dateEl.textContent = formatDate(article.publishedAt || article.createdAt);
    if (readTimeEl) readTimeEl.textContent = getReadTime(article);

    // Strip leading Markdown # Heading 1 so it never duplicates the page H1
    let rawContent = (article.content || '').trim();
    rawContent = rawContent.replace(/^\s*#\s+[^\n]+(?:\r?\n)+/, '').trim();

    let renderedHtml = '';
    if (window.marked && typeof window.marked.parse === 'function') {
      window.marked.setOptions({
        gfm: true,
        breaks: true,
      });
      renderedHtml = window.marked.parse(rawContent);
    } else {
      renderedHtml = `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(rawContent)}</pre>`;
    }

    if (bodyContainer) {
      bodyContainer.innerHTML = renderedHtml;

      // Defensive check: if an H1 element still made it into the markdown body, remove it
      const firstH1 = bodyContainer.querySelector('h1');
      if (firstH1) {
        firstH1.remove();
      }

      enhanceCodeBlocks(bodyContainer);
      enhanceImages(bodyContainer);
      enhancePlaceNotes(bodyContainer);
    }

    setupShare(article);
  } catch (err) {
    console.error('Error loading article:', err);
    if (titleEl) titleEl.textContent = 'Story Not Found';
    if (bodyContainer) {
      bodyContainer.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle);">
          <p style="font-family: var(--font-display); font-size: 1.35rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">Story Could Not Be Loaded</p>
          <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 1.75rem;">The story you are looking for may have been moved, unpublished, or the link is incorrect.</p>
          <a href="/blog" class="btn-hero-primary" style="display: inline-flex;"><span>← Return to Stories</span></a>
        </div>
      `;
    }
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initReadingProgress();
  loadArticle();
});
