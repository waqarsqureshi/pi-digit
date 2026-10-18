/**
 * Pi-Digital Twin: Wiki & Documentation Interactive Engine (assets/js/wiki.js)
 * Standalone vanilla JavaScript - Zero dependencies, zero Python runtime requirement
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Toggle
  const mobileToggle = document.querySelector('.nav-mobile-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  // 2. Table of Contents Active Link Tracking via Intersection Observer
  const tocLinks = document.querySelectorAll('.toc-item a');
  const sections = document.querySelectorAll('.wiki-section');

  if (sections.length && tocLinks.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            tocLinks.forEach((link) => {
              const parent = link.closest('.toc-item');
              if (link.getAttribute('href') === `#${id}`) {
                parent?.classList.add('active');
              } else {
                parent?.classList.remove('active');
              }
            });
          }
        });
      },
      {
        rootMargin: '-80px 0px -70% 0px',
        threshold: 0,
      }
    );

    sections.forEach((sec) => observer.observe(sec));
  }

  // 3. Instant Search Filter for Wiki Sections
  const searchInput = document.getElementById('wiki-search');
  const emptyState = document.getElementById('wiki-search-empty');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = (e.target.value || '').toLowerCase().trim();
      const contentSections = document.querySelectorAll('.wiki-section');
      const tocItems = document.querySelectorAll('.toc-item');
      let visibleSectionCount = 0;

      contentSections.forEach((section) => {
        const text = section.textContent.toLowerCase();
        if (!query || text.includes(query)) {
          section.style.display = 'block';
          visibleSectionCount += 1;
        } else {
          section.style.display = 'none';
        }
      });

      tocItems.forEach((item) => {
        const text = item.textContent.toLowerCase();
        if (!query || text.includes(query)) {
          item.style.display = 'list-item';
        } else {
          item.style.display = 'none';
        }
      });

      if (emptyState) {
        emptyState.hidden = visibleSectionCount !== 0 || !query;
      }
    });
  }

  // 4. Universal Code Copy Button
  document.querySelectorAll('.btn-copy').forEach((button) => {
    button.addEventListener('click', async () => {
      const pre = button.closest('.code-box')?.querySelector('pre');
      if (pre) {
        try {
          await navigator.clipboard.writeText(pre.innerText.trim());
          const orig = button.innerHTML;
          button.classList.add('copied');
          button.innerHTML = '<span>✓ Copied!</span>';
          setTimeout(() => {
            button.classList.remove('copied');
            button.innerHTML = orig;
          }, 2000);
        } catch (err) {
          console.error('Failed to copy to clipboard:', err);
        }
      }
    });
  });
});
