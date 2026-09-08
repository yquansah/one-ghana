import type { SaaSEnv } from './env';
import { getSession, handleAuth, HttpError } from './auth';
import { handleCampaigns } from './campaigns';
import { handleResearch } from './research';
import { handleNotifications } from './notifications';

function secure(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  headers.set('Cache-Control','no-store');
  headers.set('X-Frame-Options','DENY');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
export async function handleRequest(request: Request, env: SaaSEnv): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === '/health') return secure(Response.json({status:'ok',environment:env.ENVIRONMENT,authConfigured:Boolean(env.APP_ORIGIN && env.WORKOS_CLIENT_ID && env.WORKOS_API_KEY && env.SESSION_ENCRYPTION_KEY),researchEnabled:env.RESEARCH_ENABLED==='true',emailEnabled:env.EMAIL_ENABLED==='true'}));
    if (!path.startsWith('/api/') && !path.startsWith('/auth/') && !path.startsWith('/unsubscribe')) return env.ASSETS.fetch(request);
    try {
      if (['POST','PATCH','PUT','DELETE'].includes(request.method) && request.body) {
        const maximum = path === '/api/email/webhook' ? 100_000 : 3_000_000;
        if (Number(request.headers.get('Content-Length')) > maximum) throw new HttpError(413,'Request is too large.');
        const reader = request.body.getReader(), chunks: Uint8Array[] = [];
        let length = 0;
        for (;;) {
          const {done,value} = await reader.read();
          if (done) break;
          length += value.length;
          if (length > maximum) { await reader.cancel(); throw new HttpError(413,'Request is too large.'); }
          chunks.push(value);
        }
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
        request = new Request(request,{method:request.method,body:bytes});
      }
      // Signed unsubscribe links and provider webhooks must work during an identity-provider outage.
      if (path === '/api/email/unsubscribe' || path === '/api/email/webhook') {
        const publicNotification = await handleNotifications(request,env,null);
        if (publicNotification) return secure(publicNotification);
      }
      const auth = await handleAuth(request,env);
      if (auth) return secure(auth);
      const session = await getSession(request,env);
      const notifications = await handleNotifications(request,env,session);
      if (notifications) return secure(notifications);
      if (!session) return secure(Response.json({error:'Sign in to continue.',code:'unauthenticated'},{status:401}));
      const campaign = await handleCampaigns(request,env,session);
      if (campaign) return secure(campaign);
      const research = await handleResearch(request,env,session);
      if (research) return secure(research);
      return secure(Response.json({error:'Endpoint not found.',code:'not_found'},{status:404}));
    } catch (error) {
      if (path === '/auth/callback' || path === '/auth/login') {
        const message = error instanceof HttpError ? error.message : 'Sign-in could not be completed. Please try again.';
        const escaped = message.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
        return secure(new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>One Ghana sign-in</title><main><h1>Sign-in needs another try</h1><p>${escaped}</p><p><a href="/">Return to One Ghana</a></p></main></html>`, { status: error instanceof HttpError ? error.status : 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'" } }));
      }
      if (error instanceof HttpError) return secure(Response.json({error:error.message,code:error.code},{status:error.status}));
      // Provider errors and database details must not reveal credentials or account data.
      console.error(JSON.stringify({event:'request_failed',path,errorType:error instanceof Error ? error.name : 'UnknownError'}));
      return secure(Response.json({error:'The service could not complete this request. Please retry.',code:'service_error'},{status:500}));
    }
  }
