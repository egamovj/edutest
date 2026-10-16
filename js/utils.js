// ========================================================
// EduTest Pro — Helper & Utility Functions
// ========================================================

    // ==================== FISHER-YATES SHUFFLE ====================
    function shuffleArray(arr) {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = copy[i];
        copy[i] = copy[j];
        copy[j] = temp;
      }
      return copy;
    }

    function formatSecondsToMMSS(totalSec) {
      const sec = Math.max(0, Math.floor(totalSec));
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    function formatDurationHuman(totalSec) {
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      if (m === 0) return `${s} soniya`;
      return `${m} daq ${s} soniya`;
    }

    function showToast(msg) {
      const container = document.getElementById('toastContainer');
      const text = document.getElementById('toastMessage');
      text.textContent = msg;
      container.classList.remove('hidden');
      setTimeout(() => {
        container.classList.add('hidden');
      }, 3400);
    }


    function escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    if (typeof window !== 'undefined') {
      window.shuffleArray = shuffleArray;
      window.formatSecondsToMMSS = formatSecondsToMMSS;
      window.formatDurationHuman = formatDurationHuman;
      window.showToast = showToast;
      window.escapeHtml = escapeHtml;
    }
    if (typeof global !== 'undefined') {
      global.shuffleArray = shuffleArray;
      global.formatSecondsToMMSS = formatSecondsToMMSS;
      global.formatDurationHuman = formatDurationHuman;
      global.showToast = showToast;
      global.escapeHtml = escapeHtml;
    }


