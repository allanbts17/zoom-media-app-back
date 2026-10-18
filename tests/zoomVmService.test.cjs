const test = require('node:test');
const assert = require('node:assert/strict');
const {ZoomVmService} = require('../lib/services/zoomVmService');
const instance = 'https://compute.googleapis.com/compute/v1/projects/zoom-app-dev/zones/us-central1-a/instances/zoom-bot-vm';
const key = '11223344-5566-4788-99aa-bbccddeeff00';

test('start checks the fixed VM and forwards a deduplication UUID', async () => {
  const calls = [];
  const service = new ZoomVmService(async options => {
    calls.push(options); return options.method === 'GET' ? {status: 'TERMINATED'} : {name: 'operation-one', status: 'RUNNING'};
  });
  const result = await service.change('start', key);
  assert.equal(result.status, 202); assert.equal(result.data.status, 'PROVISIONING');
  assert.equal(calls[0].url, instance); assert.equal(calls[1].url, instance + '/start');
  assert.equal(calls[1].params.requestId, key);
});

test('already running or already stopping causes no duplicate command', async () => {
  for (const [state, action, httpStatus] of [['RUNNING','start',200], ['PROVISIONING','start',202], ['STOPPING','stop',202], ['TERMINATED','stop',200]]) {
    let calls = 0;
    const service = new ZoomVmService(async options => {calls++; assert.equal(options.method,'GET'); return {status: state};});
    const result = await service.change(action); assert.equal(result.status,httpStatus); assert.equal(result.data.no_op,true); assert.equal(calls,1);
  }
});

test('stop checks RUNNING and returns asynchronous progress', async () => {
  const methods = [];
  const service = new ZoomVmService(async options => { methods.push(options.method); return options.method === 'GET' ? {status:'RUNNING'} : {name:'operation-stop',status:'PENDING'}; });
  const result = await service.change('stop'); assert.deepEqual(methods,['GET','POST']); assert.equal(result.data.status,'STOPPING');
});

test('conflicting VM transitions are rejected', async () => {
  const service = new ZoomVmService(async () => ({status:'STOPPING'}));
  await assert.rejects(() => service.change('start'), e => e.status === 409 && e.code === 'VM_STATE_CONFLICT');
});

test('operation status includes GCE failure without leaking its raw message', async () => {
  const service = new ZoomVmService(async options => options.url.includes('/operations/') ? {name:'operation-bad',targetLink:instance,status:'DONE',error:{errors:[{code:'QUOTA_EXCEEDED',message:'private details'}]}} : {status:'TERMINATED'});
  const result = await service.state('operation-bad'); assert.equal(result.operation.error,'QUOTA_EXCEEDED'); assert.equal(result.operation.status,'DONE'); assert.equal(JSON.stringify(result).includes('private details'),false);
});

test('only an operation targeting this VM can be queried', async () => {
  const service = new ZoomVmService(async options => options.url.includes('/operations/') ? {targetLink: instance + '-other'} : {status:'RUNNING'});
  await assert.rejects(() => service.state('operation-other'), e => e.code === 'INVALID_VM_OPERATION');
});

test('path injection and invalid keys are rejected before contacting GCP', async () => {
  const service = new ZoomVmService(async () => {throw new Error('must not call');});
  await assert.rejects(() => service.state('../other'), e => e.code === 'INVALID_VM_OPERATION');
  await assert.rejects(() => service.change('start','not-a-uuid'), e => e.code === 'INVALID_IDEMPOTENCY_KEY');
});

test('IAM and upstream failures produce safe errors', async () => {
  for (const [status,code] of [[403,'VM_CONTROL_PERMISSION_DENIED'],[500,'VM_CONTROL_UNAVAILABLE'],[409,'VM_STATE_CONFLICT']]) {
    const service = new ZoomVmService(async () => {throw {response:{status},message:'secret'};});
    await assert.rejects(() => service.state(), e => e.code === code && !e.message.includes('secret'));
  }
});
