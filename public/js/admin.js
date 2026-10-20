/**
 * ============================================================================
 * QA PORTFOLIO - ADMIN CMS DASHBOARD CONTROLLER
 * Architecture: Vanilla JS, Session-based JWT, Security-conscious API client
 * ============================================================================
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // Security & Utilities
  // --------------------------------------------------------------------------

  /**
   * Escape HTML to prevent DOM-based XSS when rendering user-supplied strings.
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Format ISO date string into readable format.
   */
  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return String(dateStr);
    }
  }

  // --------------------------------------------------------------------------
  // Authentication & Session Management
  // --------------------------------------------------------------------------

  const STORAGE_KEY_TOKEN = 'admin_token';
  const STORAGE_KEY_USER = 'admin_user';

  function getToken() {
    return sessionStorage.getItem(STORAGE_KEY_TOKEN);
  }

  function getUser() {
    try {
      const userRaw = sessionStorage.getItem(STORAGE_KEY_USER);
      return userRaw ? JSON.parse(userRaw) : null;
    } catch {
      return null;
    }
  }

  function setSession(token, user) {
    sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
    sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  }

  function clearSession() {
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_USER);
  }

  function logout() {
    clearSession();
    window.location.href = '/login';
  }

  /**
   * Secure fetch wrapper for Admin API calls.
   * Attaches Bearer token and handles expired/invalid token automatically.
   */
  async function adminFetch(url, options = {}) {
    const token = getToken();
    const isFormData = options.body instanceof FormData;
    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401 || response.status === 403) {
        // Token invalid, expired, or role changed
        clearSession();
        window.location.href = '/login';
        throw new Error('Your session has expired. Please sign in again.');
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.message || data.error || `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // Toast Notifications
  // --------------------------------------------------------------------------

  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');

    const iconSvg = type === 'success'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';

    toast.innerHTML = `
      ${iconSvg}
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.25s, transform 0.25s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  // --------------------------------------------------------------------------
  // Modal Utilities
  // --------------------------------------------------------------------------

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function setupModalDismissers() {
    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
    });

    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-backdrop');
        if (modal) {
          modal.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.open').forEach((m) => {
          m.classList.remove('open');
        });
        document.body.style.overflow = '';
      }
    });
  }

  // --------------------------------------------------------------------------
  // Confirm Delete Dialog Helper
  // --------------------------------------------------------------------------

  let confirmDeleteCallback = null;

  function showConfirmDelete(title, message, onConfirm) {
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-message');
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    confirmDeleteCallback = onConfirm;
    openModal('confirm-modal');
  }

  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      if (typeof confirmDeleteCallback === 'function') {
        const cb = confirmDeleteCallback;
        confirmDeleteCallback = null;
        closeModal('confirm-modal');
        await cb();
      }
    });
  }

  // ==========================================================================
  // PAGE CONTROLLERS
  // ==========================================================================

  // Check which page we are on
  const isLoginPage = Boolean(document.getElementById('login-form'));
  const isAdminDashboard = Boolean(document.getElementById('admin-sidebar'));

  // --------------------------------------------------------------------------
  // 1. LOGIN PAGE CONTROLLER
  // --------------------------------------------------------------------------
  if (isLoginPage) {
    // If already logged in, redirect directly to admin dashboard
    if (getToken()) {
      window.location.href = '/admin';
    }

    const loginForm = document.getElementById('login-form');
    const feedbackBanner = document.getElementById('login-feedback');
    const submitBtn = document.getElementById('login-submit-btn');

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (!email || !password) {
        showLoginError('Please enter both email and password.');
        return;
      }

      // Live validation for basic email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showLoginError('Please enter a valid email address.');
        return;
      }

      setLoadingState(submitBtn, true, 'Signing in...');
      hideLoginError();

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const errMsg = data.message || data.error || 'Invalid email or password.';
          showLoginError(errMsg);
          setLoadingState(submitBtn, false, 'Sign In to Dashboard');
          return;
        }

        // Store session token securely in sessionStorage
        if (data.data?.token && data.data?.user) {
          setSession(data.data.token, data.data.user);
          showToast('Signed in successfully! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = '/admin';
          }, 400);
        } else {
          showLoginError('Authentication response incomplete. Please try again.');
          setLoadingState(submitBtn, false, 'Sign In to Dashboard');
        }
      } catch (err) {
        showLoginError('Unable to connect to the authentication service. Please check your network.');
        setLoadingState(submitBtn, false, 'Sign In to Dashboard');
      }
    });

    function showLoginError(msg) {
      if (!feedbackBanner) return;
      feedbackBanner.className = 'feedback-banner error';
      feedbackBanner.style.display = 'flex';
      feedbackBanner.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span>${escapeHtml(msg)}</span>
      `;
    }

    function hideLoginError() {
      if (!feedbackBanner) return;
      feedbackBanner.style.display = 'none';
      feedbackBanner.innerHTML = '';
    }
  }

  // --------------------------------------------------------------------------
  // 2. ADMIN DASHBOARD CONTROLLER
  // --------------------------------------------------------------------------
  if (isAdminDashboard) {
    // Auth Guard: ensure token exists
    if (!getToken()) {
      window.location.href = '/login';
      return;
    }

    // Initialize UI
    setupModalDismissers();
    setupAdminNavigation();
    setupUserBadge();
    setupOverview();
    setupProjectsCRUD();
    setupExperiencesCRUD();
    setupTechStacksCRUD();
    setupContactsManagement();
    setupArticlesCRUD();
    setupErrorSceneSettings();
    setupMobileSidebar();

    // Initial load: Overview
    handleViewSwitch('overview');
  }

  // --------------------------------------------------------------------------
  // Helper: Button Loading State
  // --------------------------------------------------------------------------
  function setLoadingState(btn, isLoading, text) {
    if (!btn) return;
    btn.disabled = isLoading;
    if (isLoading) {
      btn.setAttribute('data-original-text', btn.innerHTML);
      btn.innerHTML = `<span style="display:inline-block; animation: spin 1s infinite linear;">&#9696;</span> ${escapeHtml(text || 'Processing...')}`;
    } else {
      btn.innerHTML = text || btn.getAttribute('data-original-text') || 'Submit';
    }
  }

  // --------------------------------------------------------------------------
  // Navigation & User Info
  // --------------------------------------------------------------------------
  function setupUserBadge() {
    const user = getUser();
    const nameEl = document.getElementById('user-name');
    const roleEl = document.getElementById('user-role');
    const avatarEl = document.getElementById('user-avatar-initials');

    if (user && user.name) {
      if (nameEl) nameEl.textContent = user.name;
      if (roleEl) roleEl.textContent = (user.role || 'ADMIN').toUpperCase();
      if (avatarEl) {
        avatarEl.textContent = user.name.charAt(0).toUpperCase();
      }
    }

    const logoutTopBtn = document.getElementById('topbar-logout-btn');
    const logoutSideBtn = document.getElementById('sidebar-logout-btn');
    if (logoutTopBtn) logoutTopBtn.addEventListener('click', logout);
    if (logoutSideBtn) logoutSideBtn.addEventListener('click', logout);
  }

  function setupAdminNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-link[data-view]');
    navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.getAttribute('data-view');
        handleViewSwitch(view);
      });
    });

    const quickMessagesBtn = document.getElementById('btn-quick-view-messages');
    if (quickMessagesBtn) {
      quickMessagesBtn.addEventListener('click', () => {
        handleViewSwitch('contacts');
      });
    }

    // Hash change support
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (['overview', 'projects', 'experiences', 'tech-stacks', 'articles', 'contacts', 'error-scene'].includes(hash)) {
        handleViewSwitch(hash);
      }
    });
  }

  function handleViewSwitch(viewName) {
    const validViews = ['overview', 'projects', 'experiences', 'tech-stacks', 'articles', 'contacts', 'error-scene'];
    const targetView = validViews.includes(viewName) ? viewName : 'overview';

    // Update Sidebar active state
    document.querySelectorAll('.sidebar-link[data-view]').forEach((l) => {
      if (l.getAttribute('data-view') === targetView) {
        l.classList.add('active');
      } else {
        l.classList.remove('active');
      }
    });

    // Update Views visibility
    document.querySelectorAll('.admin-view').forEach((v) => {
      v.classList.remove('active');
    });

    const targetSection = document.getElementById(`view-${targetView}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Update Page Title
    const titleEl = document.getElementById('page-title');
    if (titleEl) {
      const titles = {
        overview: 'Dashboard Overview',
        projects: 'Projects Management',
        experiences: 'Work Experience',
        'tech-stacks': 'Tech Stacks & Skills Library',
        articles: 'Articles & Technical Writing',
        contacts: 'Contact Inquiries',
        'error-scene': '404 Scene & Music Settings',
      };
      titleEl.textContent = titles[targetView] || 'Admin Dashboard';
    }

    // Update URL hash without reload
    if (window.location.hash !== `#${targetView}`) {
      history.replaceState(null, '', `#${targetView}`);
    }

    // Close mobile sidebar if open
    closeMobileSidebar();

    // Trigger View Data Reload
    if (targetView === 'overview') loadOverviewData();
    if (targetView === 'projects') loadProjectsData();
    if (targetView === 'experiences') loadExperiencesData();
    if (targetView === 'tech-stacks') loadTechStacksData();
    if (targetView === 'articles') loadArticlesData();
    if (targetView === 'contacts') loadContactsData();
    if (targetView === 'error-scene') loadErrorSceneSettings();
  }

  function setupMobileSidebar() {
    const toggleBtn = document.getElementById('mobile-sidebar-toggle');
    const sidebar = document.getElementById('admin-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (toggleBtn && sidebar && backdrop) {
      toggleBtn.style.display = 'inline-flex';
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        backdrop.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
      });

      backdrop.addEventListener('click', closeMobileSidebar);
    }
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.style.display = 'none';
  }

  // ==========================================================================
  // SECTION 1: OVERVIEW
  // ==========================================================================
  let cachedProjects = [];
  let cachedExperiences = [];
  let cachedContacts = [];
  let cachedTechStacks = [];
  let selectedProjectTechTags = [];
  let currentTechStackFilter = '';

  function setupOverview() {
    // Initial binding
  }

  async function loadOverviewData() {
    try {
      const [projRes, expRes, contactRes, tsRes, artRes] = await Promise.all([
        adminFetch('/api/admin/projects'),
        adminFetch('/api/admin/experiences'),
        adminFetch('/api/admin/contacts'),
        adminFetch('/api/admin/tech-stacks'),
        adminFetch('/api/admin/articles'),
      ]);

      cachedProjects = projRes.data || [];
      cachedExperiences = expRes.data || [];
      cachedContacts = contactRes.data || [];
      cachedTechStacks = tsRes.data || [];
      cachedArticles = artRes.data || [];

      // Update counters
      const projCountEl = document.getElementById('stat-projects-count');
      const expCountEl = document.getElementById('stat-experiences-count');
      const techStackCountEl = document.getElementById('stat-tech-stacks-count');
      const articleCountEl = document.getElementById('stat-articles-count');
      const contactCountEl = document.getElementById('stat-contacts-count');
      const unreadCountEl = document.getElementById('stat-unread-count');
      const sidebarUnreadEl = document.getElementById('sidebar-unread-badge');

      if (projCountEl) projCountEl.textContent = cachedProjects.length;
      if (expCountEl) expCountEl.textContent = cachedExperiences.length;
      if (techStackCountEl) techStackCountEl.textContent = cachedTechStacks.length;
      if (articleCountEl) articleCountEl.textContent = cachedArticles.length;
      if (contactCountEl) contactCountEl.textContent = cachedContacts.length;

      const unreadCount = cachedContacts.filter((c) => c.status === 'unread').length;
      if (unreadCountEl) unreadCountEl.textContent = unreadCount;

      if (sidebarUnreadEl) {
        if (unreadCount > 0) {
          sidebarUnreadEl.textContent = unreadCount;
          sidebarUnreadEl.style.display = 'inline-block';
        } else {
          sidebarUnreadEl.style.display = 'none';
        }
      }

      // Render recent messages (max 5)
      renderOverviewRecentContacts(cachedContacts.slice(0, 5));
    } catch (err) {
      showToast(err.message || 'Failed to load dashboard overview', 'error');
    }
  }

  function renderOverviewRecentContacts(contactsList) {
    const tbody = document.getElementById('overview-contacts-tbody');
    if (!tbody) return;

    if (!contactsList || contactsList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            No contact messages received yet.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = contactsList
      .map(
        (c) => `
        <tr>
          <td>${escapeHtml(formatDate(c.createdAt))}</td>
          <td>
            <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(c.name)}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(c.email)}</div>
          </td>
          <td>${escapeHtml(c.subject || 'General Inquiry')}</td>
          <td>
            <span class="status-badge ${escapeHtml(c.status)}">${escapeHtml(c.status)}</span>
          </td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="window.viewContactDetail(${c.id})">
              View
            </button>
          </td>
        </tr>
      `
      )
      .join('');
  }

  // ==========================================================================
  // SECTION 2: PROJECTS MANAGEMENT
  // ==========================================================================
  function setupProjectsCRUD() {
    const createBtn = document.getElementById('btn-create-project');
    const projectForm = document.getElementById('project-form');
    const saveBtn = document.getElementById('project-save-btn');

    const customTechInput = document.getElementById('project-custom-tech-input');
    const addCustomTechBtn = document.getElementById('btn-add-custom-tech');

    const handleAddCustomTag = () => {
      if (!customTechInput) return;
      const val = customTechInput.value.trim();
      if (!val) return;
      if (!selectedProjectTechTags.includes(val)) {
        selectedProjectTechTags.push(val);
        renderProjectTechPicker();
      }
      customTechInput.value = '';
    };

    if (addCustomTechBtn) {
      addCustomTechBtn.addEventListener('click', handleAddCustomTag);
    }
    if (customTechInput) {
      customTechInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddCustomTag();
        }
      });
    }

    if (createBtn) {
      createBtn.addEventListener('click', () => {
        openProjectModalForCreate();
      });
    }

    if (projectForm) {
      projectForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('project-form-id').value;
        const title = document.getElementById('project-title').value.trim();
        const slug = document.getElementById('project-slug').value.trim();
        const category = document.getElementById('project-category').value.trim();
        const techStack = document.getElementById('project-tech-stack').value.trim();
        const description = document.getElementById('project-description').value.trim();
        const githubUrl = document.getElementById('project-github-url').value.trim() || null;
        const liveDemoUrl = document.getElementById('project-live-url').value.trim() || null;
        const imageUrl = document.getElementById('project-image-url').value.trim() || null;
        const isFeatured = document.getElementById('project-is-featured').checked;
        const sortOrder = parseInt(document.getElementById('project-sort-order').value, 10) || 0;

        // Validation
        if (!title || !category || !techStack || !description) {
          showToast('Please fill in all required fields marked with *', 'error');
          return;
        }

        const payload = {
          title,
          category,
          techStack,
          description,
          githubUrl,
          liveDemoUrl,
          imageUrl,
          isFeatured,
          sortOrder,
        };

        if (slug) {
          payload.slug = slug;
        }

        setLoadingState(saveBtn, true, 'Saving...');

        try {
          if (id) {
            // Update existing
            await adminFetch(`/api/admin/projects/${id}`, {
              method: 'PUT',
              body: JSON.stringify(payload),
            });
            showToast('Project updated successfully!', 'success');
          } else {
            // Create new
            await adminFetch('/api/admin/projects', {
              method: 'POST',
              body: JSON.stringify(payload),
            });
            showToast('Project created successfully!', 'success');
          }

          closeModal('project-modal');
          loadProjectsData();
          loadOverviewData();
        } catch (err) {
          showToast(err.message || 'Operation failed', 'error');
        } finally {
          setLoadingState(saveBtn, false, 'Save Project');
        }
      });
    }
  }

  function openProjectModalForCreate() {
    const modalTitle = document.getElementById('project-modal-title');
    if (modalTitle) modalTitle.textContent = 'Add New Project';

    document.getElementById('project-form-id').value = '';
    document.getElementById('project-title').value = '';
    document.getElementById('project-slug').value = '';
    document.getElementById('project-category').value = '';
    document.getElementById('project-description').value = '';
    document.getElementById('project-github-url').value = '';
    document.getElementById('project-live-url').value = '';
    document.getElementById('project-image-url').value = '';
    document.getElementById('project-is-featured').checked = false;
    document.getElementById('project-sort-order').value = '0';

    initProjectTechPicker('');
    openModal('project-modal');
  }

  window.openProjectModalForEdit = function (id) {
    const project = cachedProjects.find((p) => p.id === id);
    if (!project) return;

    const modalTitle = document.getElementById('project-modal-title');
    if (modalTitle) modalTitle.textContent = 'Edit Project';

    document.getElementById('project-form-id').value = project.id;
    document.getElementById('project-title').value = project.title || '';
    document.getElementById('project-slug').value = project.slug || '';
    document.getElementById('project-category').value = project.category || '';
    document.getElementById('project-description').value = project.description || '';
    document.getElementById('project-github-url').value = project.githubUrl || '';
    document.getElementById('project-live-url').value = project.liveDemoUrl || '';
    document.getElementById('project-image-url').value = project.imageUrl || '';
    document.getElementById('project-is-featured').checked = Boolean(project.isFeatured);
    document.getElementById('project-sort-order').value = project.sortOrder ?? 0;

    initProjectTechPicker(project.techStack || '');
    openModal('project-modal');
  };

  window.confirmDeleteProject = function (id, title) {
    showConfirmDelete(
      'Delete Project',
      `Are you sure you want to delete "${title}"? This cannot be undone.`,
      async () => {
        try {
          await adminFetch(`/api/admin/projects/${id}`, { method: 'DELETE' });
          showToast('Project deleted successfully', 'success');
          loadProjectsData();
          loadOverviewData();
        } catch (err) {
          showToast(err.message || 'Failed to delete project', 'error');
        }
      }
    );
  };

  async function loadProjectsData() {
    const tbody = document.getElementById('projects-tbody');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2.5rem;">
          <div class="skeleton" style="height: 24px; margin-bottom: 0.5rem;"></div>
          <div class="skeleton" style="height: 24px;"></div>
        </td>
      </tr>
    `;

    try {
      const res = await adminFetch('/api/admin/projects');
      cachedProjects = res.data || [];

      if (cachedProjects.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-muted);">
              No projects found. Click "+ Add Project" to create your first portfolio entry.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = cachedProjects
        .map((p) => {
          const featuredHtml = p.isFeatured
            ? `<span class="badge-featured">&#9733; Featured</span>`
            : `<span style="color: var(--text-muted); font-size: 0.8rem;">No</span>`;

          const techBadges = (p.techStack || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 3)
            .map((t) => `<span style="display:inline-block; font-size: 0.75rem; padding: 0.1rem 0.4rem; background: rgba(255,255,255,0.06); border-radius: 4px; margin: 2px;">${escapeHtml(t)}</span>`)
            .join('');

          return `
            <tr>
              <td><strong>${escapeHtml(p.sortOrder)}</strong></td>
              <td>
                <div style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">${escapeHtml(p.title)}</div>
                <div style="font-size: 0.8rem; color: var(--accent-cyan); font-family: monospace;">/${escapeHtml(p.slug)}</div>
              </td>
              <td><span style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(p.category)}</span></td>
              <td>${techBadges}</td>
              <td>${featuredHtml}</td>
              <td style="text-align: right;">
                <div class="action-btn-group" style="justify-content: flex-end;">
                  <button class="btn-icon" title="Edit Project" onclick="window.openProjectModalForEdit(${p.id})">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  </button>
                  <button class="btn-icon delete" title="Delete Project" onclick="window.confirmDeleteProject(${p.id}, '${escapeHtml(p.title.replace(/'/g, "\\'"))}')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      showToast(err.message || 'Failed to load projects', 'error');
    }
  }

  // ==========================================================================
  // SECTION 3: EXPERIENCES MANAGEMENT
  // ==========================================================================
  function setupExperiencesCRUD() {
    const createBtn = document.getElementById('btn-create-experience');
    const expForm = document.getElementById('experience-form');
    const isCurrentCheckbox = document.getElementById('exp-is-current');
    const endDateGroup = document.getElementById('exp-end-date-group');
    const saveBtn = document.getElementById('experience-save-btn');

    if (isCurrentCheckbox && endDateGroup) {
      isCurrentCheckbox.addEventListener('change', () => {
        if (isCurrentCheckbox.checked) {
          endDateGroup.style.opacity = '0.4';
          document.getElementById('exp-end-date').value = '';
          document.getElementById('exp-end-date').disabled = true;
        } else {
          endDateGroup.style.opacity = '1';
          document.getElementById('exp-end-date').disabled = false;
        }
      });
    }

    if (createBtn) {
      createBtn.addEventListener('click', () => {
        openExperienceModalForCreate();
      });
    }

    if (expForm) {
      expForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('experience-form-id').value;
        const company = document.getElementById('exp-company').value.trim();
        const role = document.getElementById('exp-role').value.trim();
        const location = document.getElementById('exp-location').value.trim() || null;
        const startDate = document.getElementById('exp-start-date').value;
        const isCurrent = document.getElementById('exp-is-current').checked;
        const endDate = isCurrent ? null : document.getElementById('exp-end-date').value || null;
        const description = document.getElementById('exp-description').value.trim();
        const sortOrder = parseInt(document.getElementById('exp-sort-order').value, 10) || 0;

        // Validation
        if (!company || !role || !startDate || !description) {
          showToast('Please fill in all required fields marked with *', 'error');
          return;
        }

        // Date validation: startDate <= endDate
        if (!isCurrent && endDate && startDate > endDate) {
          showToast('Invalid date range: Start date cannot be after end date.', 'error');
          return;
        }

        const payload = {
          company,
          role,
          location,
          startDate,
          endDate,
          isCurrent,
          description,
          sortOrder,
          certificateUrl: null,
          certificateType: null,
          certificateName: null,
        };

        setLoadingState(saveBtn, true, 'Saving...');

        try {
          if (id) {
            await adminFetch(`/api/admin/experiences/${id}`, {
              method: 'PUT',
              body: JSON.stringify(payload),
            });
            showToast('Experience updated successfully!', 'success');
          } else {
            await adminFetch('/api/admin/experiences', {
              method: 'POST',
              body: JSON.stringify(payload),
            });
            showToast('Experience created successfully!', 'success');
          }

          closeModal('experience-modal');
          loadExperiencesData();
          loadOverviewData();
        } catch (err) {
          showToast(err.message || 'Operation failed', 'error');
        } finally {
          setLoadingState(saveBtn, false, 'Save Experience');
        }
      });
    }
  }

  function openExperienceModalForCreate() {
    const modalTitle = document.getElementById('experience-modal-title');
    if (modalTitle) modalTitle.textContent = 'Add Career Experience';

    document.getElementById('experience-form-id').value = '';
    document.getElementById('exp-company').value = '';
    document.getElementById('exp-role').value = '';
    document.getElementById('exp-location').value = '';
    document.getElementById('exp-start-date').value = '';
    document.getElementById('exp-end-date').value = '';
    document.getElementById('exp-end-date').disabled = false;
    document.getElementById('exp-is-current').checked = false;
    document.getElementById('exp-description').value = '';
    document.getElementById('exp-sort-order').value = '0';

    const endDateGroup = document.getElementById('exp-end-date-group');
    if (endDateGroup) endDateGroup.style.opacity = '1';

    openModal('experience-modal');
  }

  window.openExperienceModalForEdit = function (id) {
    const exp = cachedExperiences.find((e) => e.id === id);
    if (!exp) return;

    const modalTitle = document.getElementById('experience-modal-title');
    if (modalTitle) modalTitle.textContent = 'Edit Experience';

    document.getElementById('experience-form-id').value = exp.id;
    document.getElementById('exp-company').value = exp.company || '';
    document.getElementById('exp-role').value = exp.role || '';
    document.getElementById('exp-location').value = exp.location || '';
    document.getElementById('exp-start-date').value = exp.startDate || '';
    document.getElementById('exp-end-date').value = exp.endDate || '';
    document.getElementById('exp-is-current').checked = Boolean(exp.isCurrent);
    document.getElementById('exp-description').value = exp.description || '';
    document.getElementById('exp-sort-order').value = exp.sortOrder ?? 0;

    const endDateGroup = document.getElementById('exp-end-date-group');
    if (endDateGroup) {
      if (exp.isCurrent) {
        endDateGroup.style.opacity = '0.4';
        document.getElementById('exp-end-date').disabled = true;
      } else {
        endDateGroup.style.opacity = '1';
        document.getElementById('exp-end-date').disabled = false;
      }
    }

    openModal('experience-modal');
  };

  window.confirmDeleteExperience = function (id, company) {
    showConfirmDelete(
      'Delete Experience',
      `Are you sure you want to delete experience at "${company}"? This cannot be undone.`,
      async () => {
        try {
          await adminFetch(`/api/admin/experiences/${id}`, { method: 'DELETE' });
          showToast('Experience deleted successfully', 'success');
          loadExperiencesData();
          loadOverviewData();
        } catch (err) {
          showToast(err.message || 'Failed to delete experience', 'error');
        }
      }
    );
  };

  async function loadExperiencesData() {
    const tbody = document.getElementById('experiences-tbody');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2.5rem;">
          <div class="skeleton" style="height: 24px; margin-bottom: 0.5rem;"></div>
          <div class="skeleton" style="height: 24px;"></div>
        </td>
      </tr>
    `;

    try {
      const res = await adminFetch('/api/admin/experiences');
      cachedExperiences = res.data || [];

      if (cachedExperiences.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-muted);">
              No experiences recorded yet. Click "+ Add Experience" to add one.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = cachedExperiences
        .map((e) => {
          const statusBadge = e.isCurrent
            ? `<span class="status-badge current">Current</span>`
            : `<span style="color: var(--text-muted); font-size: 0.8rem;">Past</span>`;

          const periodText = `${formatDate(e.startDate)} &mdash; ${e.isCurrent ? 'Present' : formatDate(e.endDate)}`;

          return `
            <tr>
              <td><strong>${escapeHtml(e.sortOrder)}</strong></td>
              <td>
                <div style="font-weight: 700; color: var(--text-primary);">${escapeHtml(e.company)}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(e.location || 'Remote / Unspecified')}</div>
              </td>
              <td><span style="font-weight: 600; color: var(--accent-cyan); font-size: 0.9rem;">${escapeHtml(e.role)}</span></td>
              <td style="font-size: 0.85rem; color: var(--text-secondary);">${periodText}</td>
              <td>${statusBadge}</td>
              <td style="text-align: right;">
                <div class="action-btn-group" style="justify-content: flex-end;">
                  <button class="btn-icon" title="Edit Experience" onclick="window.openExperienceModalForEdit(${e.id})">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  </button>
                  <button class="btn-icon delete" title="Delete Experience" onclick="window.confirmDeleteExperience(${e.id}, '${escapeHtml(e.company.replace(/'/g, "\\'"))}')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('');
    } catch (err) {
      showToast(err.message || 'Failed to load experiences', 'error');
    }
  }

  // ==========================================================================
  // SECTION 3.5: TECH STACKS & SKILLS MANAGEMENT
  // ==========================================================================
  function setupTechStacksCRUD() {
    const createBtn = document.getElementById('btn-create-tech-stack');
    const tsForm = document.getElementById('tech-stack-form');
    const saveBtn = document.getElementById('tech-stack-save-btn');
    const filterGroup = document.getElementById('tech-stack-filter-group');

    if (filterGroup) {
      filterGroup.querySelectorAll('.filter-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          filterGroup.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          currentTechStackFilter = btn.getAttribute('data-ts-category') || '';
          renderTechStacksTable();
        });
      });
    }

    if (createBtn) {
      createBtn.addEventListener('click', () => {
        openTechStackModalForCreate();
      });
    }

    if (tsForm) {
      tsForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('tech-stack-form-id').value;
        const name = document.getElementById('tech-stack-name').value.trim();
        const category = document.getElementById('tech-stack-category').value.trim();
        const proficiency = document.getElementById('tech-stack-proficiency').value;
        const sortOrder = parseInt(document.getElementById('tech-stack-sort-order').value, 10) || 0;
        const isLearning = document.getElementById('tech-stack-is-learning').checked;

        if (!name || !category) {
          showToast('Name and category are required', 'error');
          return;
        }

        const payload = {
          name,
          category,
          proficiency,
          sortOrder,
          isLearning,
        };

        setLoadingState(saveBtn, true, 'Saving...');

        try {
          if (id) {
            await adminFetch(`/api/admin/tech-stacks/${id}`, {
              method: 'PUT',
              body: JSON.stringify(payload),
            });
            showToast('Tech stack updated successfully!', 'success');
          } else {
            await adminFetch('/api/admin/tech-stacks', {
              method: 'POST',
              body: JSON.stringify(payload),
            });
            showToast('Tech stack created successfully!', 'success');
          }

          closeModal('tech-stack-modal');
          loadTechStacksData();
          loadOverviewData();
        } catch (err) {
          showToast(err.message || 'Operation failed', 'error');
        } finally {
          setLoadingState(saveBtn, false, 'Save Tech Stack');
        }
      });
    }

    // Handlers for dedicated "+ Add Field / Category" modal
    const createCatBtn = document.getElementById('btn-create-category');
    const catForm = document.getElementById('category-form');
    const catSaveBtn = document.getElementById('category-save-btn');

    if (createCatBtn) {
      createCatBtn.addEventListener('click', () => {
        if (catForm) catForm.reset();
        openModal('category-modal');
      });
    }

    if (catForm) {
      catForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const categoryName = (document.getElementById('new-category-name')?.value || '').trim();
        const rawSkills = (document.getElementById('new-category-skills')?.value || '').trim();
        const proficiency = document.getElementById('new-category-proficiency')?.value || 'Proficient';
        let sortOrder = parseInt(document.getElementById('new-category-sort-order')?.value, 10) || 30;

        if (!categoryName) {
          showToast('Please provide a category/field name (e.g. Web Development)', 'error');
          return;
        }

        const skills = rawSkills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        if (skills.length === 0) {
          showToast('Please enter at least one skill in this category (comma-separated)', 'error');
          return;
        }

        setLoadingState(catSaveBtn, true, 'Creating Field...');

        try {
          // Create each skill item under the new category
          for (const skill of skills) {
            await adminFetch('/api/admin/tech-stacks', {
              method: 'POST',
              body: JSON.stringify({
                name: skill,
                category: categoryName,
                proficiency,
                sortOrder: sortOrder++,
                isLearning: false,
              }),
            });
          }

          showToast(`Field "${categoryName}" with ${skills.length} skills created successfully!`, 'success');
          closeModal('category-modal');
          loadTechStacksData();
          loadOverviewData();
        } catch (err) {
          showToast(err.message || 'Failed to create category and skills', 'error');
        } finally {
          setLoadingState(catSaveBtn, false, 'Create Field & Skills');
        }
      });
    }

    // Handlers for dedicated "− Delete Field / Category" modal
    const deleteCatBtn = document.getElementById('btn-delete-category');
    const deleteCatForm = document.getElementById('delete-category-form');
    const deleteCatSelect = document.getElementById('delete-category-select');
    const deleteCatSubmitBtn = document.getElementById('delete-category-submit-btn');
    const deleteCatSkillsList = document.getElementById('delete-category-skills-list');
    const deleteCatCount = document.getElementById('delete-category-count');

    function populateDeleteCategoryModal(preselectedCategory = '') {
      if (!deleteCatSelect) return;

      // Extract unique categories from cachedTechStacks
      const categoryMap = new Map();
      for (const s of cachedTechStacks) {
        const cat = (s.category || '').trim();
        if (!cat) continue;
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, []);
        }
        categoryMap.get(cat).push(s.name);
      }

      deleteCatSelect.innerHTML = '<option value="">-- Choose a category to delete --</option>';

      if (categoryMap.size === 0) {
        deleteCatSelect.innerHTML = '<option value="">No categories found</option>';
        if (deleteCatSubmitBtn) deleteCatSubmitBtn.disabled = true;
        if (deleteCatSkillsList) deleteCatSkillsList.textContent = 'There are no categories available to delete.';
        if (deleteCatCount) deleteCatCount.textContent = '0';
        return;
      }

      for (const [catName, skills] of categoryMap.entries()) {
        const opt = document.createElement('option');
        opt.value = catName;
        opt.textContent = `${catName} (${skills.length} skills)`;
        deleteCatSelect.appendChild(opt);
      }

      // Check if we should preselect
      const targetCat = preselectedCategory && categoryMap.has(preselectedCategory)
        ? preselectedCategory
        : (currentTechStackFilter && categoryMap.has(currentTechStackFilter) ? currentTechStackFilter : '');

      if (targetCat) {
        deleteCatSelect.value = targetCat;
      }

      updateDeleteCategoryPreview();
    }

    function updateDeleteCategoryPreview() {
      const selectedCat = deleteCatSelect ? deleteCatSelect.value : '';
      if (!selectedCat) {
        if (deleteCatSubmitBtn) deleteCatSubmitBtn.disabled = true;
        if (deleteCatCount) deleteCatCount.textContent = '0';
        if (deleteCatSkillsList) deleteCatSkillsList.innerHTML = '<span style="color: var(--admin-text-muted);">Please select a category above to view affected items.</span>';
        return;
      }

      const matchingSkills = cachedTechStacks.filter((s) => s.category === selectedCat);
      if (deleteCatCount) deleteCatCount.textContent = matchingSkills.length;
      if (deleteCatSubmitBtn) deleteCatSubmitBtn.disabled = false;

      if (deleteCatSkillsList) {
        if (matchingSkills.length === 0) {
          deleteCatSkillsList.innerHTML = '<em>No skills found under this category.</em>';
        } else {
          deleteCatSkillsList.innerHTML = matchingSkills
            .map((s) => `<span style="display: inline-block; margin: 2px 4px 2px 0; padding: 2px 8px; border-radius: 4px; background: rgba(255,255,255,0.08); font-size: 0.8rem; font-weight: 500;">${escapeHtml(s.name)}</span>`)
            .join(' ');
        }
      }
    }

    if (deleteCatSelect) {
      deleteCatSelect.addEventListener('change', updateDeleteCategoryPreview);
    }

    if (deleteCatBtn) {
      deleteCatBtn.addEventListener('click', () => {
        populateDeleteCategoryModal(currentTechStackFilter);
        openModal('delete-category-modal');
      });
    }

    if (deleteCatForm) {
      deleteCatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedCat = (deleteCatSelect?.value || '').trim();
        if (!selectedCat) {
          showToast('Please select a category/field to delete', 'error');
          return;
        }

        const count = cachedTechStacks.filter((s) => s.category === selectedCat).length;

        showConfirmDelete(
          `Delete Field "${selectedCat}"`,
          `Are you absolutely sure you want to delete the entire "${selectedCat}" field and all of its ${count} skills? This cannot be undone.`,
          async () => {
            setLoadingState(deleteCatSubmitBtn, true, 'Deleting Field...');
            try {
              const res = await adminFetch(`/api/admin/tech-stacks/category/${encodeURIComponent(selectedCat)}`, {
                method: 'DELETE',
              });

              showToast(res.message || `Field "${selectedCat}" deleted successfully!`, 'success');
              closeModal('delete-category-modal');

              if (currentTechStackFilter === selectedCat) {
                currentTechStackFilter = '';
              }

              loadTechStacksData();
              loadOverviewData();
            } catch (err) {
              showToast(err.message || 'Failed to delete field/category', 'error');
            } finally {
              setLoadingState(deleteCatSubmitBtn, false, 'Delete Field & All Skills');
            }
          }
        );
      });
    }
  }

  async function loadTechStacksData() {
    const tbody = document.getElementById('tech-stacks-tbody');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2.5rem;">
          <div class="skeleton" style="height: 24px; margin-bottom: 0.5rem;"></div>
          <div class="skeleton" style="height: 24px;"></div>
        </td>
      </tr>
    `;

    try {
      const res = await adminFetch('/api/admin/tech-stacks');
      cachedTechStacks = res.data || [];
      renderTechStackFilterButtons();
      renderTechStacksTable();
      renderProjectTechPicker();
    } catch (err) {
      showToast(err.message || 'Failed to load tech stacks', 'error');
    }
  }

  function renderTechStackFilterButtons() {
    const filterGroup = document.getElementById('tech-stack-filter-group');
    if (!filterGroup) return;

    // Dynamically derive categories from loaded tech stacks
    const categories = [];
    const catSet = new Set();
    for (const s of cachedTechStacks) {
      const cat = (s.category || '').trim();
      if (cat && !catSet.has(cat)) {
        catSet.add(cat);
        categories.push(cat);
      }
    }

    let html = `<button class="filter-btn ${!currentTechStackFilter ? 'active' : ''}" data-ts-category="">All (${cachedTechStacks.length})</button>`;

    for (const cat of categories) {
      const count = cachedTechStacks.filter((s) => s.category === cat).length;
      const isActive = currentTechStackFilter === cat ? 'active' : '';
      html += `<button class="filter-btn ${isActive}" data-ts-category="${escapeHtml(cat)}">${escapeHtml(cat)} (${count})</button>`;
    }

    filterGroup.innerHTML = html;

    filterGroup.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        filterGroup.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentTechStackFilter = btn.getAttribute('data-ts-category') || '';
        renderTechStacksTable();
      });
    });

    const datalist = document.getElementById('tech-category-suggestions');
    if (datalist && categories.length > 0) {
      datalist.innerHTML = categories
        .map((cat) => `<option value="${escapeHtml(cat)}">`)
        .join('');
    }
  }

  function renderTechStacksTable() {
    const tbody = document.getElementById('tech-stacks-tbody');
    if (!tbody) return;

    let filtered = cachedTechStacks;
    if (currentTechStackFilter) {
      if (currentTechStackFilter === 'Currently Learning' || currentTechStackFilter === 'Learning (Future)') {
        filtered = cachedTechStacks.filter((s) => s.isLearning || s.category === 'Currently Learning' || s.category === 'Certifications & Training');
      } else {
        filtered = cachedTechStacks.filter((s) => 
          s.category === currentTechStackFilter ||
          s.category.toLowerCase().includes(currentTechStackFilter.toLowerCase())
        );
      }
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 3rem; color: var(--admin-text-muted);">
            No tech stacks found in category "${escapeHtml(currentTechStackFilter || 'All')}". Click "+ Add Tech Stack" to add one.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered
      .map((s) => {
        const learningBadge = s.isLearning
          ? `<span class="badge-learning">● Currently Learning</span>`
          : `<span style="color: var(--admin-text-muted); font-size: 0.8rem;">Standard Stack</span>`;

        return `
          <tr>
            <td><strong>${escapeHtml(s.sortOrder)}</strong></td>
            <td>
              <div style="font-weight: 700; color: var(--admin-text-primary); font-size: 0.95rem;">${escapeHtml(s.name)}</div>
            </td>
            <td>
              <span style="display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; background: rgba(255,255,255,0.06); font-size: 0.8rem; color: #cbd5e1;">
                ${escapeHtml(s.category)}
              </span>
            </td>
            <td>
              <span style="font-weight: 600; color: var(--admin-accent-cyan); font-size: 0.85rem;">${escapeHtml(s.proficiency)}</span>
            </td>
            <td>${learningBadge}</td>
            <td style="text-align: right;">
              <div class="action-btn-group" style="justify-content: flex-end;">
                <button class="btn-icon" title="Edit Tech Stack" onclick="window.openTechStackModalForEdit(${s.id})">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                <button class="btn-icon delete" title="Delete Tech Stack" onclick="window.confirmDeleteTechStack(${s.id}, '${escapeHtml(s.name.replace(/'/g, "\\'"))}')">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  function openTechStackModalForCreate() {
    const modalTitle = document.getElementById('tech-stack-modal-title');
    if (modalTitle) modalTitle.textContent = 'Add Tech Stack';

    document.getElementById('tech-stack-form-id').value = '';
    document.getElementById('tech-stack-name').value = '';
    document.getElementById('tech-stack-category').value = '';
    document.getElementById('tech-stack-proficiency').value = 'Proficient';
    document.getElementById('tech-stack-sort-order').value = '0';
    document.getElementById('tech-stack-is-learning').checked = false;

    openModal('tech-stack-modal');
  }

  window.openTechStackModalForEdit = function (id) {
    const stack = cachedTechStacks.find((s) => s.id === id);
    if (!stack) return;

    const modalTitle = document.getElementById('tech-stack-modal-title');
    if (modalTitle) modalTitle.textContent = 'Edit Tech Stack';

    document.getElementById('tech-stack-form-id').value = stack.id;
    document.getElementById('tech-stack-name').value = stack.name || '';
    document.getElementById('tech-stack-category').value = stack.category || '';
    document.getElementById('tech-stack-proficiency').value = stack.proficiency || 'Proficient';
    document.getElementById('tech-stack-sort-order').value = stack.sortOrder ?? 0;
    document.getElementById('tech-stack-is-learning').checked = Boolean(stack.isLearning);

    openModal('tech-stack-modal');
  };

  window.confirmDeleteTechStack = function (id, name) {
    showConfirmDelete(
      'Delete Tech Stack',
      `Are you sure you want to delete "${name}" from the tech stack library?`,
      async () => {
        try {
          await adminFetch(`/api/admin/tech-stacks/${id}`, { method: 'DELETE' });
          showToast('Tech stack deleted successfully', 'success');
          loadTechStacksData();
          loadOverviewData();
        } catch (err) {
          showToast(err.message || 'Failed to delete tech stack', 'error');
        }
      }
    );
  };

  // Helper: Interactive Tech Stack Tag Picker in Project Modal
  function initProjectTechPicker(initialTagsString = '') {
    if (initialTagsString && initialTagsString.trim()) {
      selectedProjectTechTags = initialTagsString
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      selectedProjectTechTags = [];
    }
    renderProjectTechPicker();
  }

  function renderProjectTechPicker() {
    const selectedContainer = document.getElementById('project-tech-selected-container');
    const availableContainer = document.getElementById('project-tech-available-tags');
    const hiddenInput = document.getElementById('project-tech-stack');

    if (hiddenInput) {
      hiddenInput.value = selectedProjectTechTags.join(', ');
    }

    if (selectedContainer) {
      if (selectedProjectTechTags.length === 0) {
        selectedContainer.innerHTML = '<span style="color: var(--admin-text-muted); font-size: 0.8rem; font-style: italic;">No tech stack selected yet. Click from library below or add custom tag.</span>';
      } else {
        selectedContainer.innerHTML = selectedProjectTechTags
          .map(
            (tag, idx) => `
            <span class="tech-selected-pill">
              <span>${escapeHtml(tag)}</span>
              <button type="button" class="pill-remove" onclick="window.removeProjectTechTag(${idx})" title="Remove ${escapeHtml(tag)}">&times;</button>
            </span>
          `
          )
          .join('');
      }
    }

    if (availableContainer) {
      const groups = {};
      cachedTechStacks.forEach((ts) => {
        const cat = ts.category || 'General';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(ts);
      });

      const categories = Object.keys(groups);
      if (categories.length === 0) {
        availableContainer.innerHTML = '<div style="color: var(--admin-text-muted); font-size: 0.8rem;">No library tech stacks loaded yet.</div>';
      } else {
        availableContainer.innerHTML = categories
          .map((cat) => {
            const tagsHtml = groups[cat]
              .map((ts) => {
                const isSelected = selectedProjectTechTags.includes(ts.name);
                return `
                  <button type="button" class="tag-select-btn ${isSelected ? 'active' : ''}" onclick="window.toggleProjectTechTag('${escapeHtml(ts.name.replace(/'/g, "\\'"))}')">
                    <span>${isSelected ? '✓' : '+'}</span>
                    <span>${escapeHtml(ts.name)}</span>
                  </button>
                `;
              })
              .join('');

            return `
              <div>
                <div class="tech-category-group-title">${escapeHtml(cat)}</div>
                <div class="tech-available-tags">${tagsHtml}</div>
              </div>
            `;
          })
          .join('');
      }
    }
  }

  window.toggleProjectTechTag = function (tagName) {
    const idx = selectedProjectTechTags.indexOf(tagName);
    if (idx >= 0) {
      selectedProjectTechTags.splice(idx, 1);
    } else {
      selectedProjectTechTags.push(tagName);
    }
    renderProjectTechPicker();
  };

  window.removeProjectTechTag = function (index) {
    if (index >= 0 && index < selectedProjectTechTags.length) {
      selectedProjectTechTags.splice(index, 1);
      renderProjectTechPicker();
    }
  };

  // ==========================================================================
  // SECTION 4: CONTACT INQUIRIES MANAGEMENT
  // ==========================================================================
  let currentContactFilter = '';

  function setupContactsManagement() {
    const filterButtons = document.querySelectorAll('.filter-btn[data-status]');
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentContactFilter = btn.getAttribute('data-status') || '';
        loadContactsData();
      });
    });
  }

  async function loadContactsData() {
    const tbody = document.getElementById('contacts-tbody');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 2.5rem;">
          <div class="skeleton" style="height: 24px; margin-bottom: 0.5rem;"></div>
          <div class="skeleton" style="height: 24px;"></div>
        </td>
      </tr>
    `;

    try {
      const url = currentContactFilter
        ? `/api/admin/contacts?status=${encodeURIComponent(currentContactFilter)}`
        : '/api/admin/contacts';

      const res = await adminFetch(url);
      cachedContacts = res.data || [];

      if (cachedContacts.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-muted);">
              No messages found${currentContactFilter ? ` with status "${currentContactFilter}"` : ''}.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = cachedContacts
        .map(
          (c) => `
          <tr>
            <td>${escapeHtml(formatDate(c.createdAt))}</td>
            <td><strong style="color: var(--text-primary);">${escapeHtml(c.name)}</strong></td>
            <td><a href="mailto:${escapeHtml(c.email)}" style="color: var(--accent-cyan); text-decoration: underline;">${escapeHtml(c.email)}</a></td>
            <td>${escapeHtml(c.subject || 'General Inquiry')}</td>
            <td>
              <span class="status-badge ${escapeHtml(c.status)}">${escapeHtml(c.status)}</span>
            </td>
            <td style="text-align: right;">
              <button class="btn btn-secondary btn-sm" onclick="window.viewContactDetail(${c.id})">
                View Detail
              </button>
            </td>
          </tr>
        `
        )
        .join('');
    } catch (err) {
      showToast(err.message || 'Failed to load contact inquiries', 'error');
    }
  }

  window.viewContactDetail = async function (id) {
    try {
      const res = await adminFetch(`/api/admin/contacts/${id}`);
      const contact = res.data;
      if (!contact) return;

      document.getElementById('detail-sender').textContent = contact.name || 'Anonymous';
      document.getElementById('detail-email').textContent = contact.email || 'N/A';
      document.getElementById('detail-subject').textContent = contact.subject || 'General Inquiry';
      document.getElementById('detail-date').textContent = formatDate(contact.createdAt);

      const statusEl = document.getElementById('detail-status');
      if (statusEl) {
        statusEl.innerHTML = `<span class="status-badge ${escapeHtml(contact.status)}">${escapeHtml(contact.status)}</span>`;
      }

      document.getElementById('detail-message').textContent = contact.message || '(Empty message)';

      // Setup status action buttons
      const actionsEl = document.getElementById('detail-status-actions');
      if (actionsEl) {
        let actionButtonsHtml = '';
        if (contact.status === 'unread') {
          actionButtonsHtml += `
            <button class="btn btn-primary btn-sm" onclick="window.updateContactStatus(${contact.id}, 'read')">
              Mark as Read
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.updateContactStatus(${contact.id}, 'archived')">
              Archive
            </button>
          `;
        } else if (contact.status === 'read') {
          actionButtonsHtml += `
            <button class="btn btn-secondary btn-sm" onclick="window.updateContactStatus(${contact.id}, 'unread')">
              Mark as Unread
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.updateContactStatus(${contact.id}, 'archived')">
              Archive
            </button>
          `;
        } else if (contact.status === 'archived') {
          actionButtonsHtml += `
            <button class="btn btn-secondary btn-sm" onclick="window.updateContactStatus(${contact.id}, 'read')">
              Restore to Read
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.updateContactStatus(${contact.id}, 'unread')">
              Mark as Unread
            </button>
          `;
        }
        actionsEl.innerHTML = actionButtonsHtml;
      }

      openModal('contact-detail-modal');

      // If viewing an unread message, offer prompt or auto update to read
    } catch (err) {
      showToast(err.message || 'Failed to retrieve message details', 'error');
    }
  };

  window.updateContactStatus = async function (id, newStatus) {
    try {
      await adminFetch(`/api/admin/contacts/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      showToast(`Message marked as ${newStatus}`, 'success');
      closeModal('contact-detail-modal');
      loadContactsData();
      loadOverviewData();
    } catch (err) {
      showToast(err.message || 'Failed to update message status', 'error');
    }
  };

  // ==========================================================================
  // SECTION 6: ARTICLES MANAGEMENT
  // ==========================================================================
  let cachedArticles = [];

  function setupArticlesCRUD() {
    const addBtn = document.getElementById('btn-add-article');
    const articleForm = document.getElementById('article-form');
    const searchInput = document.getElementById('admin-articles-search');

    if (addBtn) addBtn.addEventListener('click', openArticleModalForCreate);

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const filtered = cachedArticles.filter(
          (a) =>
            (a.title && a.title.toLowerCase().includes(query)) ||
            (a.category && a.category.toLowerCase().includes(query)) ||
            (a.tags && a.tags.toLowerCase().includes(query)) ||
            (a.slug && a.slug.toLowerCase().includes(query))
        );
        renderArticlesTable(filtered);
      });
    }

    // Utility to insert text at textarea cursor position
    function insertAtCursor(textarea, textToInsert) {
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const original = textarea.value;
      textarea.value = original.substring(0, start) + textToInsert + original.substring(end);
      const newPos = start + textToInsert.length;
      textarea.selectionStart = newPos;
      textarea.selectionEnd = newPos;
      textarea.focus();
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Markdown tabs: Write vs Preview
    const tabWrite = document.getElementById('tab-article-write');
    const tabPreview = document.getElementById('tab-article-preview');
    const contentTextarea = document.getElementById('article-content-input');
    const previewPane = document.getElementById('article-markdown-preview-pane');

    if (tabWrite && tabPreview && contentTextarea && previewPane) {
      tabWrite.addEventListener('click', () => {
        tabWrite.style.background = 'var(--accent-black)';
        tabWrite.style.color = 'var(--text-inverse)';
        tabPreview.style.background = 'var(--bg-card)';
        tabPreview.style.color = 'var(--text-secondary)';
        contentTextarea.style.display = 'block';
        previewPane.style.display = 'none';
      });

      tabPreview.addEventListener('click', () => {
        tabPreview.style.background = 'var(--accent-black)';
        tabPreview.style.color = 'var(--text-inverse)';
        tabWrite.style.background = 'var(--bg-card)';
        tabWrite.style.color = 'var(--text-secondary)';
        contentTextarea.style.display = 'none';
        previewPane.style.display = 'block';

        const raw = contentTextarea.value || '';
        if (window.marked && typeof window.marked.parse === 'function') {
          previewPane.innerHTML = window.marked.parse(raw);
        } else {
          previewPane.innerHTML = `<pre style="white-space: pre-wrap;">${escapeHtml(raw)}</pre>`;
        }
      });
    }

    // -------------------------------------------------------------
    // Markdown Toolbar Actions
    // -------------------------------------------------------------
    function wrapSelection(before, after) {
      if (!contentTextarea) return;
      const start = contentTextarea.selectionStart;
      const end = contentTextarea.selectionEnd;
      const original = contentTextarea.value;
      const selected = original.substring(start, end) || 'text';
      const replacement = before + selected + after;
      contentTextarea.value = original.substring(0, start) + replacement + original.substring(end);
      contentTextarea.selectionStart = start + before.length;
      contentTextarea.selectionEnd = start + before.length + selected.length;
      contentTextarea.focus();
      contentTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const btnBold = document.getElementById('btn-toolbar-bold');
    if (btnBold) btnBold.addEventListener('click', () => wrapSelection('**', '**'));

    const btnItalic = document.getElementById('btn-toolbar-italic');
    if (btnItalic) btnItalic.addEventListener('click', () => wrapSelection('*', '*'));

    const btnH2 = document.getElementById('btn-toolbar-h2');
    if (btnH2) btnH2.addEventListener('click', () => insertAtCursor(contentTextarea, '\n\n## Heading 2\n'));

    const btnH3 = document.getElementById('btn-toolbar-h3');
    if (btnH3) btnH3.addEventListener('click', () => insertAtCursor(contentTextarea, '\n\n### Heading 3\n'));

    const btnQuote = document.getElementById('btn-toolbar-quote');
    if (btnQuote) btnQuote.addEventListener('click', () => insertAtCursor(contentTextarea, '\n\n> Quote text here\n'));

    const btnList = document.getElementById('btn-toolbar-list');
    if (btnList) btnList.addEventListener('click', () => insertAtCursor(contentTextarea, '\n\n- Item 1\n- Item 2\n'));

    const btnLink = document.getElementById('btn-toolbar-link');
    if (btnLink) btnLink.addEventListener('click', () => insertAtCursor(contentTextarea, '[Link Title](https://example.com)'));

    const btnCode = document.getElementById('btn-toolbar-code');
    if (btnCode) btnCode.addEventListener('click', () => wrapSelection('`', '`'));

    // -------------------------------------------------------------
    // Insert Image Modal & Direct Upload Handlers
    // -------------------------------------------------------------
    const imgModal = document.getElementById('insert-image-modal');
    const btnOpenImgModal = document.getElementById('btn-toolbar-img');
    const btnCloseImgModal = document.getElementById('btn-close-insert-img');
    const btnCancelImgModal = document.getElementById('btn-cancel-insert-img');
    const btnConfirmImg = document.getElementById('btn-confirm-insert-img');

    const tabImgUpload = document.getElementById('tab-img-upload');
    const tabImgUrl = document.getElementById('tab-img-url');
    const paneImgUpload = document.getElementById('pane-img-upload');
    const paneImgUrl = document.getElementById('pane-img-url');

    const imgDropzone = document.getElementById('img-dropzone');
    const imgUploadInput = document.getElementById('img-upload-input');
    const imgUrlInput = document.getElementById('img-url-input');
    const imgCaptionInput = document.getElementById('img-caption-input');
    const imgPreviewBox = document.getElementById('img-preview-box');
    const imgPreviewElem = document.getElementById('img-preview-elem');
    const imgPreviewStatus = document.getElementById('img-preview-status');

    let currentReadyImageUrl = '';

    function resetImageModal() {
      currentReadyImageUrl = '';
      if (imgUrlInput) imgUrlInput.value = '';
      if (imgCaptionInput) imgCaptionInput.value = '';
      if (imgUploadInput) imgUploadInput.value = '';
      if (imgPreviewBox) imgPreviewBox.style.display = 'none';
      if (imgPreviewElem) imgPreviewElem.src = '';
      if (btnConfirmImg) btnConfirmImg.disabled = true;

      // Switch to upload tab by default
      if (tabImgUpload && tabImgUrl && paneImgUpload && paneImgUrl) {
        tabImgUpload.classList.add('active');
        tabImgUrl.classList.remove('active');
        paneImgUpload.style.display = 'block';
        paneImgUrl.style.display = 'none';
      }
    }

    if (btnOpenImgModal && imgModal) {
      btnOpenImgModal.addEventListener('click', () => {
        resetImageModal();
        imgModal.style.display = 'flex';
      });
    }

    function closeInsertImageModal() {
      if (imgModal) imgModal.style.display = 'none';
    }

    if (btnCloseImgModal) btnCloseImgModal.addEventListener('click', closeInsertImageModal);
    if (btnCancelImgModal) btnCancelImgModal.addEventListener('click', closeInsertImageModal);

    if (tabImgUpload && tabImgUrl) {
      tabImgUpload.addEventListener('click', () => {
        tabImgUpload.classList.add('active');
        tabImgUrl.classList.remove('active');
        paneImgUpload.style.display = 'block';
        paneImgUrl.style.display = 'none';
      });

      tabImgUrl.addEventListener('click', () => {
        tabImgUrl.classList.add('active');
        tabImgUpload.classList.remove('active');
        paneImgUpload.style.display = 'none';
        paneImgUrl.style.display = 'block';
        if (imgUrlInput) imgUrlInput.focus();
      });
    }

    // Helper: Upload File to Server
    async function uploadArticleImage(file) {
      const formData = new FormData();
      formData.append('file', file);

      const res = await adminFetch('/api/admin/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!res.data || !res.data.url) {
        throw new Error(res.message || 'Image upload failed');
      }

      return res.data.url;
    }

    // Dropzone Click & Change
    if (imgDropzone && imgUploadInput) {
      imgDropzone.addEventListener('click', () => imgUploadInput.click());

      imgDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        imgDropzone.classList.add('drag-over');
      });

      imgDropzone.addEventListener('dragleave', () => {
        imgDropzone.classList.remove('drag-over');
      });

      imgDropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        imgDropzone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          await handleFileSelected(e.dataTransfer.files[0]);
        }
      });

      imgUploadInput.addEventListener('change', async () => {
        if (imgUploadInput.files && imgUploadInput.files[0]) {
          await handleFileSelected(imgUploadInput.files[0]);
        }
      });
    }

    async function handleFileSelected(file) {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'error');
        return;
      }

      const dropzoneText = document.getElementById('img-dropzone-text');
      if (dropzoneText) dropzoneText.textContent = 'Uploading image...';

      try {
        const uploadedUrl = await uploadArticleImage(file);
        currentReadyImageUrl = uploadedUrl;

        if (imgPreviewElem) imgPreviewElem.src = uploadedUrl;
        if (imgPreviewStatus) imgPreviewStatus.textContent = `Uploaded: ${file.name}`;
        if (imgPreviewBox) imgPreviewBox.style.display = 'block';
        if (btnConfirmImg) btnConfirmImg.disabled = false;

        if (dropzoneText) dropzoneText.textContent = 'Click to choose another photo';
        showToast('Image uploaded successfully', 'success');
      } catch (err) {
        if (dropzoneText) dropzoneText.textContent = 'Click to browse or drop photo here';
        showToast(err.message || 'Failed to upload image', 'error');
      }
    }

    // URL Input Change
    if (imgUrlInput) {
      imgUrlInput.addEventListener('input', () => {
        const url = imgUrlInput.value.trim();
        if (url) {
          currentReadyImageUrl = url;
          if (imgPreviewElem) imgPreviewElem.src = url;
          if (imgPreviewStatus) imgPreviewStatus.textContent = 'Web image URL ready';
          if (imgPreviewBox) imgPreviewBox.style.display = 'block';
          if (btnConfirmImg) btnConfirmImg.disabled = false;
        } else {
          currentReadyImageUrl = '';
          if (imgPreviewBox) imgPreviewBox.style.display = 'none';
          if (btnConfirmImg) btnConfirmImg.disabled = true;
        }
      });
    }

    // Insert Image Confirmation Button
    if (btnConfirmImg) {
      btnConfirmImg.addEventListener('click', () => {
        if (!currentReadyImageUrl) return;

        const caption = (imgCaptionInput ? imgCaptionInput.value.trim() : '');
        let markdownImage = '';

        if (caption) {
          markdownImage = `\n\n![${caption}](${currentReadyImageUrl})\n*${caption}*\n\n`;
        } else {
          markdownImage = `\n\n![Story Photo](${currentReadyImageUrl})\n\n`;
        }

        insertAtCursor(contentTextarea, markdownImage);
        closeInsertImageModal();
        showToast('Image inserted in between text!', 'success');
      });
    }

    // -------------------------------------------------------------
    // Drag & Drop / Clipboard Paste directly into Content Textarea
    // -------------------------------------------------------------
    if (contentTextarea) {
      // Paste image from clipboard
      contentTextarea.addEventListener('paste', async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            e.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;

            showToast('Uploading pasted image...', 'info');
            try {
              const uploadedUrl = await uploadArticleImage(file);
              const markdown = `\n\n![Pasted Image](${uploadedUrl})\n\n`;
              insertAtCursor(contentTextarea, markdown);
              showToast('Pasted image uploaded & inserted at cursor!', 'success');
            } catch (err) {
              showToast(err.message || 'Failed to upload pasted image', 'error');
            }
            break;
          }
        }
      });

      // Drop image directly into textarea
      contentTextarea.addEventListener('dragover', (e) => {
        e.preventDefault();
      });

      contentTextarea.addEventListener('drop', async (e) => {
        const files = e.dataTransfer?.files;
        if (files && files[0] && files[0].type.startsWith('image/')) {
          e.preventDefault();
          showToast('Uploading dropped image...', 'info');
          try {
            const uploadedUrl = await uploadArticleImage(files[0]);
            const markdown = `\n\n![${files[0].name.replace(/\.[^/.]+$/, '')}](${uploadedUrl})\n\n`;
            insertAtCursor(contentTextarea, markdown);
            showToast('Image uploaded & inserted at cursor!', 'success');
          } catch (err) {
            showToast(err.message || 'Failed to upload image', 'error');
          }
        }
      });
    }

    if (articleForm) {
      articleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('article-save-btn');
        const id = document.getElementById('article-form-id').value;

        const title = document.getElementById('article-title-input').value.trim();
        const slug = document.getElementById('article-slug-input').value.trim();
        const category = document.getElementById('article-category-input').value.trim();
        const tags = document.getElementById('article-tags-input').value.trim();
        const excerpt = document.getElementById('article-excerpt-input').value.trim();
        const content = document.getElementById('article-content-input').value;
        const isPublished = document.getElementById('article-published-input').checked;

        if (!title || title.length < 3) {
          showToast('Story title must be at least 3 characters', 'error');
          return;
        }

        if (!content || content.length < 10) {
          showToast('Story content must be at least 10 characters', 'error');
          return;
        }

        setLoadingState(saveBtn, true, 'Saving...');

        const payload = {
          title,
          content,
          isPublished,
        };
        if (slug) payload.slug = slug;
        if (category) payload.category = category;
        if (tags) payload.tags = tags;
        if (excerpt) payload.excerpt = excerpt;

        try {
          if (id) {
            await adminFetch(`/api/admin/articles/${id}`, {
              method: 'PUT',
              body: JSON.stringify(payload),
            });
            showToast('Story updated successfully', 'success');
          } else {
            await adminFetch('/api/admin/articles', {
              method: 'POST',
              body: JSON.stringify(payload),
            });
            showToast('Story created successfully', 'success');
          }

          closeModal('article-modal');
          loadArticlesData();
          loadOverviewData();
        } catch (err) {
          showToast(err.message || 'Failed to save story', 'error');
        } finally {
          setLoadingState(saveBtn, false, 'Save Story');
        }
      });
    }
  }

  function openArticleModalForCreate() {
    document.getElementById('article-modal-title').textContent = 'Add Story';
    document.getElementById('article-form-id').value = '';
    document.getElementById('article-title-input').value = '';
    document.getElementById('article-slug-input').value = '';
    document.getElementById('article-category-input').value = 'Food & Bites';
    document.getElementById('article-tags-input').value = '';
    document.getElementById('article-excerpt-input').value = '';
    document.getElementById('article-content-input').value = '';
    document.getElementById('article-published-input').checked = true;

    // Reset tabs to write
    const tabWrite = document.getElementById('tab-article-write');
    if (tabWrite) tabWrite.click();

    openModal('article-modal');
  }

  window.openArticleModalForEdit = function (id) {
    const article = cachedArticles.find((a) => a.id === id);
    if (!article) return;

    document.getElementById('article-modal-title').textContent = 'Edit Story';
    document.getElementById('article-form-id').value = article.id;
    document.getElementById('article-title-input').value = article.title || '';
    document.getElementById('article-slug-input').value = article.slug || '';
    document.getElementById('article-category-input').value = article.category || 'Food & Bites';
    document.getElementById('article-tags-input').value = article.tags || '';
    document.getElementById('article-excerpt-input').value = article.excerpt || '';
    document.getElementById('article-content-input').value = article.content || '';
    document.getElementById('article-published-input').checked = Boolean(article.isPublished);

    // Reset tabs to write
    const tabWrite = document.getElementById('tab-article-write');
    if (tabWrite) tabWrite.click();

    openModal('article-modal');
  };

  window.toggleArticlePublishStatus = async function (id) {
    try {
      const res = await adminFetch(`/api/admin/articles/${id}/toggle-publish`, {
        method: 'PATCH',
      });
      showToast(res.message || 'Article publish status updated', 'success');
      loadArticlesData();
      loadOverviewData();
    } catch (err) {
      showToast(err.message || 'Failed to toggle publish status', 'error');
    }
  };

  window.confirmDeleteArticle = function (id, title) {
    showConfirmDelete(
      'Delete Article',
      `Are you sure you want to permanently delete "${title}"? This cannot be undone.`,
      async () => {
        try {
          await adminFetch(`/api/admin/articles/${id}`, { method: 'DELETE' });
          showToast('Article deleted successfully', 'success');
          loadArticlesData();
          loadOverviewData();
        } catch (err) {
          showToast(err.message || 'Failed to delete article', 'error');
        }
      }
    );
  };

  async function loadArticlesData() {
    const tbody = document.getElementById('articles-tbody');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2.5rem;">
          <div class="skeleton" style="height: 24px; margin-bottom: 0.5rem;"></div>
          <div class="skeleton" style="height: 24px;"></div>
        </td>
      </tr>
    `;

    try {
      const res = await adminFetch('/api/admin/articles');
      cachedArticles = res.data || [];
      renderArticlesTable(cachedArticles);
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2rem; color: var(--accent-rose);">
            ${escapeHtml(err.message || 'Failed to load articles')}
          </td>
        </tr>
      `;
    }
  }

  function renderArticlesTable(articlesList) {
    const tbody = document.getElementById('articles-tbody');
    if (!tbody) return;

    if (!articlesList || articlesList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
            No articles found. Click <strong>"New Article"</strong> to compose your first post.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = articlesList
      .map((a) => {
        const isPub = Boolean(a.isPublished);
        const statusBadge = isPub
          ? `<span class="status-badge read" style="background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3);">Published</span>`
          : `<span class="status-badge unread" style="background: rgba(161, 161, 170, 0.15); color: var(--text-muted); border: 1px solid rgba(161, 161, 170, 0.3);">Draft</span>`;

        const pubDate = formatDate(a.publishedAt || a.createdAt);

        return `
          <tr>
            <td>
              <div style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem; margin-bottom: 0.2rem;">
                ${escapeHtml(a.title)}
              </div>
              <div style="font-family: var(--font-mono); font-size: 0.76rem; color: var(--text-muted);">
                /blog/${escapeHtml(a.slug)}
              </div>
            </td>
            <td>
              <span class="tech-tag" style="font-size: 0.74rem;">${escapeHtml(a.category || 'Food & Bites')}</span>
            </td>
            <td>
              ${statusBadge}
            </td>
            <td>
              <span style="font-size: 0.82rem; color: var(--text-muted);">${escapeHtml(pubDate)}</span>
            </td>
            <td style="text-align: right;">
              <div style="display: inline-flex; gap: 0.35rem;">
                <a href="/blog/${encodeURIComponent(a.slug)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" title="View live article">
                  Live ↗
                </a>
                <button class="btn btn-secondary btn-sm" onclick="window.toggleArticlePublishStatus(${a.id})" title="${isPub ? 'Unpublish to draft' : 'Publish live'}">
                  ${isPub ? 'Unpublish' : 'Publish'}
                </button>
                <button class="btn btn-secondary btn-sm" onclick="window.openArticleModalForEdit(${a.id})" title="Edit article">
                  Edit
                </button>
                <button class="btn btn-danger btn-sm" onclick="window.confirmDeleteArticle(${a.id}, '${escapeHtml(a.title.replace(/'/g, "\\'"))}')" title="Delete article">
                  Delete
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  // ==========================================================================
  // 404 MUSIC SCENE SETTINGS CONTROLLER
  // ==========================================================================

  function parseYouTubeVideoId(input) {
    if (!input) return '';
    const trimmed = String(input).trim();
    const match = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) {
      return match[1];
    }
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    return trimmed;
  }

  let errorSceneIframeDebounceTimer = null;

  function updateErrorScenePreviewFromForm() {
    const headline = document.getElementById('error-scene-headline')?.value.trim() || 'Wrong Scene?';
    const ytUrl = document.getElementById('error-scene-yt-url')?.value.trim() || '';
    const artist = document.getElementById('error-scene-artist')?.value.trim() || 'eaJ';
    const song = document.getElementById('error-scene-song')?.value.trim() || 'pause';
    const lyric = document.getElementById('error-scene-lyric')?.value.trim() || 'Scene out of a movie, I hope it never ends.';
    const message = document.getElementById('error-scene-message')?.value.trim() || '';
    const hint = document.getElementById('error-scene-hint')?.value.trim() || '';
    const btnText = document.getElementById('error-scene-btn-text')?.value.trim() || 'Play';

    const videoId = parseYouTubeVideoId(ytUrl) || 'N2kz9EOtIPQ';

    const previewTitle = document.getElementById('live-preview-title');
    const previewLyric = document.getElementById('live-preview-lyric');
    const previewMessage = document.getElementById('live-preview-message');
    const previewHint = document.getElementById('live-preview-hint');
    const previewBtnLabel = document.getElementById('live-preview-btn-label');
    const previewBadge = document.getElementById('preview-video-id-badge');
    const previewIframe = document.getElementById('live-preview-iframe');
    const facadeCover = document.getElementById('admin-facade-cover');
    const facadeImg = document.getElementById('admin-facade-img');

    if (previewTitle) previewTitle.textContent = headline;
    if (previewBadge) previewBadge.textContent = `ID: ${videoId}`;
    if (previewLyric) {
      previewLyric.innerHTML = `${escapeHtml(artist)} sings, <em>“${escapeHtml(lyric)}”</em>`;
    }
    if (previewMessage) previewMessage.textContent = message;
    if (previewHint) {
      previewHint.textContent = hint;
      previewHint.style.display = hint ? '' : 'none';
    }
    if (previewBtnLabel) previewBtnLabel.textContent = btnText;

    if (facadeImg) {
      facadeImg.src = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg`;
      facadeImg.alt = `${artist} - ${song}`;
      facadeImg.onerror = function () {
        if (!this.src.includes('hqdefault')) {
          this.src = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
        }
      };
    }

    if (facadeCover && !facadeCover.dataset.bound) {
      facadeCover.dataset.bound = 'true';
      facadeCover.addEventListener('click', () => {
        const currentYt = document.getElementById('error-scene-yt-url')?.value.trim() || '';
        const curArtist = document.getElementById('error-scene-artist')?.value.trim() || 'eaJ';
        const curSong = document.getElementById('error-scene-song')?.value.trim() || 'pause';
        const curId = parseYouTubeVideoId(currentYt) || 'N2kz9EOtIPQ';
        facadeCover.classList.add('playing');
        if (previewIframe) {
          previewIframe.style.display = 'block';
          previewIframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(curId)}?autoplay=1&rel=0`;
          previewIframe.title = `${curArtist} - ${curSong}`;
        }
      });
    }

    if (previewIframe && previewIframe.style.display !== 'none') {
      clearTimeout(errorSceneIframeDebounceTimer);
      errorSceneIframeDebounceTimer = setTimeout(() => {
        const targetSrc = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`;
        if (!previewIframe.src.includes(videoId)) {
          previewIframe.src = targetSrc;
          previewIframe.title = `${artist} - ${song}`;
        }
      }, 350);
    }
  }

  async function loadErrorSceneSettings() {
    try {
      const res = await adminFetch('/api/admin/error-scene');
      if (res && res.status === 'success' && res.data) {
        const scene = res.data;
        const headlineEl = document.getElementById('error-scene-headline');
        const ytUrlEl = document.getElementById('error-scene-yt-url');
        const artistEl = document.getElementById('error-scene-artist');
        const songEl = document.getElementById('error-scene-song');
        const lyricEl = document.getElementById('error-scene-lyric');
        const messageEl = document.getElementById('error-scene-message');
        const hintEl = document.getElementById('error-scene-hint');
        const btnTextEl = document.getElementById('error-scene-btn-text');
        const btnUrlEl = document.getElementById('error-scene-btn-url');
        const isActiveEl = document.getElementById('error-scene-is-active');

        if (headlineEl) headlineEl.value = scene.headline || 'Wrong Scene?';
        if (ytUrlEl) ytUrlEl.value = scene.youtubeUrl || (scene.youtubeVideoId ? `https://www.youtube.com/watch?v=${scene.youtubeVideoId}` : '');
        if (artistEl) artistEl.value = scene.artist || '';
        if (songEl) songEl.value = scene.songTitle || '';
        if (lyricEl) lyricEl.value = scene.lyricQuote || '';
        if (messageEl) messageEl.value = scene.message || '';
        if (hintEl) hintEl.value = scene.actionHint || '';
        if (btnTextEl) btnTextEl.value = scene.buttonText || 'Play';
        if (btnUrlEl) btnUrlEl.value = scene.buttonUrl || '/';
        if (isActiveEl) isActiveEl.checked = scene.isActive !== false;

        updateErrorScenePreviewFromForm();
      }
    } catch (err) {
      console.warn('Failed to load error scene settings:', err);
    }
  }

  function setupErrorSceneSettings() {
    const saveBtn = document.getElementById('btn-save-error-scene');
    const resetBtn = document.getElementById('btn-reset-error-scene');

    const inputs = [
      'error-scene-headline',
      'error-scene-yt-url',
      'error-scene-artist',
      'error-scene-song',
      'error-scene-lyric',
      'error-scene-message',
      'error-scene-hint',
      'error-scene-btn-text',
      'error-scene-btn-url',
    ];

    inputs.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', updateErrorScenePreviewFromForm);
      }
    });

    const activeEl = document.getElementById('error-scene-is-active');
    if (activeEl) {
      activeEl.addEventListener('change', updateErrorScenePreviewFromForm);
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const headlineEl = document.getElementById('error-scene-headline');
        const ytUrlEl = document.getElementById('error-scene-yt-url');
        const artistEl = document.getElementById('error-scene-artist');
        const songEl = document.getElementById('error-scene-song');
        const lyricEl = document.getElementById('error-scene-lyric');
        const messageEl = document.getElementById('error-scene-message');
        const hintEl = document.getElementById('error-scene-hint');
        const btnTextEl = document.getElementById('error-scene-btn-text');
        const btnUrlEl = document.getElementById('error-scene-btn-url');
        const isActiveEl = document.getElementById('error-scene-is-active');

        if (headlineEl) headlineEl.value = 'Wrong Scene?';
        if (ytUrlEl) ytUrlEl.value = 'https://www.youtube.com/watch?v=N2kz9EOtIPQ';
        if (artistEl) artistEl.value = 'eaJ';
        if (songEl) songEl.value = 'pause';
        if (lyricEl) lyricEl.value = 'Scene out of a movie, I hope it never ends.';
        if (messageEl) messageEl.value = 'He wishes that beautiful scene would never end. You, on the other hand, seem to have stumbled into a deleted scene.';
        if (hintEl) hintEl.value = "Don't worry, just hit the button below to 'Play' your journey again from the homepage.";
        if (btnTextEl) btnTextEl.value = 'Play';
        if (btnUrlEl) btnUrlEl.value = '/';
        if (isActiveEl) isActiveEl.checked = true;

        const facadeCover = document.getElementById('admin-facade-cover');
        const previewIframe = document.getElementById('live-preview-iframe');
        if (facadeCover) facadeCover.classList.remove('playing');
        if (previewIframe) {
          previewIframe.style.display = 'none';
          previewIframe.src = '';
        }

        updateErrorScenePreviewFromForm();
        showToast('Reset form to eaJ - pause defaults (Click Save Changes to apply).', 'info');
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const headline = document.getElementById('error-scene-headline')?.value.trim();
        const ytUrl = document.getElementById('error-scene-yt-url')?.value.trim();
        const artist = document.getElementById('error-scene-artist')?.value.trim();
        const song = document.getElementById('error-scene-song')?.value.trim();
        const lyric = document.getElementById('error-scene-lyric')?.value.trim();
        const message = document.getElementById('error-scene-message')?.value.trim();
        const hint = document.getElementById('error-scene-hint')?.value.trim();
        const btnText = document.getElementById('error-scene-btn-text')?.value.trim() || 'Play';
        const btnUrl = document.getElementById('error-scene-btn-url')?.value.trim() || '/';
        const isActive = document.getElementById('error-scene-is-active')?.checked ?? true;

        if (!ytUrl) {
          showToast('Please enter a YouTube Video URL or ID.', 'error');
          document.getElementById('error-scene-yt-url')?.focus();
          return;
        }
        if (!artist) {
          showToast('Please enter the Artist name.', 'error');
          document.getElementById('error-scene-artist')?.focus();
          return;
        }
        if (!song) {
          showToast('Please enter the Song title.', 'error');
          document.getElementById('error-scene-song')?.focus();
          return;
        }
        if (!lyric) {
          showToast('Please enter a lyrical quote.', 'error');
          document.getElementById('error-scene-lyric')?.focus();
          return;
        }
        if (!message) {
          showToast('Please enter the story / narrative message.', 'error');
          document.getElementById('error-scene-message')?.focus();
          return;
        }

        setLoadingState(saveBtn, true, 'Saving Scene...');

        try {
          const payload = {
            headline: headline || 'Wrong Scene?',
            youtubeUrl: ytUrl,
            artist,
            songTitle: song,
            lyricQuote: lyric,
            message,
            actionHint: hint,
            buttonText: btnText,
            buttonUrl: btnUrl,
            isActive: Boolean(isActive),
          };

          const res = await adminFetch('/api/admin/error-scene', {
            method: 'PUT',
            body: JSON.stringify(payload),
          });

          if (res && res.status === 'success') {
            showToast('404 Scene updated successfully! ✨', 'success');
            updateErrorScenePreviewFromForm();
          } else {
            showToast(res?.message || 'Failed to update 404 scene.', 'error');
          }
        } catch (err) {
          showToast(err?.message || 'Error updating 404 scene.', 'error');
        } finally {
          setLoadingState(saveBtn, false, 'Save Changes');
        }
      });
    }
  }

  // Expose utilities if needed for test verification in global scope
  window.__adminDashboard = {
    escapeHtml,
    formatDate,
    getToken,
    getUser,
    setSession,
    clearSession,
    adminFetch,
  };
})();
