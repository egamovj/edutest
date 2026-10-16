// ========================================================
// EduTest Pro — Firebase Cloud Database Sync Engine
// ========================================================

var FIREBASE_CONFIG_STORAGE_KEY = 'edutest_firebase_config_v2';

// Foydalanuvchining Firebase konfiguratsiyasi
var DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyApruKTqGkWEGRYIqJWzUPQKylPaHfBluA",
  authDomain: "edu-test-7c6bc.firebaseapp.com",
  projectId: "edu-test-7c6bc",
  storageBucket: "edu-test-7c6bc.firebasestorage.app",
  messagingSenderId: "113635441650",
  appId: "1:113635441650:web:d733e61a4400f37b1d896b",
  measurementId: "G-92YHGED3GR",
  databaseURL: "https://edu-test-7c6bc-default-rtdb.firebaseio.com"
};

var activeFirebaseConfig = null;
var firebaseAppInstance = null;
var firebaseDbInstance = null;     // Realtime Database instance (if used)
var firebaseFirestoreInstance = null; // Firestore instance (if used)
var firebaseSyncMode = null;        // 'rtdb' or 'firestore'
var isFirebaseConnected = false;
var isFirebaseSyncing = false;

/**
 * Initialize Firebase Application & Database (Dual-mode: Firestore + Realtime DB)
 */
function initFirebaseApp() {
  try {
    var savedCfgStr = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
    var cfg = null;
    if (savedCfgStr) {
      try {
        cfg = JSON.parse(savedCfgStr);
      } catch (e) {
        cfg = null;
      }
    }

    if (!cfg || !cfg.apiKey) {
      cfg = { ...DEFAULT_FIREBASE_CONFIG };
    }

    activeFirebaseConfig = cfg;

    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK compat kutubxonasi yuklanmagan.');
      updateFirebaseStatusUI('error', 'Firebase SDK yuklanmadi');
      return false;
    }

    // Initialize or get app
    if (!firebase.apps || firebase.apps.length === 0) {
      firebaseAppInstance = firebase.initializeApp(cfg);
    } else {
      firebaseAppInstance = firebase.app();
    }

    // Try Realtime Database first, then Firestore
    var rtdbOk = false;
    var firestoreOk = false;

    if (typeof firebase.database === 'function' && cfg.databaseURL) {
      try {
        firebaseDbInstance = firebase.database();
        rtdbOk = true;
      } catch (e) {
        console.warn('Realtime Database init note:', e.message);
      }
    }

    if (typeof firebase.firestore === 'function') {
      try {
        firebaseFirestoreInstance = firebase.firestore();
        firestoreOk = true;
      } catch (e) {
        console.warn('Firestore init note:', e.message);
      }
    }

    if (rtdbOk || firestoreOk) {
      isFirebaseConnected = true;
      firebaseSyncMode = rtdbOk ? 'rtdb' : 'firestore';
      updateFirebaseStatusUI('connected');
      attachFirebaseRealtimeListeners();
      return true;
    } else {
      isFirebaseConnected = false;
      updateFirebaseStatusUI('unconfigured');
      return false;
    }
  } catch (err) {
    console.error('Firebase initialization error:', err);
    isFirebaseConnected = false;
    updateFirebaseStatusUI('error', err.message);
    return false;
  }
}

/**
 * Update UI Indicators for Firebase Status
 */
function updateFirebaseStatusUI(status, errorMsg) {
  var headerBadge = document.getElementById('cloudStatusBadge');
  var adminStatusBadge = document.getElementById('adminFirebaseStatusBadge');
  var adminStatusText = document.getElementById('adminFirebaseStatusText');

  if (status === 'connected') {
    if (headerBadge) {
      headerBadge.className = 'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200';
      headerBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span>Firebase: Jonli</span>';
    }
    if (adminStatusBadge) {
      adminStatusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300';
      adminStatusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Bulutli Baza Faol (Real-time)';
    }
    if (adminStatusText) {
      adminStatusText.innerHTML = "Barcha qurilmalar <strong>edu-test-7c6bc</strong> Firebase buluti orqali bog'langan. O'quvchi test ishlashi bilan natijalar shu zahoti Admin panelingizda real-vaqtda ko'rinadi.";
    }
  } else if (status === 'error') {
    if (headerBadge) {
      headerBadge.className = 'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200';
      headerBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-500"></span><span>Firebase Xatosi</span>';
    }
    if (adminStatusBadge) {
      adminStatusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300';
      adminStatusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-500"></span> Xatolik: ' + (errorMsg || 'Ulanishda xato');
    }
  } else {
    if (headerBadge) {
      headerBadge.className = 'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200';
      headerBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span><span>Mahalliy rejim</span>';
    }
    if (adminStatusBadge) {
      adminStatusBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300';
      adminStatusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span> Hozircha Mahalliy rejim (LocalStorage)';
    }
    if (adminStatusText) {
      adminStatusText.textContent = "Firebase kaliti kiritildi. Agar Firebase Console'da baza ochilmagan bo'lsa, 'Create Database' tugmasini bosing.";
    }
  }
}

/**
 * Attach Live Listeners for cross-device synchronization
 */
function attachFirebaseRealtimeListeners() {
  // --- A. Realtime Database Mode ---
  if (firebaseDbInstance) {
    try {
      // 1. Submissions listener
      firebaseDbInstance.ref('submissions').on('value', function(snapshot) {
        var data = snapshot.val();
        if (data) {
          var list = [];
          if (Array.isArray(data)) {
            list = data.filter(Boolean);
          } else if (typeof data === 'object') {
            list = Object.values(data);
          }
          list.sort(function(a, b) {
            var idA = a.id ? parseInt(String(a.id).replace(/\D/g, ''), 10) || 0 : 0;
            var idB = b.id ? parseInt(String(b.id).replace(/\D/g, ''), 10) || 0 : 0;
            return idB - idA;
          });

          submissionsList = list;
          try {
            localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissionsList));
          } catch (e) {}

          if (typeof refreshAdminAll === 'function' && typeof isAdminAuthenticated !== 'undefined' && isAdminAuthenticated) {
            refreshAdminAll();
          }
        }
      }, function(err) {
        console.warn('RTDB submissions read note:', err.message);
        // If RTDB gives permission or not found error, try Firestore mode
        tryFallbackToFirestore();
      });

      // 2. Questions listener
      firebaseDbInstance.ref('questions').on('value', function(snapshot) {
        var data = snapshot.val();
        if (data && Array.isArray(data) && data.length > 0) {
          questionsBank = data;
          try {
            localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(questionsBank));
          } catch (e) {}
          if (typeof refreshSubjectDropdowns === 'function') refreshSubjectDropdowns();
          if (typeof updateExamPreviewInfo === 'function') updateExamPreviewInfo();
          if (typeof renderAdminQuestionsList === 'function' && typeof isAdminAuthenticated !== 'undefined' && isAdminAuthenticated) {
            renderAdminQuestionsList();
          }
        }
      });

      // 3. Students listener
      firebaseDbInstance.ref('students').on('value', function(snapshot) {
        var data = snapshot.val();
        if (data) {
          registeredStudents = Array.isArray(data) ? data.filter(Boolean) : Object.values(data);
          try {
            localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(registeredStudents));
          } catch (e) {}
          if (typeof renderAdminStudentAccounts === 'function' && typeof isAdminAuthenticated !== 'undefined' && isAdminAuthenticated) {
            renderAdminStudentAccounts();
          }
        }
      });

      // 4. Settings listener
      firebaseDbInstance.ref('settings').on('value', function(snapshot) {
        var data = snapshot.val();
        if (data && typeof data === 'object') {
          var fallback = typeof getFallbackSettings === 'function' ? getFallbackSettings() : {};
          examSettings = { ...fallback, ...data };
          try {
            localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(examSettings));
          } catch (e) {}
          if (typeof updateExamPreviewInfo === 'function') updateExamPreviewInfo();
          if (typeof populateSettingsForm === 'function') populateSettingsForm();
        }
      });
    } catch (e) {
      console.warn('Realtime Database listener attach note:', e.message);
    }
  }

  // --- B. Firestore Mode ---
  if (firebaseFirestoreInstance) {
    try {
      firebaseFirestoreInstance.collection('submissions').onSnapshot(function(snapshot) {
        if (!snapshot.empty) {
          var list = [];
          snapshot.forEach(function(doc) {
            list.push(doc.data());
          });
          list.sort(function(a, b) {
            var idA = a.id ? parseInt(String(a.id).replace(/\D/g, ''), 10) || 0 : 0;
            var idB = b.id ? parseInt(String(b.id).replace(/\D/g, ''), 10) || 0 : 0;
            return idB - idA;
          });
          submissionsList = list;
          try {
            localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissionsList));
          } catch (e) {}
          if (typeof refreshAdminAll === 'function' && typeof isAdminAuthenticated !== 'undefined' && isAdminAuthenticated) {
            refreshAdminAll();
          }
        }
      }, function(err) {
        // Firestore permission note
      });
    } catch (e) {}
  }
}

function tryFallbackToFirestore() {
  if (firebaseFirestoreInstance) {
    firebaseSyncMode = 'firestore';
  }
}

/**
 * Push an individual student test submission to Firebase (both RTDB and Firestore)
 */
function pushSubmissionToFirebase(submissionRecord) {
  if (!isFirebaseConnected) {
    return Promise.resolve(false);
  }

  var promises = [];

  if (firebaseDbInstance) {
    var p1 = firebaseDbInstance.ref('submissions/' + submissionRecord.id).set(submissionRecord)
      .then(function() {
        console.log('Submission pushed to RTDB:', submissionRecord.id);
        return true;
      })
      .catch(function(err) {
        console.warn('RTDB push warning:', err.message);
        return false;
      });
    promises.push(p1);
  }

  if (firebaseFirestoreInstance) {
    var p2 = firebaseFirestoreInstance.collection('submissions').doc(submissionRecord.id).set(submissionRecord)
      .then(function() {
        console.log('Submission pushed to Firestore:', submissionRecord.id);
        return true;
      })
      .catch(function(err) {
        console.warn('Firestore push warning:', err.message);
        return false;
      });
    promises.push(p2);
  }

  return Promise.all(promises).then(function(results) {
    return results.some(Boolean);
  });
}

/**
 * Delete a student submission from Firebase cloud (both RTDB and Firestore)
 */
function removeSubmissionFromFirebase(subId) {
  if (!subId) return;

  // 1. Delete from Realtime Database
  if (firebaseDbInstance) {
    try {
      firebaseDbInstance.ref('submissions/' + subId).remove().catch(function(err) {
        console.warn('RTDB delete error:', err);
      });
      // Also overwrite the full submissions map to guarantee no orphaned records
      var map = {};
      submissionsList.forEach(function(s) {
        if (s && s.id && s.id !== subId) {
          map[s.id] = s;
        }
      });
      firebaseDbInstance.ref('submissions').set(map).catch(function() {});
    } catch (e) {}
  }

  // 2. Delete from Firestore
  if (firebaseFirestoreInstance) {
    try {
      firebaseFirestoreInstance.collection('submissions').doc(subId).delete().catch(function(err) {
        console.warn('Firestore delete error:', err);
      });
    } catch (e) {}
  }
}

/**
 * Clear all submissions from Firebase cloud
 */
function clearAllSubmissionsInFirebase() {
  if (firebaseDbInstance) {
    try {
      firebaseDbInstance.ref('submissions').remove().catch(function() {});
    } catch (e) {}
  }
  if (firebaseFirestoreInstance) {
    try {
      firebaseFirestoreInstance.collection('submissions').get().then(function(snapshot) {
        snapshot.forEach(function(doc) {
          doc.ref.delete().catch(function() {});
        });
      }).catch(function() {});
    } catch (e) {}
  }
}

/**
 * Push question bank, student accounts, or settings to Firebase
 */
function syncStateToFirebase(type) {
  if (!isFirebaseConnected) return;

  // Realtime Database
  if (firebaseDbInstance) {
    try {
      if (type === 'questions' || type === 'all') {
        firebaseDbInstance.ref('questions').set(questionsBank).catch(function() {});
      }
      if (type === 'students' || type === 'all') {
        firebaseDbInstance.ref('students').set(registeredStudents).catch(function() {});
      }
      if (type === 'settings' || type === 'all') {
        firebaseDbInstance.ref('settings').set(examSettings).catch(function() {});
      }
      if (type === 'submissions' || type === 'all') {
        var map = {};
        submissionsList.forEach(function(s) {
          if (s && s.id) {
            map[s.id] = s;
          }
        });
        firebaseDbInstance.ref('submissions').set(map).catch(function() {});
      }
    } catch (e) {}
  }

  // Firestore
  if (firebaseFirestoreInstance) {
    try {
      if (type === 'settings' || type === 'all') {
        firebaseFirestoreInstance.collection('config').doc('examSettings').set(examSettings).catch(function() {});
      }
      if (type === 'questions' || type === 'all') {
        firebaseFirestoreInstance.collection('config').doc('questionsBank').set({ list: questionsBank }).catch(function() {});
      }
    } catch (e) {}
  }
}


/**
 * Handle saving custom Firebase configuration from Admin Panel form
 */
function handleSaveFirebaseConfigUI(event) {
  if (event) event.preventDefault();

  var rawConfigJson = (document.getElementById('firebaseConfigJsonInput').value || '').trim();
  var dbUrl = (document.getElementById('firebaseDbUrlInput').value || '').trim();
  var apiKey = (document.getElementById('firebaseApiKeyInput').value || '').trim();
  var projectId = (document.getElementById('firebaseProjectIdInput').value || '').trim();

  var finalConfig = { ...DEFAULT_FIREBASE_CONFIG };

  if (rawConfigJson) {
    try {
      var jsonStr = rawConfigJson;
      if (jsonStr.indexOf('{') !== -1 && jsonStr.lastIndexOf('}') !== -1) {
        jsonStr = jsonStr.substring(jsonStr.indexOf('{'), jsonStr.lastIndexOf('}') + 1);
        jsonStr = jsonStr.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
      }
      var parsed = JSON.parse(jsonStr);
      finalConfig = { ...finalConfig, ...parsed };
    } catch (e) {
      showToast("Config JSON formatida xatolik!");
      return;
    }
  }

  if (dbUrl) finalConfig.databaseURL = dbUrl.replace(/\/+$/, '');
  if (apiKey) finalConfig.apiKey = apiKey;
  if (projectId) finalConfig.projectId = projectId;

  localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(finalConfig));
  activeFirebaseConfig = finalConfig;

  var success = initFirebaseApp();
  if (success) {
    showToast("Firebase kaliti saqlandi va ulandi!");
    populateFirebaseConfigForm();
  } else {
    showToast("Firebase kaliti saqlandi!");
  }
}

/**
 * Populate Firebase settings form in Admin Panel
 */
function populateFirebaseConfigForm() {
  var savedCfgStr = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
  var cfg = savedCfgStr ? JSON.parse(savedCfgStr) : (activeFirebaseConfig || DEFAULT_FIREBASE_CONFIG);

  var dbUrlInput = document.getElementById('firebaseDbUrlInput');
  var apiKeyInput = document.getElementById('firebaseApiKeyInput');
  var projIdInput = document.getElementById('firebaseProjectIdInput');
  var jsonInput = document.getElementById('firebaseConfigJsonInput');

  if (cfg) {
    if (dbUrlInput && cfg.databaseURL) dbUrlInput.value = cfg.databaseURL;
    if (apiKeyInput && cfg.apiKey) apiKeyInput.value = cfg.apiKey;
    if (projIdInput && cfg.projectId) projIdInput.value = cfg.projectId;
    if (jsonInput) jsonInput.value = JSON.stringify(cfg, null, 2);
  }
}

/**
 * Upload existing local questions bank and settings to Firebase (One-click cloud setup)
 */
function uploadLocalDataToFirebaseCloud() {
  if (!isFirebaseConnected) {
    showToast("Avval Firebase ulanishi kerak!");
    return;
  }

  showToast("Ma'lumotlar bulutga yuklanmoqda...");
  syncStateToFirebase('all');
  setTimeout(function() {
    showToast("Barcha 50 ta savol va sozlamalar Firebase bulutiga yuklandi!");
  }, 1000);
}

/**
 * Disconnect Firebase and revert back to pure LocalStorage
 */
function disconnectFirebaseCloud() {
  localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
  activeFirebaseConfig = { ...DEFAULT_FIREBASE_CONFIG };
  showToast("Firebase sozlamalari tiklandi.");
  populateFirebaseConfigForm();
}

// Window & global exports
if (typeof window !== 'undefined') {
  window.FIREBASE_CONFIG_STORAGE_KEY = FIREBASE_CONFIG_STORAGE_KEY;
  window.DEFAULT_FIREBASE_CONFIG = DEFAULT_FIREBASE_CONFIG;
  window.initFirebaseApp = initFirebaseApp;
  window.updateFirebaseStatusUI = updateFirebaseStatusUI;
  window.attachFirebaseRealtimeListeners = attachFirebaseRealtimeListeners;
  window.pushSubmissionToFirebase = pushSubmissionToFirebase;
  window.syncStateToFirebase = syncStateToFirebase;
  window.handleSaveFirebaseConfigUI = handleSaveFirebaseConfigUI;
  window.populateFirebaseConfigForm = populateFirebaseConfigForm;
  window.removeSubmissionFromFirebase = removeSubmissionFromFirebase;
  window.clearAllSubmissionsInFirebase = clearAllSubmissionsInFirebase;
}
if (typeof global !== 'undefined') {
  global.FIREBASE_CONFIG_STORAGE_KEY = FIREBASE_CONFIG_STORAGE_KEY;
  global.DEFAULT_FIREBASE_CONFIG = DEFAULT_FIREBASE_CONFIG;
  global.initFirebaseApp = initFirebaseApp;
  global.updateFirebaseStatusUI = updateFirebaseStatusUI;
  global.attachFirebaseRealtimeListeners = attachFirebaseRealtimeListeners;
  global.pushSubmissionToFirebase = pushSubmissionToFirebase;
  global.removeSubmissionFromFirebase = removeSubmissionFromFirebase;
  global.clearAllSubmissionsInFirebase = clearAllSubmissionsInFirebase;
  global.syncStateToFirebase = syncStateToFirebase;
  global.handleSaveFirebaseConfigUI = handleSaveFirebaseConfigUI;
  global.populateFirebaseConfigForm = populateFirebaseConfigForm;
  global.uploadLocalDataToFirebaseCloud = uploadLocalDataToFirebaseCloud;
  global.disconnectFirebaseCloud = disconnectFirebaseCloud;
}

