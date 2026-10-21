const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const admin = require('firebase-admin');
const {GoogleAuth} = require('google-auth-library');

test('list bots forwards status, limit and cursor and rejects malformed filters', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(admin, 'auth');
  const previousAllowed = process.env.ZOOM_BOT_ALLOWED_UIDS;
  const originalClient = GoogleAuth.prototype.getIdTokenClient;
  const calls = [];
  Object.defineProperty(admin, 'auth', {configurable:true, value:()=>({verifyIdToken:async()=>({uid:'allowed'})})});
  process.env.ZOOM_BOT_ALLOWED_UIDS = 'allowed';
  GoogleAuth.prototype.getIdTokenClient = async()=>({request:async options=>{
    calls.push(options.url); return {status:200,data:{items:[],next_cursor:null}};
  }});
  const app = express(); app.use('/zoom-bot', require('../lib/routes/zoomBot').default);
  const server = app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve));
  const base = `http://127.0.0.1:${server.address().port}/zoom-bot/bots`;
  const headers = {Authorization:'Bearer test'};
  try {
    const query = new URLSearchParams({status:'active',limit:'10',cursor:'a+b/=='});
    const filtered = await fetch(base+'?'+query, {headers});
    assert.equal(filtered.status,200);
    assert.deepEqual(await filtered.json(),{items:[],next_cursor:null});
    const forwarded = new URL(calls[0]);
    assert.equal(forwarded.pathname,'/v1/bots');
    assert.equal(forwarded.searchParams.get('status'),'active');
    assert.equal(forwarded.searchParams.get('cursor'),'a+b/==');
    assert.equal(forwarded.searchParams.get('limit'),'10');
    assert.equal((await fetch(base,{headers})).status,200);
    assert.equal(new URL(calls[1]).searchParams.has('status'),false);
    for (const [query,status] of [['status=invalid',422],['status=',422],['status=active&status=ended',400]]) {
      assert.equal((await fetch(base+'?'+query,{headers})).status,status);
    }
    assert.equal(calls.length,2);
    assert.equal((await fetch(base+'?status=active')).status,401);
  } finally {
    server.closeAllConnections(); await new Promise(resolve=>server.close(resolve));
    if(descriptor) Object.defineProperty(admin,'auth',descriptor); else delete admin.auth;
    GoogleAuth.prototype.getIdTokenClient = originalClient;
    if(previousAllowed===undefined) delete process.env.ZOOM_BOT_ALLOWED_UIDS; else process.env.ZOOM_BOT_ALLOWED_UIDS=previousAllowed;
  }
});
