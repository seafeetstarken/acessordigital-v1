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

export function hydrateCockpitPage(runtime) {
  const snapshot = runtime?.snapshot || {};
  const metrics = snapshot.metrics || {};
  const counts = snapshot.counts || {};
  const workspace = snapshot.workspace || null;

  if (!workspace) {
    return { snapshot, metrics, counts, workspace };
  }

  if (workspace?.name) {
    setText('workspace-name', workspace.name);
    setText('workspace-slug', workspace.slug || workspace.name);
    setText('workspace-plan', workspace.billing_plan || 'Mensal');
    setText('workspace-credits', String(workspace.credits_balance ?? 0));
    setText('workspace-label', `${workspace.name} conectado ao Firebase`);
  }

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
  setText('pipeline-deals', `${counts.dealsOpen || 0} deals no funil`);
  setText('pipeline-open', String(counts.dealsOpen || 0));
  setText('pipeline-rate', `${Math.min(100, 20 + (metrics.averageAiScore || 0) / 4).toFixed(0)}%`);
  setText('pipeline-average', currency.format((snapshot.pipelineAverage || 0)));
  setText('topbar-deal-count', `${counts.dealsOpen || 0} deals`);

  setText('knowledge-docs-count', String(counts.knowledge || 0));
  setText('knowledge-sync-status', `Base conectada • ${counts.knowledge || 0} documentos • sync local ativo`);
  setText('knowledge-quality', `${Math.max(50, 90 - (counts.knowledge || 0) / 10).toFixed(0)}%`);
  setText('knowledge-sources', String(Math.max(1, Math.min(5, Math.ceil((counts.knowledge || 0) / 10) || 3))));

  setText('faturamento-plan', workspace?.billing_plan || 'Mensal');
  setText('faturamento-credits', String(workspace?.credits_balance ?? 0));

  setText('config-workspace-name', workspace?.name || 'Workspace');
  setText('config-workspace-slug', workspace?.slug || '');
  setText('config-credits-balance', String(workspace?.credits_balance ?? 0));

  return { snapshot, metrics, counts, workspace };
}
