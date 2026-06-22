const PLACEHOLDER_TEXTS = new Set([
  'EB',
  '?',
  'Empresa BR',
  'Plano Pro',
  'Conta ativa',
  'Plano pendente',
  'Sessão ativa'
]);

function readSession() {
  try {
    const raw = window.localStorage.getItem('acessor_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readRegisteredProfile() {
  try {
    const raw = window.localStorage.getItem('registered_profile');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function shortName(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Conta ativa';
  const localPart = raw.includes('@') ? raw.split('@')[0] : raw;
  return localPart
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Conta ativa';
}

function getContext() {
  const session = readSession();
  const registered = readRegisteredProfile();
  const runtime = window.ACESSOR_RUNTIME || window.ACESSOR_AUTH || null;
  const profile = runtime?.profile || {};
  const snapshotWorkspace = runtime?.snapshot?.workspace || {};
  const sessionUser = session?.user || {};

  const email = sessionUser.email || profile.email || registered?.email || '';
  const displayName = snapshotWorkspace.name || profile.companyName || profile.displayName || sessionUser.displayName || registered?.companyName || registered?.fullName || email || 'Conta ativa';
  const plan = snapshotWorkspace.billingPlan || profile.plan || sessionUser.plan || 'Plano pendente';
  const owner = snapshotWorkspace.ownerEmail || sessionUser.email || profile.email || email || '';
  const avatar = String(displayName).trim().charAt(0).toUpperCase() || '?';

  return {
    displayName,
    plan,
    owner,
    avatar,
    shortName: shortName(displayName)
  };
}

function shouldReplace(currentText, desiredText) {
  const current = String(currentText || '').trim();
  if (!current) return true;
  if (current === desiredText) return false;
  return PLACEHOLDER_TEXTS.has(current) || current === '—' || current === '–';
}

function setIfNeeded(target, value) {
  if (!target) return;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    if (!target.value?.trim()) target.value = value;
    return;
  }
  if (shouldReplace(target.textContent, value)) {
    target.textContent = value;
  }
}

function hydrateGenericShell(context) {
  document.querySelectorAll('.sidebar-footer .avatar, .tb-avatar').forEach((el) => {
    setIfNeeded(el, context.avatar);
  });

  document.querySelectorAll('.sidebar-footer .user-info span, [data-session-name], #sidebar-name').forEach((el) => {
    setIfNeeded(el, context.displayName);
  });

  document.querySelectorAll('.sidebar-footer .user-info small, [data-session-plan], #sidebar-plan').forEach((el) => {
    setIfNeeded(el, context.plan);
  });

  document.querySelectorAll('[data-session-owner], #sidebar-owner').forEach((el) => {
    setIfNeeded(el, context.owner ? `Conectado como ${context.owner}` : 'Sessão ativa');
  });
}

function hydrateDashboardShell(context) {
  const title = document.getElementById('page-title');
  const subtitle = document.getElementById('page-subtitle');
  const workspacePlan = document.getElementById('workspace-plan');
  const workspaceLabel = document.getElementById('workspace-label');
  const faturamentoPlan = document.getElementById('faturamento-plan');

  if (title && shouldReplace(title.textContent, `Bem-vindo, ${context.shortName} ✦`)) {
    title.textContent = `Bem-vindo, ${context.shortName} ✦`;
  }
  if (subtitle && shouldReplace(subtitle.textContent, 'Visão geral da sua conta recém-criada e do seu plano.')) {
    subtitle.textContent = 'Visão geral da sua conta recém-criada e do seu plano.';
  }
  if (workspacePlan) setIfNeeded(workspacePlan, context.plan);
  if (workspaceLabel && shouldReplace(workspaceLabel.textContent, `${context.displayName} pronta para configuração`)) {
    workspaceLabel.textContent = `${context.displayName} pronta para configuração`;
  }
  if (faturamentoPlan) setIfNeeded(faturamentoPlan, context.plan);
}

function bindLogout() {
  const btn = document.getElementById('logoutBtn');
  if (!btn || btn.dataset.sessionLogoutBound === 'true') return;
  btn.dataset.sessionLogoutBound = 'true';
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Saindo...';
    try {
      const firebase = window.ACESSOR_RUNTIME?.firebase;
      if (firebase?.auth) {
        const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js');
        await signOut(firebase.auth);
      }
    } catch {
      // Ignora falhas de sign-out para seguir o fluxo local.
    } finally {
      window.localStorage.removeItem('acessor_session');
      window.location.href = 'login.html';
    }
  });
}

function hydrateSessionUi() {
  const context = getContext();
  hydrateGenericShell(context);
  hydrateDashboardShell(context);
  bindLogout();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrateSessionUi, { once: true });
} else {
  hydrateSessionUi();
}

