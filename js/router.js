// ========================================================
// EduTest Pro — Route-Based Navigation (#/login vs #/admin)
// ========================================================

    // ==================== ROUTE-BASED NAVIGATION (#/admin vs #/login) ====================
    function handleRouteBarSubmit(event) {
      event.preventDefault();
      const rawInput = (document.getElementById('routePathInput').value || '').trim();
      navigateToRoute(rawInput);
    }

    function navigateToRoute(routeStr) {
      if (activeExam && !activeExam.isFinished) {
        showToast("Test davom etayotgan vaqtda boshqa sahifaga o'tib bo'lmaydi!");
        return;
      }
      const cleaned = routeStr.replace(/^#/, '').trim().toLowerCase();
      if (cleaned === '/admin' || cleaned === 'admin') {
        try { window.location.hash = '#/admin'; } catch (e) {}
        switchPortal('admin');
      } else {
        try { window.location.hash = '#/login'; } catch (e) {}
        switchPortal('student');
      }
    }

    function syncRouteFromHash() {
      const hash = (window.location.hash || '').toLowerCase();
      const path = (window.location.pathname || '').toLowerCase();

      if (hash.includes('admin') || path.endsWith('/admin') || path.includes('/admin')) {
        switchPortal('admin');
      } else {
        if (!window.location.hash && (!activeExam || activeExam.isFinished)) {
          try {
            history.replaceState(null, '', '#/login');
          } catch (e) {
            window.location.hash = '#/login';
          }
        }
        switchPortal('student');
      }
    }

    function switchPortal(portal) {
      const studentPortal = document.getElementById('studentPortal');
      const adminPortal = document.getElementById('adminPortal');

      if (portal === 'student') {
        if (studentPortal) studentPortal.classList.remove('hidden');
        if (adminPortal) adminPortal.classList.add('hidden');

        if (window.location.hash !== '#/login' && (!activeExam || activeExam.isFinished)) {
          try {
            history.replaceState(null, '', '#/login');
          } catch (e) {
            window.location.hash = '#/login';
          }
        }

        refreshSubjectDropdowns();
        updateExamPreviewInfo();
      } else {
        if (studentPortal) studentPortal.classList.add('hidden');
        if (adminPortal) adminPortal.classList.remove('hidden');

        if (window.location.hash !== '#/admin') {
          try {
            history.replaceState(null, '', '#/admin');
          } catch (e) {
            window.location.hash = '#/admin';
          }
        }

        const hintEl = document.getElementById('adminAuthHintText');
        if (hintEl) {
          hintEl.textContent = savedAdminPassword
            ? "Avval o'rnatgan Admin parolingizni kiriting."
            : "Birinchi marta kirish: Istalgan yangi parol yozing, u Admin paroli sifatida saqlanadi.";
        }
        refreshAdminAll();
      }
    }


    if (typeof window !== 'undefined') {
      window.handleRouteBarSubmit = handleRouteBarSubmit;
      window.navigateToRoute = navigateToRoute;
      window.syncRouteFromHash = syncRouteFromHash;
      window.switchPortal = switchPortal;
    }
    if (typeof global !== 'undefined') {
      global.handleRouteBarSubmit = handleRouteBarSubmit;
      global.navigateToRoute = navigateToRoute;
      global.syncRouteFromHash = syncRouteFromHash;
      global.switchPortal = switchPortal;
    }


