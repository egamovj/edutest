// ========================================================
// EduTest Pro — Admin Portal, Analytics & CRUD Management
// ========================================================

// Chart.js instances
var performanceChartInstance = null;
var gradeChartInstance = null;

    // ==================== ADMIN PORTAL LOGIC ====================
    var isAdminAuthenticated = false;


    function handleAdminLogin(event) {
      event.preventDefault();
      const pass = document.getElementById('adminPassInput').value.trim();
      if (!pass) return;

      if (!savedAdminPassword) {
        savedAdminPassword = pass;
        saveStateToStorage();
        isAdminAuthenticated = true;
      } else if (pass === savedAdminPassword) {
        isAdminAuthenticated = true;
      } else {
        showToast("Admin paroli noto'g'ri!");
        return;
      }

      document.getElementById('adminAuthGate').classList.add('hidden');
      document.getElementById('adminDashboardContent').classList.remove('hidden');
      refreshAdminAll();
      showToast('Admin boshqaruv paneliga kirdingiz!');
    }

    function switchAdminTab(tab) {
      const resultsSec = document.getElementById('adminResultsSection');
      const questionsSec = document.getElementById('adminQuestionsSection');
      const studentsSec = document.getElementById('adminStudentsSection');
      const settingsSec = document.getElementById('adminSettingsSection');

      const btnRes = document.getElementById('adminTabResults');
      const btnQue = document.getElementById('adminTabQuestions');
      const btnStu = document.getElementById('adminTabStudents');
      const btnSet = document.getElementById('adminTabSettings');

      resultsSec.classList.add('hidden');
      questionsSec.classList.add('hidden');
      studentsSec.classList.add('hidden');
      settingsSec.classList.add('hidden');

      const inactiveCls = 'px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition';
      const activeCls = 'px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white transition';

      btnRes.className = inactiveCls;
      btnQue.className = inactiveCls;
      btnStu.className = inactiveCls;
      btnSet.className = inactiveCls;

      if (tab === 'results') {
        resultsSec.classList.remove('hidden');
        btnRes.className = activeCls;
        refreshAdminAll();
      } else if (tab === 'questions') {
        questionsSec.classList.remove('hidden');
        btnQue.className = activeCls;
        renderAdminQuestionsList();
      } else if (tab === 'students') {
        studentsSec.classList.remove('hidden');
        btnStu.className = activeCls;
        renderAdminStudentAccounts();
      } else {
        settingsSec.classList.remove('hidden');
        btnSet.className = activeCls;
        populateSettingsForm();
        if (typeof populateFirebaseConfigForm === 'function') {
          populateFirebaseConfigForm();
        }
      }

    }

    function refreshAdminAll() {
      document.getElementById('adminTotalQuestionsBadge').textContent = questionsBank.length;
      document.getElementById('adminTotalSubmissionsBadge').textContent = submissionsList.length;
      document.getElementById('adminTotalStudentsBadge').textContent = registeredStudents.length;
      refreshSubjectDropdowns();
      if (!isAdminAuthenticated) return;
      renderAdminKPIs();
      renderAdminSubmissionsTable();
      renderAdminCharts();
      renderAdminQuestionsList();
      renderAdminStudentAccounts();
    }

    function renderAdminKPIs() {
      const total = submissionsList.length;
      document.getElementById('kpiTotalStudents').textContent = `${total} nafar`;

      if (total === 0) {
        document.getElementById('kpiAvgScore').textContent = '0%';
        document.getElementById('kpiAvgDuration').textContent = '00:00';
        document.getElementById('kpiTopStudent').textContent = '--';
        document.getElementById('kpiTopScoreSub').textContent = 'Hali test topshirilmagan';
        return;
      }

      const avgPct = Math.round(submissionsList.reduce((acc, s) => acc + s.percentage, 0) / total);
      const avgSec = Math.round(submissionsList.reduce((acc, s) => acc + s.durationSeconds, 0) / total);

      const sortedByScore = [...submissionsList].sort((a, b) => {
        if (b.percentage !== a.percentage) return b.percentage - a.percentage;
        return a.durationSeconds - b.durationSeconds;
      });
      const top = sortedByScore[0];

      document.getElementById('kpiAvgScore').textContent = `${avgPct}%`;
      document.getElementById('kpiAvgDuration').textContent = formatDurationHuman(avgSec);
      document.getElementById('kpiTopStudent').textContent = `${top.studentName} (${top.studentLogin})`;
      document.getElementById('kpiTopScoreSub').textContent = `${top.percentage}% (${top.correctCount}/${top.totalQuestions}) • ${formatDurationHuman(top.durationSeconds)}`;
    }

    function renderAdminSubmissionsTable() {
      const tbody = document.getElementById('adminSubmissionsTableBody');
      const query = (document.getElementById('adminSearchInput').value || '').toLowerCase().trim();
      const sortBy = document.getElementById('adminSortSelect').value;

      let filtered = submissionsList.filter(s =>
        s.studentName.toLowerCase().includes(query) ||
        s.studentLogin.toLowerCase().includes(query) ||
        s.subject.toLowerCase().includes(query)
      );

      if (sortBy === 'score_desc') {
        filtered.sort((a, b) => b.percentage - a.percentage);
      } else if (sortBy === 'duration_asc') {
        filtered.sort((a, b) => a.durationSeconds - b.durationSeconds);
      } else if (sortBy === 'duration_desc') {
        filtered.sort((a, b) => b.durationSeconds - a.durationSeconds);
      }

      tbody.innerHTML = '';

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" class="py-10 text-center text-slate-400 text-sm">
              Hozircha hech qanday o'quvchi test topshirmagan. O'quvchilar test ishlagach natijalar shu yerda dinamik paydo bo'ladi.
            </td>
          </tr>
        `;
        return;
      }

      filtered.forEach((sub, idx) => {
        let badgeCls = 'bg-emerald-100 text-emerald-800';
        if (sub.percentage < 55) badgeCls = 'bg-rose-100 text-rose-800';
        else if (sub.percentage < 75) badgeCls = 'bg-amber-100 text-amber-800';

        const vCount = sub.violations || 0;
        let statusHtml = `<span class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Toza (${vCount}/2)</span>`;
        if (sub.terminatedByAntiCheat) {
          statusHtml = `<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">Chetlatildi (3/3)</span>`;
        } else if (vCount > 0) {
          statusHtml = `<span class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">Ogohlantirildi (${vCount}/2)</span>`;
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/90 transition';
        tr.innerHTML = `
          <td class="py-3.5 px-4 font-mono text-xs text-slate-400">${idx + 1}</td>
          <td class="py-3.5 px-4">
            <div class="font-bold text-slate-900">${escapeHtml(sub.studentName)}</div>
            <div class="text-xs font-mono text-indigo-600">Login: ${escapeHtml(sub.studentLogin)}</div>
          </td>
          <td class="py-3.5 px-4 text-xs font-medium text-slate-600">${escapeHtml(sub.subject)}</td>
          <td class="py-3.5 px-4 font-mono text-xs text-slate-700">${sub.answeredQuestions} / ${sub.totalQuestions} ta</td>
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-900">${sub.correctCount} ta</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-bold ${badgeCls}">${sub.percentage}%</span>
            </div>
          </td>
          <td class="py-3.5 px-4">
            <span class="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              ⏱ ${formatDurationHuman(sub.durationSeconds)}
            </span>
          </td>
          <td class="py-3.5 px-4">${statusHtml}</td>
          <td class="py-3.5 px-4 text-xs text-slate-500">${escapeHtml(sub.submittedAt)}</td>
          <td class="py-3.5 px-4 text-right">
            <div class="inline-flex items-center gap-1.5">
              <button type="button" onclick="openStudentDetailModal('${sub.id}')" class="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition">
                Batafsil
              </button>
              <button type="button" onclick="deleteSubmission('${sub.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition" title="O'chirish">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    function openStudentDetailModal(subId) {
      const sub = submissionsList.find(s => s.id === subId);
      if (!sub) return;
      document.getElementById('modalDetailStudentTitle').textContent = `${sub.studentName} (${sub.studentLogin})`;
      document.getElementById('modalDetailStudentSub').textContent = `Natija: ${sub.correctCount}/${sub.totalQuestions} (${sub.percentage}%) • Vaqt: ${formatDurationHuman(sub.durationSeconds)} • Ogohlantirish: ${sub.violations || 0}/3 • ${sub.terminationReason || ''}`;

      const body = document.getElementById('modalDetailBody');
      body.innerHTML = '';

      if (!sub.details || sub.details.length === 0) {
        body.innerHTML = `<p class="text-sm text-slate-500">Savollar tafsiloti mavjud emas.</p>`;
      } else {
        sub.details.forEach((d, i) => {
          const item = document.createElement('div');
          item.className = `p-3.5 rounded-xl border ${d.isCorrect ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'}`;
          item.innerHTML = `
            <div class="flex items-start justify-between gap-2">
              <span class="text-sm font-semibold text-slate-900">${i + 1}. ${escapeHtml(d.qText)}</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded ${d.isCorrect ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'}">
                ${d.isCorrect ? "To'g'ri" : 'Xato'}
              </span>
            </div>
            <div class="mt-2 text-xs text-slate-700 flex flex-wrap gap-4">
              <span><strong>O'quvchi javobi:</strong> ${escapeHtml(d.chosen)}</span>
              <span><strong>To'g'ri javob:</strong> ${escapeHtml(d.correct)}</span>
            </div>
          `;
          body.appendChild(item);
        });
      }

      document.getElementById('studentDetailModal').classList.remove('hidden');
    }

    function closeStudentDetailModal() {
      document.getElementById('studentDetailModal').classList.add('hidden');
    }

    function deleteSubmission(subId) {
      submissionsList = submissionsList.filter(s => s.id !== subId);
      saveStateToStorage();
      if (typeof removeSubmissionFromFirebase === 'function') {
        removeSubmissionFromFirebase(subId);
      }
      refreshAdminAll();
      showToast("O'quvchi natijasi o'chirildi");
    }


    function renderAdminCharts() {
      const ctxPerf = document.getElementById('adminPerformanceChart');
      const ctxGrade = document.getElementById('adminGradeDistributionChart');
      if (!ctxPerf || !ctxGrade || typeof Chart === 'undefined') return;

      if (performanceChartInstance) performanceChartInstance.destroy();
      if (gradeChartInstance) gradeChartInstance.destroy();

      const recent = submissionsList.slice(0, 10).reverse();
      const labels = recent.map(s => s.studentName.split(' ')[0] + ' (' + s.studentLogin + ')');
      const scores = recent.map(s => s.percentage);
      const durationsMin = recent.map(s => +(s.durationSeconds / 60).toFixed(1));

      performanceChartInstance = new Chart(ctxPerf, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Natija (%)',
              data: scores,
              backgroundColor: '#4f46e5',
              borderRadius: 6,
              yAxisID: 'y'
            },
            {
              label: 'Sarflangan vaqt (daqiqa)',
              data: durationsMin,
              backgroundColor: '#f59e0b',
              borderRadius: 6,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, max: 100, title: { display: true, text: 'Foiz (%)' } },
            y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Daqiqa' } }
          }
        }
      });

      const excellent = submissionsList.filter(s => s.percentage >= 86).length;
      const good = submissionsList.filter(s => s.percentage >= 71 && s.percentage < 86).length;
      const fair = submissionsList.filter(s => s.percentage >= 55 && s.percentage < 71).length;
      const low = submissionsList.filter(s => s.percentage < 55).length;

      gradeChartInstance = new Chart(ctxGrade, {
        type: 'doughnut',
        data: {
          labels: ["A'lo (86-100%)", 'Yaxshi (71-85%)', 'Qoniqarli (55-70%)', 'Past (<55%)'],
          datasets: [{
            data: [excellent, good, fair, low],
            backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#f43f5e'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }

    // ==================== QUESTION BANK CRUD ====================
    function renderAdminQuestionsList() {
      const container = document.getElementById('adminQuestionsListContainer');
      const filterSubj = document.getElementById('adminFilterQuestionSubject').value;
      const list = filterSubj === 'ALL'
        ? questionsBank
        : questionsBank.filter(q => q.subject === filterSubj);

      document.getElementById('adminTotalQuestionsBadge').textContent = questionsBank.length;
      container.innerHTML = '';

      if (list.length === 0) {
        container.innerHTML = `
          <div class="p-8 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-sm">
            Savollar bazasi bo'sh. Chap tomondagi forma orqali yangi savollar qo'shing.
          </div>
        `;
        return;
      }

      list.forEach((q, idx) => {
        const div = document.createElement('div');
        div.className = 'p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white transition';
        const optsHtml = q.options.map((opt, oIdx) => `
          <span class="px-2.5 py-1 rounded-lg text-xs ${
            oIdx === q.correctIndex
              ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
              : 'bg-white text-slate-600 border border-slate-200'
          }">
            ${oIdx === q.correctIndex ? '✓ ' : ''}${escapeHtml(opt)}
          </span>
        `).join('');

        div.innerHTML = `
          <div class="flex items-start justify-between gap-2">
            <div>
              <span class="text-xs font-bold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 mr-2">${escapeHtml(q.subject)}</span>
              <span class="text-sm font-semibold text-slate-900">${idx + 1}. ${escapeHtml(q.text)}</span>
            </div>
            <button type="button" onclick="deleteQuestionFromBank('${q.id}')" class="text-slate-400 hover:text-rose-600 p-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="flex flex-wrap gap-2 mt-3">
            ${optsHtml}
          </div>
        `;
        container.appendChild(div);
      });
    }

    function handleSaveQuestion(event) {
      event.preventDefault();
      const subject = document.getElementById('qSubjectInput').value.trim();
      const text = document.getElementById('qTextInput').value.trim();
      const opt0 = document.getElementById('qOpt0').value.trim();
      const opt1 = document.getElementById('qOpt1').value.trim();
      const opt2 = document.getElementById('qOpt2').value.trim();
      const opt3 = document.getElementById('qOpt3').value.trim();
      const correctRadio = document.querySelector('input[name="correctOptionRadio"]:checked');
      const correctIndex = correctRadio ? parseInt(correctRadio.value, 10) : 0;

      if (!subject || !text || !opt0 || !opt1 || !opt2 || !opt3) {
        showToast("Barcha maydonlarni to'ldiring!");
        return;
      }

      questionsBank.unshift({
        id: 'q_' + Date.now(),
        subject,
        text,
        options: [opt0, opt1, opt2, opt3],
        correctIndex
      });

      saveStateToStorage();
      document.getElementById('qTextInput').value = '';
      document.getElementById('qOpt0').value = '';
      document.getElementById('qOpt1').value = '';
      document.getElementById('qOpt2').value = '';
      document.getElementById('qOpt3').value = '';
      refreshSubjectDropdowns();
      renderAdminQuestionsList();
      updateExamPreviewInfo();
      showToast("Yangi savol bazaga qo'shildi!");
    }

    function deleteQuestionFromBank(qId) {
      questionsBank = questionsBank.filter(q => q.id !== qId);
      saveStateToStorage();
      refreshSubjectDropdowns();
      renderAdminQuestionsList();
      updateExamPreviewInfo();
      showToast("Savol bazadan o'chirildi");
    }

    function clearAllQuestions() {
      questionsBank = [];
      saveStateToStorage();
      refreshSubjectDropdowns();
      renderAdminQuestionsList();
      updateExamPreviewInfo();
      showToast("Savollar bazasi tozalandi");
    }

    // ==================== REGISTERED STUDENT ACCOUNTS CRUD ====================
    function handleSaveStudentAccount(event) {
      event.preventDefault();
      const name = document.getElementById('regStudentName').value.trim();
      const login = document.getElementById('regStudentLogin').value.trim();
      const password = document.getElementById('regStudentPassword').value.trim();

      if (!name || !login || !password) return;

      const exists = registeredStudents.some(s => s.login.toLowerCase() === login.toLowerCase());
      if (exists) {
        showToast("Ushbu login allaqachon mavjud!");
        return;
      }

      registeredStudents.unshift({
        id: 'stu_' + Date.now(),
        name,
        login,
        password
      });

      saveStateToStorage();
      document.getElementById('addStudentAccountForm').reset();
      renderAdminStudentAccounts();
      showToast("O'quvchi login va paroli saqlandi!");
    }

    function renderAdminStudentAccounts() {
      const container = document.getElementById('adminStudentAccountsContainer');
      document.getElementById('adminTotalStudentsBadge').textContent = registeredStudents.length;
      if (!container) return;
      container.innerHTML = '';

      if (registeredStudents.length === 0) {
        container.innerHTML = `
          <div class="p-8 rounded-xl border border-dashed border-slate-300 text-center text-slate-400 text-sm">
            Hozircha alohida o'quvchi loginlari kiritilmagan. Chapdagi forma orqali o'quvchilarga login va parol yaratishingiz mumkin.
          </div>
        `;
        return;
      }

      registeredStudents.forEach((stu, i) => {
        const row = document.createElement('div');
        row.className = 'p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3';
        row.innerHTML = `
          <div>
            <div class="font-bold text-sm text-slate-900">${i + 1}. ${escapeHtml(stu.name)}</div>
            <div class="text-xs font-mono text-slate-600 mt-0.5">
              Login: <strong class="text-indigo-600">${escapeHtml(stu.login)}</strong> • Parol: <strong class="text-emerald-700">${escapeHtml(stu.password)}</strong>
            </div>
          </div>
          <button type="button" onclick="deleteStudentAccount('${stu.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        `;
        container.appendChild(row);
      });
    }

    function deleteStudentAccount(id) {
      registeredStudents = registeredStudents.filter(s => s.id !== id);
      saveStateToStorage();
      renderAdminStudentAccounts();
      showToast("O'quvchi akkaunti o'chirildi");
    }

    // ==================== SETTINGS & EXPORT ====================
    function populateSettingsForm() {
      document.getElementById('settingTimeMinutes').value = examSettings.timeMinutes;
      document.getElementById('settingQuestionsPerExam').value = examSettings.questionsPerExam;
      document.getElementById('settingShuffleQuestions').checked = examSettings.shuffleQuestions;
      document.getElementById('settingShuffleOptions').checked = examSettings.shuffleOptions;
      document.getElementById('settingShowReviewAtEnd').checked = examSettings.showReviewAtEnd;
      document.getElementById('settingStrictStudentAuth').checked = Boolean(examSettings.strictStudentAuth);
    }

    function saveExamSettings() {
      const timeMin = parseInt(document.getElementById('settingTimeMinutes').value, 10) || 15;
      const qCount = parseInt(document.getElementById('settingQuestionsPerExam').value, 10) || 10;
      examSettings.timeMinutes = Math.max(1, Math.min(180, timeMin));
      examSettings.questionsPerExam = Math.max(1, Math.min(100, qCount));
      examSettings.shuffleQuestions = document.getElementById('settingShuffleQuestions').checked;
      examSettings.shuffleOptions = document.getElementById('settingShuffleOptions').checked;
      examSettings.showReviewAtEnd = document.getElementById('settingShowReviewAtEnd').checked;
      examSettings.strictStudentAuth = document.getElementById('settingStrictStudentAuth').checked;

      saveStateToStorage();
      updateExamPreviewInfo();
      showToast('Sozlamalar saqlandi!');
    }

    function resetDemoData() {
      const fallbackQuestions = typeof getFallbackQuestions === 'function' ? getFallbackQuestions() : (typeof INITIAL_50_QUESTIONS !== 'undefined' ? INITIAL_50_QUESTIONS : []);
      const fallbackSettings = typeof getFallbackSettings === 'function' ? getFallbackSettings() : (typeof DEFAULT_SETTINGS !== 'undefined' ? DEFAULT_SETTINGS : {});
      questionsBank = [...fallbackQuestions];
      submissionsList = [];
      registeredStudents = [];
      examSettings = { ...fallbackSettings };
      saveStateToStorage();
      if (typeof clearAllSubmissionsInFirebase === 'function') {
        clearAllSubmissionsInFirebase();
      }
      populateSettingsForm();
      refreshAdminAll();
      showToast("Barcha ma'lumotlar tozalandi!");
    }



    function exportResultsCSV() {
      if (submissionsList.length === 0) {
        showToast("Eksport qilish uchun hali natijalar yo'q!");
        return;
      }
      const headers = ['Oquvchi Ismi', 'Login', 'Yonalish', 'Jami savollar', 'Ishlangan savollar', 'Togri javoblar', 'Foiz (%)', 'Sarflangan vaqt (soniya)', 'Sarflangan vaqt', 'Ogohlantirishlar', 'Holati', 'Sana'];
      const rows = submissionsList.map(s => [
        `"${s.studentName.replace(/"/g, '""')}"`,
        `"${s.studentLogin.replace(/"/g, '""')}"`,
        `"${s.subject.replace(/"/g, '""')}"`,
        s.totalQuestions,
        s.answeredQuestions,
        s.correctCount,
        s.percentage,
        s.durationSeconds,
        `"${formatDurationHuman(s.durationSeconds)}"`,
        s.violations || 0,
        `"${(s.terminationReason || 'Yakunlandi').replace(/"/g, '""')}"`,
        `"${s.submittedAt}"`
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'oquvchilar_test_natijalari.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Natijalar CSV jadval ko'rinishida yuklab olindi!");
    }

    if (typeof window !== 'undefined') {
      window.isAdminAuthenticated = isAdminAuthenticated;
      window.performanceChartInstance = performanceChartInstance;
      window.gradeChartInstance = gradeChartInstance;
      window.handleAdminLogin = handleAdminLogin;
      window.switchAdminTab = switchAdminTab;
      window.refreshAdminAll = refreshAdminAll;
      window.renderAdminKPIs = renderAdminKPIs;
      window.renderAdminSubmissionsTable = renderAdminSubmissionsTable;
      window.openStudentDetailModal = openStudentDetailModal;
      window.closeStudentDetailModal = closeStudentDetailModal;
      window.deleteSubmission = deleteSubmission;
      window.renderAdminCharts = renderAdminCharts;
      window.renderAdminQuestionsList = renderAdminQuestionsList;
      window.handleSaveQuestion = handleSaveQuestion;
      window.deleteQuestionFromBank = deleteQuestionFromBank;
      window.clearAllQuestions = clearAllQuestions;
      window.handleSaveStudentAccount = handleSaveStudentAccount;
      window.renderAdminStudentAccounts = renderAdminStudentAccounts;
      window.deleteStudentAccount = deleteStudentAccount;
      window.populateSettingsForm = populateSettingsForm;
      window.saveExamSettings = saveExamSettings;
      window.resetDemoData = resetDemoData;
      window.exportResultsCSV = exportResultsCSV;
    }
    if (typeof global !== 'undefined') {
      global.isAdminAuthenticated = isAdminAuthenticated;
      global.performanceChartInstance = performanceChartInstance;
      global.gradeChartInstance = gradeChartInstance;
      global.handleAdminLogin = handleAdminLogin;
      global.switchAdminTab = switchAdminTab;
      global.refreshAdminAll = refreshAdminAll;
      global.renderAdminKPIs = renderAdminKPIs;
      global.renderAdminSubmissionsTable = renderAdminSubmissionsTable;
      global.openStudentDetailModal = openStudentDetailModal;
      global.closeStudentDetailModal = closeStudentDetailModal;
      global.deleteSubmission = deleteSubmission;
      global.renderAdminCharts = renderAdminCharts;
      global.renderAdminQuestionsList = renderAdminQuestionsList;
      global.handleSaveQuestion = handleSaveQuestion;
      global.deleteQuestionFromBank = deleteQuestionFromBank;
      global.clearAllQuestions = clearAllQuestions;
      global.handleSaveStudentAccount = handleSaveStudentAccount;
      global.renderAdminStudentAccounts = renderAdminStudentAccounts;
      global.deleteStudentAccount = deleteStudentAccount;
      global.populateSettingsForm = populateSettingsForm;
      global.saveExamSettings = saveExamSettings;
      global.resetDemoData = resetDemoData;
      global.exportResultsCSV = exportResultsCSV;
    }


