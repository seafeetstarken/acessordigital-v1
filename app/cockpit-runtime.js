import { hasFirebaseConfig, loadFirebaseApp, getFirebaseHints } from './firebase-bootstrap.js';

const protectedPages = new Set([
  'dashboard.html',
  'inbox.html',
  'crm.html',
  'pipeline.html',
  'automacoes.html',
  'agenda.html',
  'catalogo.html',
  'analytics.html',
  'conhecimento.html',
  'faturamento.html',
  'configuracoes.html',
  'notificacoes.html'
]);

function asDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function safeArray(items) {
  return Array.isArray(items) ? items : [];
}

function deriveWorkspaceIdFromProfile(profile, session) {
  return profile?.workspaceId || profile?.uid || session?.user?.uid || null;
}

function normalizeWorkspaceName(profile, session) {
  const fallbackLabel = 'Workspace ativo';
  return profile?.companyName
    || profile?.displayName
    || session?.user?.companyName
    || session?.user?.displayName
    || session?.user?.email
    || fallbackLabel;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'workspace';
}

async function loadUserProfile(firebase, session) {
  const fallbackLabel = session?.user?.email || session?.user?.displayName || 'Conta ativa';
  const fallbackProfile = {
    uid: session?.user?.uid || null,
    email: session?.user?.email || null,
    displayName: session?.user?.displayName || session?.user?.email || fallbackLabel,
    companyName: session?.user?.companyName || session?.user?.displayName || session?.user?.email || fallbackLabel,
    whatsapp: session?.user?.whatsapp || '',
    plan: session?.user?.plan || 'Plano pendente',
    workspaceId: session?.user?.workspaceId || session?.user?.uid || null
  };

  if (!firebase?.db || !session?.user?.uid) {
    return fallbackProfile;
  }

  try {
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js');
    const snap = await getDoc(doc(firebase.db, 'users', session.user.uid));
    if (!snap.exists()) return fallbackProfile;
    const data = snap.data() || {};
      return {
        uid: session.user.uid,
        email: data.email || session.user.email || null,
      displayName: data.displayName || session.user.displayName || session.user.email || fallbackLabel,
      companyName: data.companyName || data.displayName || session.user.displayName || session.user.email || fallbackLabel,
      whatsapp: data.whatsapp || '',
      plan: data.plan || 'Plano pendente',
      workspaceId: data.workspaceId || session.user.uid,
      ...data
    };
  } catch {
    return fallbackProfile;
  }
}

async function buildSnapshot(firebase) {
  const snapshot = {
    workspace: null,
    metrics: {
      revenueRecovered: 0,
      conversationsToday: 0,
      averageAiScore: 0,
      newContacts: 0,
      averageResponseSeconds: 1.2
    },
    counts: {
      knowledge: 0,
      contacts: 0,
      conversations: 0,
      dealsOpen: 0,
      automations: 0,
      notes: 0,
      events: 0
    }
  };

  if (!firebase?.db) return snapshot;

  const { db } = firebase;
  const {
    collection,
    getDocs,
    query,
    where
  } = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js');

  const sessionRaw = window.localStorage.getItem('acessor_session');
  let session = null;
  try {
    session = sessionRaw ? JSON.parse(sessionRaw) : null;
  } catch {
    session = null;
  }
  const profile = await loadUserProfile(firebase, session);
  const preferredWorkspaceId = deriveWorkspaceIdFromProfile(profile, session);

  let workspace = null;
  if (preferredWorkspaceId) {
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js');
    const workspaceById = await getDoc(doc(db, 'workspaces', preferredWorkspaceId));
    if (workspaceById.exists()) {
      workspace = { id: workspaceById.id, ...workspaceById.data() };
    }
  }

  if (!workspace) {
    const workspaceSnap = await getDocs(query(collection(db, 'workspaces')));
    const workspaceDoc = workspaceSnap.docs[0];
    workspace = workspaceDoc ? { id: workspaceDoc.id, ...workspaceDoc.data() } : null;
  }

  if (!workspace) {
    const fallbackName = normalizeWorkspaceName(profile, session);
    const fallbackWorkspaceId = preferredWorkspaceId || session?.user?.uid || slugify(fallbackName);
    workspace = {
      id: fallbackWorkspaceId,
      name: fallbackName,
      slug: slugify(fallbackName),
      billingPlan: profile?.plan || session?.user?.plan || 'Plano pendente',
      creditsBalance: 0,
      ownerUid: session?.user?.uid || profile?.uid || null,
      ownerEmail: session?.user?.email || profile?.email || null,
      source: 'local-fallback'
    };
  }
  snapshot.workspace = workspace;

  const workspaceId = workspace?.id;
  snapshot.profile = profile;
  if (!workspaceId) return snapshot;

  const collectionDocs = async (name) => {
    const snap = await getDocs(query(collection(db, name), where('workspaceId', '==', workspaceId)));
    return safeArray(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const [
    contactDocs,
    conversationDocs,
    dealDocs,
    automationDocs,
    noteDocs,
    eventDocs
  ] = await Promise.all([
    collectionDocs('contacts'),
    collectionDocs('conversations'),
    collectionDocs('deals'),
    collectionDocs('automations'),
    collectionDocs('session_notes'),
    collectionDocs('changelog_events')
  ]);

  snapshot.counts.knowledge = 0;
  snapshot.counts.contacts = contactDocs.length;
  snapshot.counts.conversations = conversationDocs.length;
  snapshot.counts.dealsOpen = dealDocs.filter((deal) => deal.stage !== 'Fechado').length;
  snapshot.counts.automations = automationDocs.length;
  snapshot.counts.notes = noteDocs.length;
  snapshot.counts.events = eventDocs.length;

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  snapshot.metrics.newContacts = contactDocs.filter((row) => {
    const createdAt = asDate(row.createdAt || row.created_at);
    return createdAt && createdAt >= sevenDaysAgo;
  }).length;
  snapshot.metrics.conversationsToday = conversationDocs.filter((row) => {
    const stamp = asDate(row.lastMessageAt || row.last_message_at || row.createdAt || row.created_at);
    return stamp && stamp >= today;
  }).length;
  snapshot.metrics.averageAiScore = contactDocs.length
    ? Math.round((contactDocs.reduce((total, row) => total + Number(row.aiScore ?? row.ai_score ?? 0), 0) / contactDocs.length) * 10) / 10
    : 0;
  snapshot.metrics.revenueRecovered = dealDocs
    .filter((deal) => deal.stage === 'Fechado')
    .reduce((total, deal) => total + Number(deal.value || 0), 0);

  snapshot.workspace = {
    ...workspace,
    billing_plan: workspace.billingPlan || workspace.billing_plan || 'Mensal',
    credits_balance: workspace.creditsBalance ?? workspace.credits_balance ?? 0
  };
  snapshot.profile = profile;

  return snapshot;
}

export async function initCockpitRuntime() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  const firebase = await loadFirebaseApp();
  const hints = await getFirebaseHints();

  const runtime = {
    page,
    firebase,
    hasFirebaseConfig: await hasFirebaseConfig(),
    hints,
    profile: null,
    session: null,
    snapshot: null,
    signOut: async () => {
      if (firebase?.auth) {
        const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js');
        await signOut(firebase.auth);
      }
      window.localStorage.removeItem('acessor_session');
      window.location.href = 'login.html';
    },
    refreshSnapshot: async () => {
      runtime.snapshot = await buildSnapshot(firebase);
      return runtime.snapshot;
    }
  };

  if (firebase?.auth) {
    const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js');
    runtime.session = await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(firebase.auth, async (user) => {
        unsubscribe();
        if (user) {
          const session = {
            access_token: await user.getIdToken().catch(() => 'firebase-session'),
            user: {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              providerData: user.providerData
            }
          };
          window.localStorage.setItem('acessor_session', JSON.stringify(session));
          resolve(session);
        } else {
          resolve(null);
        }
      });
    });
  } else {
    const cached = window.localStorage.getItem('acessor_session');
    if (cached && cached !== 'null') {
      try {
        runtime.session = JSON.parse(cached);
      } catch {
        runtime.session = null;
      }
    } else {
      runtime.session = null;
    }
  }

  runtime.profile = await loadUserProfile(firebase, runtime.session);
  runtime.snapshot = await buildSnapshot(firebase);
  window.ACESSOR_RUNTIME = runtime;
  window.ACESSOR_AUTH = {
    isReady: Boolean(firebase || runtime.session),
    isProtectedPage: protectedPages.has(page),
    hasFirebaseConfig: runtime.hasFirebaseConfig
  };

  if (protectedPages.has(page) && !runtime.session && page !== 'login.html') {
    window.location.href = 'login.html';
    return runtime;
  }

  return runtime;
}
