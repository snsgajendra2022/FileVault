import { apiRequest } from './http';

export type Invitation = {
  invitationId: number;
  inviterId?: number;
  invitedUserId?: number;
  status?: string;
  message?: string;
  createdAt?: string;
};

export type Connection = {
  connectionId: number;
  userId?: number;
  connectedUserId?: number;
  connectionType?: string;
  createdAt?: string;
};
 const API_URL = process.env.REACT_APP_API_URL;
export async function generateInvitationCode(userId?: number): Promise<{
  invitationCode: string;
  createdAt: string | null;
}> {
  const endpoint = userId
    ? `/api/invitation/generate?user_id=${encodeURIComponent(String(userId))}`
    : '/api/invitation/generate';
  const data: any = await apiRequest(endpoint, 'POST');
  const invitationCode: string =
    data?.invitationCode ?? data?.code ?? data?.invitation_code ?? '';
  const createdAt: string | null =
    data?.createdAt ?? data?.created_at ?? null;
  return { invitationCode, createdAt };
}

export async function sendInvitation(invitationCode: string, message?: string): Promise<void> {
  await apiRequest(`${API_URL}/api/invitation/send`, 'POST', {
    invitationCode,
    message,
  });
}

export async function getInvitations(): Promise<Invitation[]> {
  const data: any = await apiRequest(`${API_URL}/api/invitations`, 'GET');
  // backend may return an array or wrapped object; normalize to array
  if (Array.isArray(data)) return data as Invitation[];
  if (Array.isArray(data?.invitations)) return data.invitations as Invitation[];
  return [];
}

export async function acceptInvitation(invitationId: number, userId?: number): Promise<void> {
  const body: any = { invitationId };
  if (userId != null) body.userId = userId;
  await apiRequest(`${API_URL}/api/invitation/accept`, 'POST', body);
}

export async function rejectInvitation(invitationId: number): Promise<void> {
  await apiRequest(`${API_URL}/api/invitation/reject`, 'POST', { invitationId });
}

export async function getConnections(): Promise<Connection[]> {
  const data: any = await apiRequest('/connections', 'GET');
  if (Array.isArray(data)) return data as Connection[];
  if (Array.isArray(data?.connections)) return data.connections as Connection[];
  return [];
}

