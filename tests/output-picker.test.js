import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../host.js';

function pickerRequest(capability, body, signal) {
  const routes = new Map();
  apply({
    effect: callback => callback(),
    get: name => name === 'directoryPicker' && capability ? { capability: () => capability } : undefined,
    connection: { fetch: { register: route => { routes.set(route.path, route.fetch); } } },
  });
  return routes.get('/api/pose-studio.output-directory-picker')(new Request('http://dsh/api/pose-studio.output-directory-picker', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal,
  }));
}

test('native chooser returns the selected Host path and preserves cancellation', async () => {
  const capability = { kind: 'native', pick: async signal => {
    assert.ok(signal instanceof AbortSignal);
    return 'D:\\AI图片';
  } };
  const chosen = await pickerRequest(capability, { action: 'open' });
  assert.equal(chosen.status, 200);
  assert.deepEqual(await chosen.json(), { kind: 'native', path: 'D:\\AI图片' });
  const cancelled = await pickerRequest({ kind: 'native', pick: async () => null }, { action: 'open' });
  assert.deepEqual(await cancelled.json(), { kind: 'native', path: null });
});

test('browse chooser lists and creates folders through the DSH capability', async () => {
  const listing = path => ({ path: path || '/home/user', entries: [], crumbs: [], truncated: false });
  let created;
  const capability = {
    kind: 'browse', list: async path => listing(path),
    createDirectory: async (path, name) => { created = [path, name]; return path + '/' + name; },
  };
  const initial = await pickerRequest(capability, { action: 'open' });
  assert.equal((await initial.json()).listing.path, '/home/user');
  const child = await pickerRequest(capability, { action: 'list', path: '/home/user/Pictures' });
  assert.equal((await child.json()).listing.path, '/home/user/Pictures');
  const fresh = await pickerRequest(capability, { action: 'create', path: '/home/user', name: '成图' });
  assert.deepEqual(created, ['/home/user', '成图']);
  assert.equal((await fresh.json()).listing.path, '/home/user/成图');
  const invalid = await pickerRequest(capability, { action: 'create', path: '/home/user', name: '../outside' });
  assert.equal(invalid.status, 400);
  const absent = await pickerRequest(undefined, { action: 'open' });
  assert.equal(absent.status, 503);
});
