// ========================================================
// EduTest Pro — LocalStorage Persistence & Global Data State
// ========================================================

var STORAGE_KEY_QUESTIONS = 'edutest_ict_questions_50_v4';
var STORAGE_KEY_SUBMISSIONS = 'edutest_dynamic_submissions_v3';
var STORAGE_KEY_STUDENTS = 'edutest_dynamic_students_v3';
var STORAGE_KEY_SETTINGS = 'edutest_ict_settings_50_v4';
var STORAGE_KEY_ADMIN_PASS = 'edutest_dynamic_admin_pass_v3';

var questionsBank = [];
var submissionsList = [];
var registeredStudents = [];
var examSettings = typeof DEFAULT_SETTINGS !== 'undefined'
  ? { ...DEFAULT_SETTINGS }
  : (typeof window !== 'undefined' && window.DEFAULT_SETTINGS ? { ...window.DEFAULT_SETTINGS } : {
      timeMinutes: 50,
      questionsPerExam: 50,
      shuffleQuestions: true,
      shuffleOptions: true,
      showReviewAtEnd: true,
      strictStudentAuth: false
    });
var savedAdminPassword = '';




    // ==================== SAFE STORAGE HELPERS ====================
    function getFallbackQuestions() {
      if (typeof INITIAL_50_QUESTIONS !== 'undefined') return INITIAL_50_QUESTIONS;
      if (typeof window !== 'undefined' && window.INITIAL_50_QUESTIONS) return window.INITIAL_50_QUESTIONS;
      if (typeof global !== 'undefined' && global.INITIAL_50_QUESTIONS) return global.INITIAL_50_QUESTIONS;
      return [];
    }

    function getFallbackSettings() {
      if (typeof DEFAULT_SETTINGS !== 'undefined') return DEFAULT_SETTINGS;
      if (typeof window !== 'undefined' && window.DEFAULT_SETTINGS) return window.DEFAULT_SETTINGS;
      if (typeof global !== 'undefined' && global.DEFAULT_SETTINGS) return global.DEFAULT_SETTINGS;
      return {
        timeMinutes: 50,
        questionsPerExam: 50,
        shuffleQuestions: true,
        shuffleOptions: true,
        showReviewAtEnd: true,
        strictStudentAuth: false
      };
    }

    function loadStateFromStorage() {
      const fallbackQuestions = getFallbackQuestions();
      const fallbackSettings = getFallbackSettings();
      try {
        const qRaw = localStorage.getItem(STORAGE_KEY_QUESTIONS);
        const parsedQ = qRaw ? JSON.parse(qRaw) : null;
        questionsBank = (parsedQ && parsedQ.length > 0) ? parsedQ : [...fallbackQuestions];

        const sRaw = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
        submissionsList = sRaw ? JSON.parse(sRaw) : [];

        const stRaw = localStorage.getItem(STORAGE_KEY_STUDENTS);
        registeredStudents = stRaw ? JSON.parse(stRaw) : [];

        const cfgRaw = localStorage.getItem(STORAGE_KEY_SETTINGS);
        examSettings = cfgRaw ? { ...fallbackSettings, ...JSON.parse(cfgRaw) } : { ...fallbackSettings };

        savedAdminPassword = localStorage.getItem(STORAGE_KEY_ADMIN_PASS) || '';
      } catch (e) {
        questionsBank = [...fallbackQuestions];
        submissionsList = [];
        registeredStudents = [];
        examSettings = { ...fallbackSettings };
        savedAdminPassword = '';
      }
    }


    function saveStateToStorage() {
      try {
        localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(questionsBank));
        localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissionsList));
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(registeredStudents));
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(examSettings));
        if (savedAdminPassword) {
          localStorage.setItem(STORAGE_KEY_ADMIN_PASS, savedAdminPassword);
        }
      } catch (e) {
        // Ignore storage errors in restricted environments
      }

      // Also sync to Firebase cloud if connected
      if (typeof syncStateToFirebase === 'function') {
        syncStateToFirebase('all');
      }
    }


    if (typeof window !== 'undefined') {
      window.STORAGE_KEY_QUESTIONS = STORAGE_KEY_QUESTIONS;
      window.STORAGE_KEY_SUBMISSIONS = STORAGE_KEY_SUBMISSIONS;
      window.STORAGE_KEY_STUDENTS = STORAGE_KEY_STUDENTS;
      window.STORAGE_KEY_SETTINGS = STORAGE_KEY_SETTINGS;
      window.STORAGE_KEY_ADMIN_PASS = STORAGE_KEY_ADMIN_PASS;
      window.questionsBank = questionsBank;
      window.submissionsList = submissionsList;
      window.registeredStudents = registeredStudents;
      window.examSettings = examSettings;
      window.savedAdminPassword = savedAdminPassword;
      window.loadStateFromStorage = loadStateFromStorage;
      window.saveStateToStorage = saveStateToStorage;
    }
    if (typeof global !== 'undefined') {
      global.questionsBank = questionsBank;
      global.submissionsList = submissionsList;
      global.registeredStudents = registeredStudents;
      global.examSettings = examSettings;
      global.savedAdminPassword = savedAdminPassword;
      global.loadStateFromStorage = loadStateFromStorage;
      global.saveStateToStorage = saveStateToStorage;
    }


