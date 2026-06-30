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

const FALLBACK_KEY_B64 = 
  "ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAic2VhZmVldC1zdGFya2VuLWNvcmUiLAogICJwcml2YXRlX2tleV9pZCI6ICI2MjQ1YjMxYjIwN2Y5NmM0NjQ1ODhkMzY5NzZmNGVmMTYxM2Y2MDBiIiwKICAicHJpdmF0ZV9rZXkiOiAiLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXG5NSUlFdlFJQkFEQU5CZ2txaGtpRzl3MEJBUUVGQUFTQ0JLY3dnZ1NqQWdFQUFvSUJBUURjUWoyNzZSbHFlUGxtXG50WFZZdTR1MTdvL0tGOGVMRmNjUjQzYkFYbGVHSk1tQzZiOHh6U1JUNmI4RXBKZzF4WEZnVDcwN0hwbGRvL2l6XG5uWDVmUVZacjl6Rzk1cXdMUkhJTzFBdW51VVlFaVlFamtlbEl1L0RLakF0czhTaG9zKzJoR2RGMEExVzZITyt4XG5GVERNcjdEWkxnRDBmTnd4RnJVVElmWHVFbzFrMlk4bnFOSGk2WlJkYldjV3FKdW9VbTRtTVFCWEdLbFZGV0M3XG5QQ2hYRytwcTI2NytlVjFTSGZYZkVLK0VEYlB0RGJVUUMyTlB5a2poMlRKZThFeU1QVFNFaXpSYnFBMEZqYTZ0XG5PNGx1eDFSM0x1WTNWZDFMU3c4N0t2V0dYR01sM1RSSjB4QXJHWHV2M0R2NURBMTRibGJVazBBbkJlay9KL0ZCXG5abUZWbHA2TkFnTUJBQUVDZ2dFQUljdkRoNFRnUXFTTG9XcXF0ZkhzOXRPWWhOOVBpRjZsUEJyditvWUo4dlRMXG51MXZIVzUrem84YUVGSi9NRlJyQVp6dnZvcXNkY3RuNU5xellta3EvQ25PVVVubWE5ZzJnc2ZnYVRtTFF4TEJ6XG41clBPOGp0QzJxbFF0WHpFQVFZZXFrU2p0L2t0QmJ0eFBIV0R3VEhIWVJqbkg1eUFUVzN1WEhXdVhtM0NwcHhYXG5BeGluaHdjeEVkTHFKUnZBODRWUmFudjlqMWFjYnFuc3pBeUVyd2o5TFNXeVduWFozTUpPNnVoZjJlNTNyblkvXG5reUNuYmNWcG40V215K2Fvb0ZKblp1c082b2MvTUlPVWVkYXhRck9kaUh4QWxWN3B3Z2V4bjZ6RTZxZ0dqaEFhXG53TG9MRVJOK25FK2FSWlN2RHpHTW5wajZFbmhpeWdHWGlFaVlaKzI4MXdLQmdRRDBNY1QyOXRJOGc0NklQYVpkXG5ib0V2TjB5Ry9NWitkZVkwRTZMNFZ5anRQN1hMMGV3dFRWcGFmNnduYU1iRjJuQmRUd3BHZXJTM3NqaWJETVNpXG5KbmRQY3labjE4Q1I2OUY1MEs0T0k4RVplSm5yYmtRajB6QWpVejhuWjBwNk5XZHRtVitkNytJLzhFOUgzTlFRXG4rMGV4ZlRJN1VsSFRNVlplV3pNWnMrTWRwd0tCZ1FEbTZEeDFSZGlFNkNZTEFQYVU5Q3VvSTNsTXIrYlZvSzR0XG5HLzMvdXZkNkZBeFlPOWVkS0d3RjdOenpBVHJVa3dBWjlERzhWeXBMK05iWXJzVTdJVlpZY1hrRVF2TFdoN0IyXG5VZXY5ekFmdENBeWJ6YUtBQkRhMm5QNHN4NkxyeG8xbjNPOXVacTc1VXowcnRzbUhrR1R6UTV2R2lXNE1tV0NlXG4zUVBvQ1dtd3F3S0JnR0VsUzQ1VU10OFFGeXZzR3JzZ3N4UHRrK3cvczFlcjM2RG9EdlZzOTBNckRVL0FlNHlxXG5NVCsvZXVWU3NZRVVuWThCV3IwZkk3WFFtT1JWK0FQcCtaMEoya1dGZDM2VnFnZ2tGSnBiYnY2TEUvQ3ROVDVyXG5UY00vNHVmeUY1YjJsK2JxRlRmbnJzSncvNWsvS0w1NHVOVExVYWgzMzBWOVl6YTJZV1hnUW9JUkFvR0FVbklKXG5aRFlVSVNCaXRQc2JFQVErc2tJNFJWRnBNazIwNHhaamtyUEhPU2QvWU9HOUVyZ2tHZG1BNnFNOXhqaldpRzNRXG5kRmNMR3lVMlVSZldCRTdhN2FsV2RGY1RMZFkxQTRvc29Pb0F5bmxkUnlRZEtXaFh3TXc5Vk8vVEZDeEl3UlQ1XG55SW1SWUNTQWF1TlJBYjVrelJjT3Y4ekNKbTE5T2p2ZjhUR3JNeEVDZ1lFQW9WSEQzM2lqNzh6WkFQeUdJTElRXG5XdmQ4c0ViUUpTTjIreG5ZakpqRFJDQVRiY2tMWmpDWTBOYTdHSjNSbStNN1R5cHZZREFGYmhrTTVseXlleDhsXG5zZ2QxMklseWRhT2NBYVhJVk1nbXkxdlhrN2w3amNrT3Y4SVB1L1dmUXgxT0RRWEdMYTZnOGtTMlpqTWphWDRsXG5CdnJHSWxLZGhCRHZodFA5NjZrVUFYRT1cbi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS1cbiIsCiAgImNsaWVudF9lbWFpbCI6ICJmaXJlYmFzZS1hZG1pbnNkay1mYnN2Y0BzZWFmZWV0LXN0YXJrZW4tY29yZS5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsCiAgImNsaWVudF9pZCI6ICIxMDgzNzI1MzY2OTkwNjg0NDg2OTciLAogICJhdXRoX3VyaSI6ICJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20vby9vYXV0aDIvYXV0aCIsCiAgInRva2VuX3VyaSI6ICJodHRwczovL29hdXRoMi5nb29nbGVhcGlzLmNvbS90b2tlbiIsCiAgImF1dGhfcHJvdmlkZXJfeDUwOV9jZXJ0X3VybCI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvY2VydHMiLAogICJjbGllbnRfeDUwOV9jZXJ0X3VybCI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9yb2JvdC92MS9tZXRhZGF0YS94NTA5L2ZpcmViYXNlLWFkbWluc2RrLWZic3ZjJTQwc2VhZmVldC1zdGFya2VuLWNvcmUuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJ1bml2ZXJzZV9kb21haW4iOiAiZ29vZ2xlYXBpcy5jb20iCn0K";

function initializeFirebase() {
  if (admin.apps.length > 0) {
    db = admin.firestore();
    auth = admin.auth();
    isInitialized = true;
    return;
  }

  let initializedWithEnv = false;

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

      // Check if it's the wrong email
      const email = serviceAccount.client_email || serviceAccount.clientEmail || '';
      if (email.includes('analytics-data-reader')) {
        throw new Error('Wrong service account email (analytics-data-reader)');
      }

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
      initializedWithEnv = true;
      console.log('[Firebase Admin] Initialized successfully with env credentials.');
    } catch (err) {
      console.warn('[Firebase Admin] Env credentials initialization failed, trying hardcoded fallback:', err.message);
    }
  }

  // 2. Try individual environment variables if GA_SERVICE_ACCOUNT_KEY is missing/failed
  if (!initializedWithEnv) {
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
        initializedWithEnv = true;
        console.log('[Firebase Admin] Configured using individual environment variables.');
      } catch (err) {
        console.warn('[Firebase Admin] Individual credentials failed, trying hardcoded fallback:', err.message);
      }
    }
  }

  // 3. Fallback to hardcoded verified credentials if env initialization failed or was skipped
  if (!initializedWithEnv) {
    try {
      const decoded = Buffer.from(FALLBACK_KEY_B64, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decoded);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = sanitizePrivateKey(serviceAccount.private_key);
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      db = admin.firestore();
      auth = admin.auth();
      isInitialized = true;
      initError = null;
      console.log('[Firebase Admin] Initialized successfully using hardcoded verified credentials fallback.');
    } catch (err) {
      console.error('[Firebase Admin] Fallback initialization failed:', err);
      const keyStr = serviceAccount ? (serviceAccount.private_key || serviceAccount.privateKey || '') : '';
      const first20 = keyStr ? keyStr.substring(0, 20) : 'null';
      const last20 = keyStr ? keyStr.substring(keyStr.length - 20) : 'null';
      const len = keyStr ? keyStr.length : 0;
      const emailStr = serviceAccount ? (serviceAccount.client_email || serviceAccount.clientEmail || 'unknown') : 'unknown';
      initError = `Erro ao inicializar Firebase Admin (todos os métodos falharam): ${err.message} (Email: ${emailStr}, len: ${len}, start: "${first20}", end: "${last20}")`;
    }
  }
}

// Initialize immediately
initializeFirebase();

export { admin, db, auth, serviceAccount, isInitialized, initError };
export default admin;
