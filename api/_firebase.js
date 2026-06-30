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
  "ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAiYWNlc3NvcmRpZ2l0YWwtdjEiLAogICJwcml2YXRlX2tleV9pZCI6ICJmY2MzZjA5ZTViOTVmODEwYzNlNTAzYjgwMDQ5eDU5MzAxZWM4NmIxIiwKICAicHJpdmF0ZV9rZXkiOiAiLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXG5NSUlFdkFJQkFEQU5CZ2txaGtpRzl3MEJBUUVGQUFTQ0JLWXdnZ1NpQWdFQUFvSUJBUUN0RXFGSW9SL0ZLckpIXG4vUGgxMUswaHZiOEIvMlluK2tRUGNDVmU0Q2RrUmcrYk1DbUhHWDRLeUc5S2czZEtVcE5FVStWTERFV2g4dFBTXG4vR2xDeVJueFlUUTFxblRhcmhMS1ROZEZING1TU0hPN3ZXbXZtV1dlT1BGclV1citramFRQ085SXYxUHQvTnF2XG5Qd3UxVUdBVWRIZ2VQdmtRYmZ3OHJLOW81UWFHNXB1RmFVdWpUVTFJS0IwcVZ0SVZjWVd3Z3BkcElVWUtsOXZqXG5BNUNUU29SZExvSmlOREZTNU5HTXN5UFRuTTFMM1M2TWdKdlp0Y1FXWXo3N3oyTmh5RUFFajlyTzc3cWl3ejZGXG5xUzhlSXByQ29EbkpWajB1czNiMFI2OEQzUTVGOTNjVEpKY0N2NzlBVDRGUlF4dVgwYkZwaW16dkFNOTZNa25GXG4wdjFNa3BOSkFnTUJBQUVDZ2dFQVVaVmZtNm9BSE9Ra2lCU3lWbkQ3YjlWTzdiVWp4YUtPWkt5Ym9SNk8weERIXG5tSUxhZ0ltK3hYeDRJYXJaRjVyWE9yVkZkOXdBRXZneGE5cDZEL1pXR1ZlVjBkcFpIU0JEVVVOcGtuYnNWWjE3XG5tTHNQejZ2Q29CUDlrWGJUdVU3WkU0cHlxVnN2U0JjU1N0dXdQRGI0STR4SGR4SitPNFZ0Q25qb2NzekxCOWwwXG5haEJZWFdhNGJqRlNldnFzQ0NKOTZQNGc1eWgybFFxYUJnQ1FRT05CZis5YTdlR0R6K2FrY1paL0xDZ1VBNm1pXG56TWNLWW1PZHdSYXk1SkZJd1NEaHBzcGNoUEkvWTVMck9sajF5REtlampBMUIwUHNSTW4ybXozUSt0bU1WLy9FXG5KTkdnaEE5WWYyQWtIdGd6MjkwdkJKclVWZG5NS0trek9VTEFlaGdjZFFLQmdRRFdMMjJ2YmNWWUl1YnpYamhMXG5jOCtUWWNmUXdTeDNuRGZIaHBvSGdYellRUTFOamRYLzlGSmNZZGVoYXZ3S0huZTYxeVA4Y0JvaTlzTlZnSW13XG5JMXFycHBEK1ZaZWJXY0JEdEtzRXRFN0tGNG9tbnN5VXZDNTdBKzJOQ1NtYWxWTks5cXVETGZrVVJmMlFuZzJmXG44YkZrT0ZqS29sdGlKZFJsMXc2dkFKTC9ld0tCZ1FETzNIbzZGcnFWRGRhbUw1MnhhS1FQS24zZXIxNnJzcEt6XG54bDUyV3NGSDBKVFUwNW9WU0U5eTV6ci9xQUNZcHYxTkk0MEtWUE1DMTZTVis1MWNzZ2hUbkEzbUlqcDZYNnhSXG54a0tTTDU1WDRpbFFrUUxVV2p6VUw2QWxHeXdMMGdUaWd6SkYvakduQk9ONWtBLy9IK2djVWJRb1kzdXY0bDlWXG5USHNleEF6N0N3S0JnSDIrREd2Z1N1b3FXMkhuSDYrVVJ2bmtmdFZjZzBtWlNkbjJlTGtOV1Fqd2Irbm02Z3JCXG5GaFVvVDlweEg1U2xQRzlSWE13WDJCQk14SEtPNnNhaTVBVS8zWUdqS0VWSTFLb3JCL2ZVRHlsdjFtaEQ5Q0VoXG50VHY5RzFvZ1ZlOXQyUjk2WDBpOUZhekVSaysvcW9vSzc3VEJxOGNTdUFtUDRma0QzNWY0QTFTL0FvR0FMK3gyXG5TS1RoWHd6UXNMbVJUL3VOSHBKYWpNK1dJRE1EdDdCNlMvTWttZzJoblZqVWRwL0ZBRHEvdVdEam1ubjlidlNRXG5oVmMrNFdheUU2a3lRTHBpSVhTaTU3RUFXVDkyL1k3djkwd2U0LzlhVVBiM2I5amtCTWh2MG9qa0FHME1ncW1nXG5hUVRGM2dyTTVHblN1dWxhYmMwajdzTjFjVDhCbFJKZDU3ZkZ4aGNDZ1lBTXgrakxJbm9SSlVta2UvOU1OeXV5XG5sMkF6cGtURWJLMFhFazNFcjFzZnU4TE5OS21tR0xmRmkrZjNFNlprTm9HTHk2ajRWT2p0bFcvd3M1NjB2Y3MvXG5HazlmWVU5U09qTFhnSHZXSzUycWt3d2tSeFlaVGZFYjBpTFhZQUN2UUpTQVlkNmFjVE51VjlqbU5ScDVmbDYyXG5nMlRPaWh5NFBkTFJvY213MjA0aU13PT1cbi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS1cbiIsCiAgImNsaWVudF9lbWFpbCI6ICJmaXJlYmFzZS1hZG1pbnNkay1mYnN2Y0BhY2Vzc29yZGlnaXRhbC12MS5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsCiAgImNsaWVudF9pZCI6ICIxMTc3NTUwMTA0NDgxOTc3NTQzNDQiLAogICJhdXRoX3VyaSI6ICJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20vby9vYXV0aDIvYXV0aCIsCiAgInRva2VuX3VyaSI6ICJodHRwczovL29hdXRoMi5nb29nbGVhcGlzLmNvbS90b2tlbiIsCiAgImF1dGhfcHJvdmlkZXJfeDUwOV9jZXJ0X3VybCI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvY2VydHMiLAogICJjbGllbnRfeDUwOV9jZXJ0X3VybCI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9yb2JvdC92MS9tZXRhZGF0YS94NTA5L2ZpcmViYXNlLWFkbWluc2RrLWZic3ZjJTQwYWNlc3NvcmRpZ2l0YWwtdjEuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJ1bml2ZXJzZV9kb21haW4iOiAiZ29vZ2xlYXBpcy5jb20iCn0K";

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
