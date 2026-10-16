// ========================================================
// EduTest Pro — Student Exam Engine & Results Rendering
// ========================================================

// Active Student Exam Session State
var activeExam = null;
var examTimerInterval = null;


    // ==================== DYNAMIC SUBJECTS & LOGIN PREVIEW ====================
    function getUniqueSubjects() {
      const set = new Set();
      questionsBank.forEach(q => {
        if (q.subject && q.subject.trim()) set.add(q.subject.trim());
      });
      return Array.from(set);
    }

    function refreshSubjectDropdowns() {
      const subjects = getUniqueSubjects();
      const studentSelect = document.getElementById('studentSubjectSelect');
      const adminFilterSelect = document.getElementById('adminFilterQuestionSubject');

      const prevStudentVal = studentSelect ? studentSelect.value : 'ALL';
      const prevAdminVal = adminFilterSelect ? adminFilterSelect.value : 'ALL';

      if (studentSelect) {
        studentSelect.innerHTML = `<option value="ALL">Barcha fanlar (${questionsBank.length} ta savol)</option>` +
          subjects.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
        if (subjects.includes(prevStudentVal)) studentSelect.value = prevStudentVal;
      }

      if (adminFilterSelect) {
        adminFilterSelect.innerHTML = `<option value="ALL">Barcha fanlar (${questionsBank.length})</option>` +
          subjects.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
        if (subjects.includes(prevAdminVal)) adminFilterSelect.value = prevAdminVal;
      }
    }

    function autoFillRegisteredStudentName() {
      const loginVal = (document.getElementById('studentLoginInput').value || '').trim().toLowerCase();
      if (!loginVal) return;
      const found = registeredStudents.find(s => s.login.toLowerCase() === loginVal);
      if (found) {
        document.getElementById('studentNameInput').value = found.name;
      }
    }

    function updateExamPreviewInfo() {
      const subj = document.getElementById('studentSubjectSelect').value;
      const pool = subj === 'ALL'
        ? questionsBank
        : questionsBank.filter(q => q.subject === subj);
      const count = Math.min(pool.length, examSettings.questionsPerExam);
      document.getElementById('previewQuestionCount').textContent = `${count} ta`;
      document.getElementById('previewTimeLimit').textContent = `${examSettings.timeMinutes} daqiqa`;

      const emptyAlert = document.getElementById('emptyBankAlertBox');
      if (questionsBank.length === 0) {
        emptyAlert.classList.remove('hidden');
      } else {
        emptyAlert.classList.add('hidden');
      }
    }

    // ==================== START STUDENT EXAM ====================
    function startStudentExam(event) {
      event.preventDefault();
      const name = document.getElementById('studentNameInput').value.trim();
      const login = document.getElementById('studentLoginInput').value.trim();
      const password = document.getElementById('studentPasswordInput').value.trim();
      const subjectSelect = document.getElementById('studentSubjectSelect').value;

      if (!name || !login || !password) {
        showToast("Iltimos, ism-familiya, login va parolni to'liq kiriting!");
        return;
      }

      // Check student credentials against registered accounts if any match or if strict mode is active
      const matchedAccount = registeredStudents.find(s => s.login.toLowerCase() === login.toLowerCase());
      if (matchedAccount) {
        if (matchedAccount.password !== password) {
          showToast("Xato! Ushbu login uchun parol noto'g'ri kiritildi.");
          return;
        }
      } else if (examSettings.strictStudentAuth) {
        showToast("Ushbu login Admin ro'yxatida topilmadi! O'qituvchiga murojaat qiling.");
        return;
      }

      let candidateQuestions = subjectSelect === 'ALL'
        ? [...questionsBank]
        : questionsBank.filter(q => q.subject === subjectSelect);

      if (candidateQuestions.length === 0) {
        showToast("Savollar bazasi bo'sh! Avval /admin orqali savol qo'shing.");
        return;
      }

      // 1. Shuffle questions order per student
      if (examSettings.shuffleQuestions) {
        candidateQuestions = shuffleArray(candidateQuestions);
      }

      // Slice up to configured questionsPerExam
      const selectedQuestions = candidateQuestions.slice(0, examSettings.questionsPerExam).map((q) => {
        // 2. Shuffle options order per question
        const indexedOptions = q.options.map((optText, idx) => ({
          text: optText,
          isCorrect: idx === q.correctIndex
        }));
        const finalOptions = examSettings.shuffleOptions ? shuffleArray(indexedOptions) : indexedOptions;
        return {
          id: q.id,
          subject: q.subject,
          text: q.text,
          options: finalOptions,
          selectedOptionIndex: null
        };
      });

      const totalAllowedSeconds = examSettings.timeMinutes * 60;

      activeExam = {
        studentName: matchedAccount ? matchedAccount.name : name,
        studentLogin: login,
        subjectLabel: subjectSelect === 'ALL' ? 'Umumiy (Aralash)' : subjectSelect,
        questions: selectedQuestions,
        currentIndex: 0,
        startTimeMs: Date.now(),
        remainingSeconds: totalAllowedSeconds,
        totalAllowedSeconds: totalAllowedSeconds,
        violations: 0,
        isFinished: false
      };

      lastViolationTimestamp = Date.now();
      isWarningModalOpen = false;

      // Update UI Header
      const initials = activeExam.studentName.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || 'ST';
      document.getElementById('activeStudentInitials').textContent = initials;
      document.getElementById('activeStudentName').textContent = activeExam.studentName;
      document.getElementById('activeStudentLogin').textContent = activeExam.studentLogin;
      document.getElementById('activeExamSubjectLabel').textContent = `${activeExam.subjectLabel} • Random tartib`;

      // Hide top header & lock screen without scroll
      document.getElementById('mainAppHeader').classList.add('hidden');
      document.getElementById('studentLoginView').classList.add('hidden');
      document.getElementById('studentResultView').classList.add('hidden');
      document.getElementById('studentExamView').classList.remove('hidden');

      updateViolationUI();
      renderActiveQuestion();
      startExamCountdown();
      enterFullScreen();
    }

    function startExamCountdown() {
      if (examTimerInterval) {
        clearInterval(examTimerInterval);
      }
      updateTimerUI();
      examTimerInterval = setInterval(() => {
        if (!activeExam || activeExam.isFinished) {
          clearInterval(examTimerInterval);
          return;
        }
        activeExam.remainingSeconds -= 1;
        updateTimerUI();
        if (activeExam.remainingSeconds <= 0) {
          clearInterval(examTimerInterval);
          submitStudentExam("Belgilangan vaqt tugadi", false);
        }
      }, 1000);
    }

    function updateTimerUI() {
      if (!activeExam) return;
      const disp = document.getElementById('examTimerDisplay');
      const badge = document.getElementById('timerBadge');
      disp.textContent = formatSecondsToMMSS(activeExam.remainingSeconds);

      if (activeExam.remainingSeconds <= 60) {
        badge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 text-white font-mono text-xs sm:text-sm font-semibold animate-pulse';
      } else {
        badge.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-mono text-xs sm:text-sm font-semibold';
      }
    }

    function renderActiveQuestion() {
      if (!activeExam) return;
      const qIndex = activeExam.currentIndex;
      const currentQ = activeExam.questions[qIndex];
      const totalQ = activeExam.questions.length;
      const answeredCount = activeExam.questions.filter(q => q.selectedOptionIndex !== null).length;

      document.getElementById('answeredCountText').textContent = answeredCount;
      document.getElementById('totalCountText').textContent = totalQ;
      document.getElementById('currentQuestionNumberBadge').textContent = `${qIndex + 1}-savol / ${totalQ}`;
      document.getElementById('currentQuestionSubjectBadge').textContent = currentQ.subject;
      document.getElementById('currentQuestionText').textContent = currentQ.text;

      // Render Options — Strictly BLIND mode (never shows right/wrong during test)
      const letters = ['A', 'B', 'C', 'D'];
      const optionsContainer = document.getElementById('optionsContainer');
      optionsContainer.innerHTML = '';

      currentQ.options.forEach((opt, idx) => {
        const isSelected = currentQ.selectedOptionIndex === idx;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.onclick = () => selectOptionForCurrentQuestion(idx);
        btn.className = isSelected
          ? 'option-card w-full text-left p-3 sm:p-3.5 rounded-xl border-2 border-indigo-600 bg-indigo-50/90 flex items-center gap-3 shadow-2xs'
          : 'option-card w-full text-left p-3 sm:p-3.5 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-slate-50 flex items-center gap-3';

        btn.innerHTML = `
          <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 ${
            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
          }">${letters[idx] || idx + 1}</span>
          <span class="text-xs sm:text-sm md:text-base font-medium ${isSelected ? 'text-indigo-950 font-semibold' : 'text-slate-800'} flex-1 line-clamp-2">${escapeHtml(opt.text)}</span>
          ${
            isSelected
              ? '<span class="text-[11px] font-semibold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-200 shrink-0">Belgilandi</span>'
              : ''
          }
        `;
        optionsContainer.appendChild(btn);
      });

      document.getElementById('prevQuestionBtn').disabled = qIndex === 0;
      const nextBtn = document.getElementById('nextQuestionBtn');
      if (qIndex === totalQ - 1) {
        nextBtn.innerHTML = `<span>Yakunlash</span>`;
        nextBtn.onclick = () => openFinishConfirmModal();
      } else {
        nextBtn.innerHTML = `<span>Keyingi savol</span><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>`;
        nextBtn.onclick = () => navigateQuestion(1);
      }

      renderQuestionPalette();
    }

    function selectOptionForCurrentQuestion(optionIdx) {
      if (!activeExam || activeExam.isFinished) return;
      activeExam.questions[activeExam.currentIndex].selectedOptionIndex = optionIdx;
      renderActiveQuestion();
    }

    function clearCurrentAnswer() {
      if (!activeExam || activeExam.isFinished) return;
      activeExam.questions[activeExam.currentIndex].selectedOptionIndex = null;
      renderActiveQuestion();
    }

    function navigateQuestion(delta) {
      if (!activeExam) return;
      const nextIdx = activeExam.currentIndex + delta;
      if (nextIdx >= 0 && nextIdx < activeExam.questions.length) {
        activeExam.currentIndex = nextIdx;
        renderActiveQuestion();
      }
    }

    function jumpToQuestion(index) {
      if (!activeExam) return;
      activeExam.currentIndex = index;
      renderActiveQuestion();
    }

    function renderQuestionPalette() {
      const grid = document.getElementById('questionPaletteGrid');
      grid.innerHTML = '';
      activeExam.questions.forEach((q, idx) => {
        const isCurrent = idx === activeExam.currentIndex;
        const isAnswered = q.selectedOptionIndex !== null;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.onclick = () => jumpToQuestion(idx);

        let cls = 'h-7 rounded-lg font-mono text-[11px] font-bold transition flex items-center justify-center ';
        if (isCurrent && isAnswered) {
          cls += 'bg-indigo-700 text-white ring-2 ring-offset-1 ring-indigo-600';
        } else if (isCurrent) {
          cls += 'bg-indigo-50 text-indigo-700 border-2 border-indigo-600';
        } else if (isAnswered) {
          cls += 'bg-indigo-600 text-white hover:bg-indigo-700';
        } else {
          cls += 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200';
        }
        btn.className = cls;
        btn.textContent = idx + 1;
        grid.appendChild(btn);
      });
    }

    function openFinishConfirmModal() {
      if (!activeExam) return;
      const total = activeExam.questions.length;
      const answered = activeExam.questions.filter(q => q.selectedOptionIndex !== null).length;
      const unanswered = total - answered;
      const msgEl = document.getElementById('finishModalSummaryText');
      if (unanswered > 0) {
        msgEl.textContent = `Diqqat! Siz ${total} ta savoldan ${answered} tasini belgiladingiz (${unanswered} ta savol bo'sh qoldi). Testni hozir yakunlashni xohlaysizmi?`;
      } else {
        msgEl.textContent = `Siz barcha ${total} ta savolga javob belgiladingiz. Testni yakunlab, natijani ko'rishni tasdiqlaysizmi?`;
      }
      document.getElementById('finishConfirmModal').classList.remove('hidden');
    }

    function closeFinishConfirmModal() {
      document.getElementById('finishConfirmModal').classList.add('hidden');
    }

    // ==================== SUBMIT EXAM (NORMAL OR FORCED BY ANTI-CHEAT) ====================
    function submitStudentExam(reason, terminatedByAntiCheat) {
      closeFinishConfirmModal();
      document.getElementById('antiCheatWarningModal').classList.add('hidden');
      isWarningModalOpen = false;

      if (!activeExam || activeExam.isFinished) return;
      activeExam.isFinished = true;
      if (examTimerInterval) {
        clearInterval(examTimerInterval);
      }

      exitFullScreen();
      document.getElementById('mainAppHeader').classList.remove('hidden');

      const elapsedSeconds = Math.max(1, Math.round((Date.now() - activeExam.startTimeMs) / 1000));
      const totalQuestions = activeExam.questions.length;
      let answeredQuestions = 0;
      let correctCount = 0;

      const detailedRecords = activeExam.questions.map((q) => {
        const chosenOpt = q.selectedOptionIndex !== null ? q.options[q.selectedOptionIndex] : null;
        const correctOpt = q.options.find(o => o.isCorrect);
        if (chosenOpt) answeredQuestions += 1;
        const isCorrect = Boolean(chosenOpt && chosenOpt.isCorrect);
        if (isCorrect) correctCount += 1;
        return {
          qText: q.text,
          subject: q.subject,
          chosen: chosenOpt ? chosenOpt.text : 'Belgilanmagan',
          correct: correctOpt ? correctOpt.text : '',
          isCorrect: isCorrect
        };
      });

      const percentage = Math.round((correctCount / totalQuestions) * 100);
      const nowStr = new Date().toLocaleString('uz-UZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const submissionRecord = {
        id: 'sub_' + Date.now(),
        studentName: activeExam.studentName,
        studentLogin: activeExam.studentLogin,
        subject: activeExam.subjectLabel,
        totalQuestions,
        answeredQuestions,
        correctCount,
        percentage,
        durationSeconds: elapsedSeconds,
        violations: activeExam.violations,
        terminatedByAntiCheat: Boolean(terminatedByAntiCheat),
        terminationReason: reason || 'Yakunlandi',
        submittedAt: nowStr,
        details: detailedRecords
      };

      submissionsList.unshift(submissionRecord);
      saveStateToStorage();

      // Push to Firebase cloud for instant cross-device live update
      if (typeof pushSubmissionToFirebase === 'function') {
        pushSubmissionToFirebase(submissionRecord);
      }


      renderStudentResultScreen(submissionRecord);
      if (terminatedByAntiCheat) {
        showToast("3 marta boshqa oynaga o'tganingiz uchun test avtomatik yakunlandi!");
      } else {
        showToast("Test muvaffaqiyatli yakunlandi!");
      }
    }

    function renderStudentResultScreen(sub) {
      document.getElementById('studentExamView').classList.add('hidden');
      document.getElementById('studentResultView').classList.remove('hidden');

      const pill = document.getElementById('resultStatusPill');
      const reasonEl = document.getElementById('resultTerminationReasonText');

      if (sub.terminatedByAntiCheat) {
        pill.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-400/30 mb-2';
        pill.textContent = "Chetlatildi (3/3 Qoidabuzarlik)";
        reasonEl.textContent = `Sabab: ${sub.terminationReason}. Kelgan joyigacha belgilangan javoblar hisoblandi.`;
      } else {
        pill.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-2';
        pill.textContent = "Test muvaffaqiyatli yakunlandi";
        reasonEl.textContent = '';
      }

      document.getElementById('resultStudentName').textContent = sub.studentName;
      document.getElementById('resultStudentLogin').textContent = sub.studentLogin;
      document.getElementById('resultTimestamp').textContent = sub.submittedAt;
      document.getElementById('resultPercentageBadge').textContent = `${sub.percentage}%`;

      let gradeText = 'Qoniqarli';
      if (sub.percentage >= 86) gradeText = "A'lo (5 baho)";
      else if (sub.percentage >= 71) gradeText = 'Yaxshi (4 baho)';
      else if (sub.percentage >= 55) gradeText = 'Qoniqarli (3 baho)';
      else gradeText = 'Qoniqarsiz';
      document.getElementById('resultGradeLabel').textContent = gradeText;

      document.getElementById('resultCorrectCount').textContent = `${sub.correctCount} / ${sub.totalQuestions}`;
      document.getElementById('resultWrongCount').textContent = `${sub.totalQuestions - sub.correctCount} ta`;
      document.getElementById('resultDurationText').textContent = formatDurationHuman(sub.durationSeconds);
      document.getElementById('resultAvgTimeText').textContent = `${sub.violations || 0} / 3`;

      const reviewContainer = document.getElementById('resultReviewList');
      reviewContainer.innerHTML = '';

      if (!examSettings.showReviewAtEnd) {
        reviewContainer.innerHTML = `
          <div class="p-4 rounded-xl bg-slate-100 text-slate-600 text-sm">
            Administrator sozlamalariga ko'ra savollarning to'g'ri javoblari tahlili yashirilgan. Umumiy natijangiz yuqorida ko'rsatilgan.
          </div>
        `;
        return;
      }

      sub.details.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = `p-4 rounded-xl border ${
          item.isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
        }`;
        card.innerHTML = `
          <div class="flex items-start justify-between gap-3">
            <div class="text-sm font-semibold text-slate-900">
              <span class="font-mono text-xs px-2 py-0.5 rounded bg-white border border-slate-200 mr-1.5">#${idx + 1}</span>
              ${escapeHtml(item.qText)}
            </div>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${
              item.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }">
              ${item.isCorrect ? "To'g'ri" : 'Xato'}
            </span>
          </div>
          <div class="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div class="p-2 rounded-lg bg-white border border-slate-200/80">
              <span class="text-slate-500">Belgilangan javob:</span>
              <span class="font-semibold ml-1 ${item.isCorrect ? 'text-emerald-700' : 'text-rose-700'}">${escapeHtml(item.chosen)}</span>
            </div>
            <div class="p-2 rounded-lg bg-white border border-slate-200/80">
              <span class="text-slate-500">To'g'ri javob:</span>
              <span class="font-semibold text-emerald-700 ml-1">${escapeHtml(item.correct)}</span>
            </div>
          </div>
        `;
        reviewContainer.appendChild(card);
      });
    }

    function resetToStudentLogin() {
      activeExam = null;
      exitFullScreen();
      document.getElementById('mainAppHeader').classList.remove('hidden');
      document.getElementById('studentNameInput').value = '';
      document.getElementById('studentLoginInput').value = '';
      document.getElementById('studentPasswordInput').value = '';
      document.getElementById('studentResultView').classList.add('hidden');
      document.getElementById('studentExamView').classList.add('hidden');
      document.getElementById('studentLoginView').classList.remove('hidden');
      updateExamPreviewInfo();
    }

    if (typeof window !== 'undefined') {
      window.activeExam = activeExam;
      window.examTimerInterval = examTimerInterval;
      window.getUniqueSubjects = getUniqueSubjects;
      window.refreshSubjectDropdowns = refreshSubjectDropdowns;
      window.autoFillRegisteredStudentName = autoFillRegisteredStudentName;
      window.updateExamPreviewInfo = updateExamPreviewInfo;
      window.startStudentExam = startStudentExam;
      window.startExamCountdown = startExamCountdown;
      window.updateTimerUI = updateTimerUI;
      window.renderActiveQuestion = renderActiveQuestion;
      window.selectOptionForCurrentQuestion = selectOptionForCurrentQuestion;
      window.clearCurrentAnswer = clearCurrentAnswer;
      window.navigateQuestion = navigateQuestion;
      window.jumpToQuestion = jumpToQuestion;
      window.renderQuestionPalette = renderQuestionPalette;
      window.openFinishConfirmModal = openFinishConfirmModal;
      window.closeFinishConfirmModal = closeFinishConfirmModal;
      window.submitStudentExam = submitStudentExam;
      window.renderStudentResultScreen = renderStudentResultScreen;
      window.resetToStudentLogin = resetToStudentLogin;
    }
    if (typeof global !== 'undefined') {
      global.activeExam = activeExam;
      global.examTimerInterval = examTimerInterval;
      global.getUniqueSubjects = getUniqueSubjects;
      global.refreshSubjectDropdowns = refreshSubjectDropdowns;
      global.autoFillRegisteredStudentName = autoFillRegisteredStudentName;
      global.updateExamPreviewInfo = updateExamPreviewInfo;
      global.startStudentExam = startStudentExam;
      global.startExamCountdown = startExamCountdown;
      global.updateTimerUI = updateTimerUI;
      global.renderActiveQuestion = renderActiveQuestion;
      global.selectOptionForCurrentQuestion = selectOptionForCurrentQuestion;
      global.clearCurrentAnswer = clearCurrentAnswer;
      global.navigateQuestion = navigateQuestion;
      global.jumpToQuestion = jumpToQuestion;
      global.renderQuestionPalette = renderQuestionPalette;
      global.openFinishConfirmModal = openFinishConfirmModal;
      global.closeFinishConfirmModal = closeFinishConfirmModal;
      global.submitStudentExam = submitStudentExam;
      global.renderStudentResultScreen = renderStudentResultScreen;
      global.resetToStudentLogin = resetToStudentLogin;
    }


