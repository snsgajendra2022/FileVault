import api from '../client/axiosInstance';

export type PhotobookTemplateOption = {
  id: number;
  name: string;
  description: string;
  code?: string;
  isActive?: boolean;
};

export async function listPhotobookTemplates(): Promise<PhotobookTemplateOption[]> {
  const res = await api.get<{ templates?: unknown[]; total?: number }>('/api/photobook-templates');
  const raw = res.data?.templates;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t: any) => ({
      id: Number(t?.id),
      name: String(t?.name ?? ''),
      description: String(t?.description ?? ''),
      code: t?.code != null ? String(t.code) : undefined,
      isActive: t?.isActive !== false,
    }))
    .filter((t) => Number.isFinite(t.id) && t.name.length > 0 && t.isActive !== false);
}

