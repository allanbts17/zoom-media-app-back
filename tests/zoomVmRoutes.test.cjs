const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const admin = require('firebase-admin');
const {zoomVmService} = require('../lib/services/zoomVmService');

test('VM routes enforce Firebase identity and allowed UID before VM access', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(admin, 'auth');
  const previousAllowed = process.env.ZOOM_BOT_ALLOWED_UIDS;
  const originalState = zoomVmService.state; const originalChange = zoomVmService.change;
  let calls = 0;
  Object.defineProperty(admin,'auth',{configurable:true,value:()=>({verifyIdToken:async token=> {if(token==='bad') throw new Error(); return {uid: token};}})});
  process.env.ZOOM_BOT_ALLOWED_UIDS = 'allowed';
  zoomVmService.state = async () => {calls++; return {name:'zoom-bot-vm',status:'TERMINATED'};};
  zoomVmService.change = async action => {calls++; return {status:202,data:{name:'zoom-bot-vm',status:action==='start'?'PROVISIONING':'STOPPING'}};};
  const app = express(); app.use(express.json()); app.use('/zoom-bot',require('../lib/routes/zoomBot').default);
  const server = app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve));
  const base = `http://127.0.0.1:${server.address().port}/zoom-bot`;
  try {
    for(const path of ['/vm','/vm/start','/vm/stop']) {
      const method = path === '/vm' ? 'GET':'POST';
      for(const [token,status] of [[null,401],['bad',401],['other',403]]) {
        const reply = await fetch(base+path,{method,headers:token?{Authorization:'Bearer '+token}:{}}); assert.equal(reply.status,status);
      }
    }
    assert.equal(calls,0);
    for(const path of ['/vm','/vm/start','/vm/stop']) {
      const reply = await fetch(base+path,{method:path==='/vm'?'GET':'POST',headers:{Authorization:'Bearer allowed'}});
      assert.equal(reply.status,path==='/vm'?200:202);
    }
    assert.equal(calls,3);
  } finally {
    server.closeAllConnections(); await new Promise(resolve=>server.close(resolve));
    if(descriptor) Object.defineProperty(admin,'auth',descriptor); else delete admin.auth; zoomVmService.state=originalState; zoomVmService.change=originalChange;
    if(previousAllowed===undefined) delete process.env.ZOOM_BOT_ALLOWED_UIDS; else process.env.ZOOM_BOT_ALLOWED_UIDS=previousAllowed;
  }
});
