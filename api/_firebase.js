import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let db = null;
let auth = null;
let serviceAccount = null;
let isInitialized = false;
let initError = null;

function initializeFirebase() {
  if (admin.apps.length > 0) {
    db = admin.firestore();
    auth = admin.auth();
    isInitialized = true;
    return;
  }

  // 1. Try GA_SERVICE_ACCOUNT_KEY from environment (base64 or raw JSON)
  const serviceAccountKey = process.env.GA_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const sanitized = serviceAccountKey.replace(/^['"]|['"]$/g, '').trim();
      if (sanitized.startsWith('{')) {
        serviceAccount = JSON.parse(sanitized);
        console.log('[Firebase Admin] Parsed successfully from raw JSON.');
      } else {
        const cleanBase64 = sanitized.replace(/\s+/g, '');
        const serviceAccountJson = Buffer.from(cleanBase64, 'base64').toString('utf-8');
        serviceAccount = JSON.parse(serviceAccountJson);
        console.log('[Firebase Admin] Parsed successfully from base64.');
      }
    } catch (err) {
      console.error('[Firebase Admin] Error parsing GA_SERVICE_ACCOUNT_KEY:', err);
      initError = `Erro ao decodificar GA_SERVICE_ACCOUNT_KEY: ${err.message}`;
    }
  }

  // 2. Try individual environment variables if GA_SERVICE_ACCOUNT_KEY is missing/failed
  if (!serviceAccount) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GA_PROJECT_ID || process.env.ACESSOR_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.GA_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.GA_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      try {
        // Handle newline characters in private key
        privateKey = privateKey.replace(/\\n/g, '\n').replace(/^['"]|['"]$/g, '').trim();
        serviceAccount = {
          projectId,
          clientEmail,
          privateKey
        };
        console.log('[Firebase Admin] Configured using individual environment variables.');
      } catch (err) {
        console.error('[Firebase Admin] Error parsing individual credentials:', err);
        initError = `Erro ao processar chaves individuais: ${err.message}`;
      }
    }
  }

  // 3. Local fallback (development only)
  if (!serviceAccount) {
    try {
      const files = ['seafeet-starken-core-6245b31b207f.json', 'seafeet-starken-core-25fe21036efb.json', 'gcp-service-account.json'];
      for (const file of files) {
        const fullPath = path.join(process.cwd(), file);
        if (fs.existsSync(fullPath)) {
          serviceAccount = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          console.log(`[Firebase Admin] Initialized using local file fallback: ${file}`);
          break;
        }
      }
    } catch (err) {
      console.warn('[Firebase Admin] Local fallback file search failed:', err);
    }
  }

  // Initialize Admin SDK if we have credentials
  if (serviceAccount) {
    try {
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      db = admin.firestore();
      auth = admin.auth();
      isInitialized = true;
      initError = null;
      console.log('[Firebase Admin] Initialized successfully.');
    } catch (err) {
      console.error('[Firebase Admin] Initialization failed:', err);
      initError = `Erro ao inicializar Firebase Admin: ${err.message}`;
    }
  } else {
    if (!initError) {
      initError = 'Credenciais do Firebase Admin não configuradas no servidor. Configure a variável GA_SERVICE_ACCOUNT_KEY no painel Vercel.';
    }
    console.warn('[Firebase Admin] Not initialized: Credentials not configured.');
  }
}

// Initialize immediately
initializeFirebase();

export { admin, db, auth, serviceAccount, isInitialized, initError };
export default admin;
