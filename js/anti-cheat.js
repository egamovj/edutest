// ========================================================
// EduTest Pro — Fullscreen & Anti-Cheat Monitoring Engine
// ========================================================

// Anti-Cheat State
var lastViolationTimestamp = 0;
var isWarningModalOpen = false;


    // ==================== FULLSCREEN & NO-SCROLL HELPERS ====================
    function enterFullScreen() {
      const elem = document.documentElement;
      try {
        if (!document.fullscreenElement) {
          if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(() => {});
          } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
          } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
          }
        }
      } catch (e) {
        // Fallback when iframe blocks native fullscreen
      }
      document.body.classList.add('overflow-hidden', 'h-screen');
    }

    function exitFullScreen() {
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (e) {}
      document.body.classList.remove('overflow-hidden', 'h-screen');
    }

    // ==================== ANTI-CHEAT ENGINE (2 WARNINGS, 3RD AUTO-TERMINATES) ====================
    function recordAntiCheatViolation(sourceReason) {
      if (!activeExam || activeExam.isFinished) return;
      const now = Date.now();
      // Ignore duplicate events within 1.2s of exam start or previous event
      if (now - activeExam.startTimeMs < 1500) return;
      if (now - lastViolationTimestamp < 1200) return;
      if (isWarningModalOpen) return;

      lastViolationTimestamp = now;
      activeExam.violations += 1;

      updateViolationUI();

      if (activeExam.violations >= 3) {
        // 3rd time switching screen/window -> Immediately auto-submit & kick out
        isWarningModalOpen = false;
        document.getElementById('antiCheatWarningModal').classList.add('hidden');
        submitStudentExam(`Qoidabuzarlik: 3 marotaba boshqa oynaga o'tildi (${sourceReason})`, true);
      } else {
        // 1st or 2nd time -> Show strict warning modal
        isWarningModalOpen = true;
        const badge = document.getElementById('antiCheatWarningBadge');
        const title = document.getElementById('antiCheatWarningTitle');
        const text = document.getElementById('antiCheatWarningText');

        badge.textContent = `Ogohlantirish: ${activeExam.violations} / 2`;
        if (activeExam.violations === 1) {
          title.textContent = "DIQQAT! 1-marotaba boshqa oynaga o'tdingiz!";
          text.textContent = "Siz test oynasidan chiqdingiz yoki boshqa ekranga o'tdingiz. Yana 1 marta ogohlantirish beriladi. 3-marotaba takrorlansa, testingiz avtomatik kelgan joyida yakunlanib, testdan chiqarib yuborilasiz!";
        } else {
          title.textContent = "OXIRGI OGOHLANTIRISH! (2 / 2)";
          text.textContent = "Siz 2-marotaba test oynasidan chiqdingiz! Bu oxirgi imkoniyat: yana bir marta boshqa ekranga yoki oynaga o'tsangiz, testingiz shu zahoti kelgan joyida yakunlanadi va tizimdan chetlatilasiz!";
        }
        document.getElementById('antiCheatWarningModal').classList.remove('hidden');
      }
    }

    function acknowledgeAntiCheatWarning() {
      isWarningModalOpen = false;
      document.getElementById('antiCheatWarningModal').classList.add('hidden');
      lastViolationTimestamp = Date.now();
      enterFullScreen();
    }

    function updateViolationUI() {
      if (!activeExam) return;
      const badge = document.getElementById('violationStatusBadge');
      const countText = document.getElementById('violationCounterText');
      countText.textContent = `${activeExam.violations} / 2`;

      if (activeExam.violations === 0) {
        badge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold';
      } else if (activeExam.violations === 1) {
        badge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold animate-pulse';
      } else {
        badge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 text-xs font-bold animate-pulse';
      }
    }

    // Listen for tab switching, window blur, and exiting fullscreen
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && activeExam && !activeExam.isFinished) {
        recordAntiCheatViolation("Boshqa tab yoki oynaga o'tish");
      }
    });

    window.addEventListener('blur', () => {
      if (activeExam && !activeExam.isFinished) {
        recordAntiCheatViolation("Test oynasidan fokus yo'qolishi");
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && activeExam && !activeExam.isFinished) {
        recordAntiCheatViolation("Full Screen rejimidan chiqish");
      }
    });


// Anti-Cheat Keyboard & Context Menu Restrictions during active exam
document.addEventListener('contextmenu', (e) => {
  if (activeExam && !activeExam.isFinished) {
    e.preventDefault();
  }
});

document.addEventListener('keydown', (e) => {
  if (activeExam && !activeExam.isFinished) {
    // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+C, Ctrl+V
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
      (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 'c' || e.key === 'C' || e.key === 'v' || e.key === 'V'))
    ) {
      e.preventDefault();
      showToast("Test paytida ushbu tugmalar kombinatsiyasi bloklangan!");
    }
  }
});

if (typeof window !== 'undefined') {
  window.enterFullScreen = enterFullScreen;
  window.exitFullScreen = exitFullScreen;
  window.recordAntiCheatViolation = recordAntiCheatViolation;
  window.acknowledgeAntiCheatWarning = acknowledgeAntiCheatWarning;
  window.updateViolationUI = updateViolationUI;
}
if (typeof global !== 'undefined') {
  global.enterFullScreen = enterFullScreen;
  global.exitFullScreen = exitFullScreen;
  global.recordAntiCheatViolation = recordAntiCheatViolation;
  global.acknowledgeAntiCheatWarning = acknowledgeAntiCheatWarning;
  global.updateViolationUI = updateViolationUI;
}


