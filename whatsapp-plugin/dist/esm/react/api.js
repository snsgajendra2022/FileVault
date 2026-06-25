import axios from 'axios';
function resolveUserId(config) {
    if (config.userId)
        return String(config.userId);
    if (typeof localStorage === 'undefined')
        return null;
    const phone = localStorage.getItem('waLinkedPhone');
    if (phone)
        return phone.replace(/\D/g, '');
    return null;
}
export function createWaClient(config) {
    const client = axios.create({
        baseURL: config.apiUrl,
        timeout: 120000,
    });
    client.interceptors.request.use((req) => {
        const token = config.authToken ||
            (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
        if (token && !req.headers.Authorization) {
            req.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        }
        const uid = resolveUserId(config);
        if (uid)
            req.headers['X-User-Id'] = uid;
        return req;
    });
    return client;
}
export async function waGetStatus(c) {
    const res = await c.get('/api/whatsapp/status');
    return res.data;
}
export async function waStartLogin(c, force = false) {
    const res = await c.post('/api/whatsapp/login/start', { force });
    return res.data;
}
export async function waWaitLogin(c) {
    const res = await c.post('/api/whatsapp/login/wait', {});
    return res.data;
}
export async function waLogout(c) {
    await c.post('/api/whatsapp/logout', {});
}
export async function waBootstrap(c) {
    const res = await c.post('/api/whatsapp/bootstrap', {});
    return res.data;
}
export async function waMessages(c, limit = 50) {
    const res = await c.get('/api/whatsapp/messages', { params: { limit } });
    return res.data;
}
export async function waLinkAuth(c, phone) {
    await c.post('/api/whatsapp/link-auth', { phone: phone || undefined });
}
export async function waSyncProject(c, phone) {
    await c.post('/api/whatsapp/sync-project', { phone: phone || undefined, notify: false });
}
