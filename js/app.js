// ========================================================
// EduTest Pro — Application Bootstrap & Initialization
// ========================================================

window.addEventListener('hashchange', syncRouteFromHash);

window.addEventListener('DOMContentLoaded', () => {
  loadStateFromStorage();
  refreshSubjectDropdowns();
  updateExamPreviewInfo();
  syncRouteFromHash();
  if (typeof initFirebaseApp === 'function') {
    initFirebaseApp();
  }
});

