async function readConfig() {
  const { FIREBASE_CONFIG } = await import('./firebase-config.js');
  return {
    apiKey: window.ACESSOR_FIREBASE_API_KEY || window.__FIREBASE_API_KEY__ || FIREBASE_CONFIG.apiKey || '',
    authDomain: window.ACESSOR_FIREBASE_AUTH_DOMAIN || window.__FIREBASE_AUTH_DOMAIN__ || FIREBASE_CONFIG.authDomain || '',
    projectId: window.ACESSOR_FIREBASE_PROJECT_ID || window.__FIREBASE_PROJECT_ID__ || FIREBASE_CONFIG.projectId || '',
    storageBucket: window.ACESSOR_FIREBASE_STORAGE_BUCKET || window.__FIREBASE_STORAGE_BUCKET__ || FIREBASE_CONFIG.storageBucket || '',
    messagingSenderId: window.ACESSOR_FIREBASE_MESSAGING_SENDER_ID || window.__FIREBASE_MESSAGING_SENDER_ID__ || FIREBASE_CONFIG.messagingSenderId || '',
    appId: window.ACESSOR_FIREBASE_APP_ID || window.__FIREBASE_APP_ID__ || FIREBASE_CONFIG.appId || '',
    measurementId: window.ACESSOR_FIREBASE_MEASUREMENT_ID || window.__FIREBASE_MEASUREMENT_ID__ || FIREBASE_CONFIG.measurementId || ''
  };
}

export async function hasFirebaseConfig() {
  const { apiKey, authDomain, projectId, appId } = await readConfig();
  return Boolean(apiKey && authDomain && projectId && appId);
}

export async function getFirebaseHints() {
  const { apiKey, authDomain, projectId, appId } = await readConfig();
  return {
    apiKeyConfigured: Boolean(apiKey),
    authDomainConfigured: Boolean(authDomain),
    projectIdConfigured: Boolean(projectId),
    appIdConfigured: Boolean(appId)
  };
}

export async function loadFirebaseApp() {
  const config = await readConfig();
  if (!(await hasFirebaseConfig())) return null;

  const [{ initializeApp, getApps }, { getAuth, setPersistence, browserLocalPersistence }, { getFirestore }] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js')
  ]);

  const app = getApps().length ? getApps()[0] : initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);

  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    // Keep going in browsers that block persistence setup.
  }

  return { app, auth, db };
}

export function setBootstrapConfig({ apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId }) {
  window.__FIREBASE_API_KEY__ = apiKey;
  window.__FIREBASE_AUTH_DOMAIN__ = authDomain;
  window.__FIREBASE_PROJECT_ID__ = projectId;
  window.__FIREBASE_STORAGE_BUCKET__ = storageBucket;
  window.__FIREBASE_MESSAGING_SENDER_ID__ = messagingSenderId;
  window.__FIREBASE_APP_ID__ = appId;
  window.__FIREBASE_MEASUREMENT_ID__ = measurementId;
}
