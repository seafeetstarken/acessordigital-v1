import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let db = null;
let auth = null;
let serviceAccount = null;
let isInitialized = false;
let initError = null;

function sanitizePrivateKey(key) {
  if (!key || typeof key !== 'string') return key;
  let clean = key.trim();
  // Strip outer quotes
  clean = clean.replace(/^['"]|['"]$/g, '').trim();
  // Replace escaped newlines
  clean = clean.replace(/\\n/g, '\n');
  clean = clean.replace(/\\r/g, '\r');
  // Remove actual carriage return characters (CR) to prevent CRLF parsing errors in Node.js
  clean = clean.replace(/\r/g, '');
  
  // Reconstruct if it is single-line or newlines were lost
  const header = '-----BEGIN PRIVATE KEY-----';
  const footer = '-----END PRIVATE KEY-----';
  
  let normalized = clean.replace(/\s+/g, ' ');
  if (normalized.includes(header) && normalized.includes(footer)) {
    const startIdx = normalized.indexOf(header) + header.length;
    const endIdx = normalized.indexOf(footer);
    const body = normalized.substring(startIdx, endIdx).replace(/\s+/g, '');
    // Split into 64-char lines for PEM compliance
    const chunks = body.match(/.{1,64}/g);
    if (chunks) {
      clean = `${header}\n${chunks.join('\n')}\n${footer}\n`;
    }
  }
  return clean;
}

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
      // Sanitize private key in whichever format it exists (snake_case or camelCase)
      if (serviceAccount.private_key) {
        serviceAccount.private_key = sanitizePrivateKey(serviceAccount.private_key);
      }
      if (serviceAccount.privateKey) {
        serviceAccount.privateKey = sanitizePrivateKey(serviceAccount.privateKey);
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
      const keyStr = serviceAccount.private_key || serviceAccount.privateKey || '';
      const first20 = keyStr ? keyStr.substring(0, 20) : 'null';
      const last20 = keyStr ? keyStr.substring(keyStr.length - 20) : 'null';
      const len = keyStr ? keyStr.length : 0;
      const emailStr = serviceAccount.client_email || serviceAccount.clientEmail || 'unknown';
      initError = `Erro ao inicializar Firebase Admin: ${err.message} (Email: ${emailStr}, len: ${len}, start: "${first20}", end: "${last20}")`;
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
