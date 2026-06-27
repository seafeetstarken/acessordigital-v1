const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0
});

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el || value === undefined || value === null) return;
  el.textContent = value;
}

function setHTML(id, value) {
  const el = document.getElementById(id);
  if (!el || value === undefined || value === null) return;
  el.innerHTML = value;
}

function setValueIfExists(id, value) {
  const el = document.getElementById(id);
  if (!el || value === undefined || value === null) return;
  el.textContent = value;
}

function shortUserName(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Conta ativa';
  if (raw.includes('@')) {
    return raw.split('@')[0] || 'Conta ativa';
  }
  return raw.split(/\s+/)[0] || raw;
}

export function hydrateCockpitPage(runtime) {
  const snapshot = runtime?.snapshot || {};
  const metrics = snapshot.metrics || {};
  const counts = snapshot.counts || {};
  const workspace = snapshot.workspace || null;
  const profile = runtime?.profile || {};
  const isFallbackWorkspace = workspace?.source === 'local-fallback';

  const displayName = workspace?.name || profile.companyName || profile.displayName || profile.email || 'Conta ativa';
  const planName = workspace?.billing_plan || profile.plan || 'Plano pendente';
  const workspaceSlug = workspace?.slug || profile.workspaceId || '';
  const credits = workspace?.credits_balance ?? profile.creditsBalance ?? 0;
  const ownerEmail = profile.email || workspace?.ownerEmail || '';

  setText('sidebar-name', displayName);
  setText('sidebar-workspace-name', displayName);
  setText('sidebar-plan', planName);
  setText('sidebar-avatar', String(displayName).trim().charAt(0).toUpperCase() || '?');
  setText('sidebar-email', ownerEmail);
  setText('sidebar-credits-value', `${credits} / ${workspace?.credits_total ?? 500} crd`);
  setText('topbar-title', snapshot.workspace?.name ? `Dashboard · ${snapshot.workspace.name}` : 'Dashboard');
  setText('topbar-sub', isFallbackWorkspace ? 'Conta recém-criada' : (snapshot.workspace?.name ? 'Cockpit de operações' : 'Acesso autenticado'));
  setText('topbar-avatar', String(displayName).trim().charAt(0).toUpperCase() || '?');
  setText('page-title', `Bem-vindo, ${shortUserName(displayName)} ✦`);
  setText('page-subtitle', snapshot.workspace?.name
    ? `Visão geral das suas operações e performance da Inteligência Artificial.`
    : `Visão geral da sua conta recém-criada e do seu plano.`);

  
  if (!workspace) {
    setText('metric-revenue', currency.format(0));
    setText('metric-conversations', '0');
    setText('metric-ai-score', '0.0%');
    setText('metric-contacts', '0');
    setText('metric-response', '0.0s');
    return { snapshot, metrics, counts, workspace };
  }

  setText('workspace-name', workspace.name);
  setText('workspace-slug', workspace.slug || workspace.name);
  setText('workspace-plan', workspace.billing_plan || 'Plano pendente');
  setText('workspace-credits', String(workspace.credits_balance ?? 0));
  setText('workspace-label', isFallbackWorkspace
    ? `${workspace.name} pronta para configuração`
    : `${workspace.name} conectado ao Firebase`);

  setText('metric-revenue', currency.format(metrics.revenueRecovered || 0));
  setText('metric-conversations', String(metrics.conversationsToday || 0));
  setText('metric-ai-score', `${(metrics.averageAiScore || 0).toFixed(1)}%`);
  setText('metric-contacts', String(metrics.newContacts || 0));
  setText('metric-response', `${(metrics.averageResponseSeconds || 0).toFixed(1)}s`);

  setText('stat-total', String(counts.contacts || 0));
  setText('stat-active', String(counts.conversations || 0));
  setText('stat-clients', String(counts.dealsOpen || 0));
  setText('stat-score', `${(metrics.averageAiScore || 0).toFixed(1)}%`);

  setText('analytics-total-conversations', String(counts.conversations || 0));
  setText('analytics-resolution-rate', `${Math.min(100, 80 + (metrics.averageAiScore || 0) / 5).toFixed(1)}%`);
  setText('analytics-response-time', `${(metrics.averageResponseSeconds || 0).toFixed(1)}s`);
  setText('analytics-leads', String(counts.contacts || 0));
  setText('analytics-whatsapp', `${Math.min(100, 50 + (counts.contacts || 0)).toFixed(0)}%`);
  setText('analytics-instagram', `${Math.max(0, 30 - (counts.contacts || 0)).toFixed(0)}%`);
  setText('analytics-messenger', `${Math.max(0, 10 - (counts.conversations || 0)).toFixed(0)}%`);
  setText('analytics-telegram', `${Math.max(0, 5 - (counts.events || 0)).toFixed(0)}%`);

  setText('auto-active-count', String(counts.automations || 0));
  setText('auto-exec-count', String(counts.events || 0));
  setText('auto-success-rate', `${Math.min(100, 90 + (metrics.averageAiScore || 0) / 10).toFixed(0)}%`);
  setText('auto-saved-actions', String((counts.conversations || 0) * 3 + (counts.dealsOpen || 0)));

  setText('pipeline-total', currency.format((snapshot.pipelineTotal || metrics.revenueRecovered || 0)));
  setText('pipeline-deals', `${counts.dealsOpen || 0} oportunidades no funil`);
  setText('pipeline-open', String(counts.dealsOpen || 0));
  setText('pipeline-rate', `${Math.min(100, 20 + (metrics.averageAiScore || 0) / 4).toFixed(0)}%`);
  setText('pipeline-average', currency.format((snapshot.pipelineAverage || 0)));
  setText('topbar-deal-count', `${counts.dealsOpen || 0} oportunidades`);

  setText('knowledge-docs-count', String(counts.knowledge || 0));
  setText('knowledge-sync-status', `Base conectada • ${counts.knowledge || 0} documentos • sync nuvem ativo`);
  setText('knowledge-quality', `${Math.max(50, 90 - (counts.knowledge || 0) / 10).toFixed(0)}%`);
  setText('knowledge-sources', String(Math.max(1, Math.min(5, Math.ceil((counts.knowledge || 0) / 10) || 3))));

  setText('faturamento-plan', workspace?.billing_plan || 'Plano pendente');
  setText('faturamento-credits', String(workspace?.credits_balance ?? 0));

  setText('config-workspace-name', workspace?.name || 'Workspace');
  setText('config-workspace-slug', workspace?.slug || '');
  setText('config-credits-balance', String(workspace?.credits_balance ?? 0));

  return { snapshot, metrics, counts, workspace };
}
