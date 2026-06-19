export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  cnpj: string | null;
  business_hours: Record<string, Json>;
  billing_plan: string;
  credits_balance: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseRow {
  id: string;
  workspace_id: string;
  type: 'PDF' | 'TXT' | 'MD' | 'Texto' | 'Scraper';
  title: string;
  content: string | null;
  status: 'Indexado' | 'Processando' | 'Erro';
  source_url: string | null;
  metadata: Record<string, Json>;
  updated_at: string;
  created_at: string;
}

export interface ContactRow {
  id: string;
  workspace_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  channel: string;
  ai_score: number;
  status: 'lead' | 'hot' | 'active' | 'cold';
  tags: string[];
  last_message_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationRow {
  id: string;
  contact_id: string;
  status: 'Aberta' | 'Resolvida' | 'Humano';
  ai_paused: boolean;
  last_message_at: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealRow {
  id: string;
  contact_id: string;
  stage: 'Prospecção' | 'Qualificado' | 'Proposta' | 'Negociação' | 'Fechado';
  value: number;
  owner_name: string | null;
  source: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationRow {
  id: string;
  workspace_id: string;
  type: string;
  name: string;
  is_active: boolean;
  trigger_count: number;
  conversion_rate: number;
  config: Record<string, Json>;
  created_at: string;
  updated_at: string;
}

export interface SessionNoteRow {
  id: string;
  workspace_id: string;
  author: string;
  note: string;
  context: Record<string, Json>;
  created_at: string;
}

export interface ChangelogEventRow {
  id: string;
  workspace_id: string | null;
  source: string;
  event_type: string;
  title: string;
  description: string | null;
  payload: Record<string, Json>;
  created_at: string;
}

export interface SupabaseSchema {
  public: {
    Tables: {
      workspaces: { Row: WorkspaceRow };
      knowledge_base: { Row: KnowledgeBaseRow };
      contacts: { Row: ContactRow };
      conversations: { Row: ConversationRow };
      deals: { Row: DealRow };
      automations: { Row: AutomationRow };
      session_notes: { Row: SessionNoteRow };
      changelog_events: { Row: ChangelogEventRow };
    };
  };
}
