/**
 * Pi-Digital Twin: Main Website Interactive Engine (assets/js/main.js)
 * Standalone vanilla JavaScript - Zero dependencies, zero Python runtime requirement
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Toggle
  const mobileToggle = document.querySelector('.nav-mobile-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      const isExpanded = mobileToggle.getAttribute('aria-expanded') === 'true';
      navLinks.classList.toggle('open', !isExpanded);
      mobileToggle.setAttribute('aria-expanded', String(!isExpanded));
    });
    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        mobileToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // 2. Universal Copy to Clipboard for all .btn-copy elements
  document.querySelectorAll('.btn-copy').forEach((button) => {
    button.addEventListener('click', async () => {
      const targetId = button.getAttribute('data-copy-target');
      let textToCopy = '';

      if (targetId) {
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          textToCopy = targetElement.innerText || targetElement.textContent || '';
        }
      } else if (button.getAttribute('data-copy-text')) {
        textToCopy = button.getAttribute('data-copy-text') || '';
      } else {
        const pre = button.closest('.code-box')?.querySelector('pre');
        if (pre) {
          textToCopy = pre.innerText || pre.textContent || '';
        }
      }

      if (textToCopy) {
        try {
          await navigator.clipboard.writeText(textToCopy.trim());
          const originalHtml = button.innerHTML;
          button.classList.add('copied');
          button.innerHTML = '<span>✓ Copied!</span>';
          setTimeout(() => {
            button.classList.remove('copied');
            button.innerHTML = originalHtml;
          }, 2000);
        } catch (err) {
          console.error('Clipboard copy failed:', err);
        }
      }
    });
  });

  // 3. Live Hardware Daemon Probe (Non-blocking background check)
  const statusBadge = document.getElementById('live-hardware-status');
  if (statusBadge) {
    fetch('/api/hardware/status')
      .then((res) => {
        if (!res.ok) throw new Error('Not connected');
        return res.json();
      })
      .then((data) => {
        if (data.connected) {
          statusBadge.innerHTML = `
            <span class="status-dot"></span>
            <span>Raspberry Pi Hardware Daemon: Online (${data.model || 'Pi 4B'})</span>
          `;
        } else {
          statusBadge.innerHTML = `
            <span class="status-dot" style="background:#eab308;"></span>
            <span>Emulator Standby: Ready for Hardware Link</span>
          `;
        }
      })
      .catch(() => {
        // Static host or preview environment
        statusBadge.innerHTML = `
          <span class="status-dot" style="background:#10b981;"></span>
          <span>Emulator Ready for Local Pi Deployment</span>
        `;
      });
  }
});
