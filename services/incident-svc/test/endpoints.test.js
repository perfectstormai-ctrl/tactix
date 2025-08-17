const { test } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCmPlyG42R/VkCO\n3ydxUiHYwOlqQvjMIkjSXGkionzVAkzaNnqtOt2AM6PDQDAhwYFAbNMhIjV2cSLv\nXgaykxW8u9UhfIyV18X7pKnkmkHezpP6lbYRvvuxOsYGscW3qIjKkxOjGUp07tug\nSf+61K39WsxsCkQY72iqymHa7mV42vw8lnQnyt1ukIQIK9u3EV7+s74yIoIgD5Dc\nQPwqKgZjUPcu9z3wkWG9ftb9hP3/zOqfMdU05gyu+mDAz+athNX2gPUSqTSdxyCU\nXLGyaXVj6X5Uf3hLfkOR/g0hqAJ+Ja9ZUQAzKFobw7TS0pGVvGhMCfgBrbVLeEX5\n1zQIb9DPAgMBAAECggEADhQ/xTa5DXKFeVqB0Yssp0BACsoZ0XDH4EG7Fhe5YPE9\nOmMDXoXOBrj/RTgIiE6GJUNYjOvqQWbEfo3LUGoitnJL7KmXkgTAbv1OwoSj6a9u\n53mwl6EoJlk9aYmHUdrZ0ICTP0YswM/bCG14u6ueaDoKQ2e9K6vYhLpeF9E5a8b9\nzIDFZeAHOLjSTxUSgBKX2DgCFGIQBI+vcH/daeELIJQnKB2ZYpSazyiJhXZb59Uy\nzPtCzCHMnCv63cEUquY/x7qQW589NxYfjYjSAqyWqYWHTCIhm10+YCah16k/E0v+\nZtFP8i/yf7dbH5XHvr5U5m+qH4Vp/ukFyhQlwCS8XQKBgQDb0T9CNtitGUqvmWac\nDbcGyn9pf+CYPPA9nklVDAG1x3Zo10o8IPSBnPiAb4ABqOQZAINULX23y5CZW27t\nmz7zit6q3tYUh6KciiPEGEWheaBMyL2MIPu6lXSGzGVG7TfrwIaLvaMNUZi5HB51\nGvlGLx0qt0KLu1O33zHRcayiEwKBgQDBm5nk+PmXgAgxgWHbj9xVgCKkezwR2P0l\nw83cDUc41xwT3zGVtkOC7T4Le+TPs4/6gmaBiV/3qiH5+mzW7B+UaG9/xpOPhk3n\nwtxyu84+ZCBkRkL/ZlpdO91WF7fq1OXhr/eiezLmlgb31TIbFLXNL+D7eGghmdsH\niKF49GYN1QKBgH59Wjlv9h8lfqStUS5bdgaiX88FlugDqPrMKsaVsiY4MRsDR+Rx\n0kEDYrwFbVOHLDp24Rt/UeiBayPUSXDQ9NiQALGyqN4HbrtFgm9EyEyzAFsu6GPK\nVxB3ECbBV0YJGzS+BK5E4Z64ZXmfhKc+blLEqbP64IAnu3UDKlerYfuhAoGAZEC+\nn+KM2/ZgR8JHefo0jdGcHq/xmwxRiYyqvJfjmXtJ/sBEXNHUg6d1yVyOTz8b/wwn\nKEyKdSSUE22pjmEWuTKbCf85ycgx7yDoJkE5uvT+EO6RIs9NW5n0MvB1PBSiNQt5\nn5lL8jsdwJeVKpC+01FHnu/qe/u/f1cwxgFIF0ECgYBSAn3rIkq4YktXg0r+GWSs\nfVH3FiOQfFZpvIYAtVztsvXCh13YhNztLxqFT8MxlJpTfYYR6fdZZ/RqPOOUtKJb\nBWAF7W5DYygQzEUjVeo8C7jPplm3vaMpKtMNGTIVNIKqNw3WrtUQJ3xkWTErV236\neoVEMooDr2YHZZrbLtqq9w==\n-----END PRIVATE KEY-----`;
process.env.JWT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApj5chuNkf1ZAjt8ncVIh\n2MDpakL4zCJI0lxpIqJ81QJM2jZ6rTrdgDOjw0AwIcGBQGzTISI1dnEi714GspMV\nvLvVIXyMldfF+6Sp5JpB3s6T+pW2Eb77sTrGBrHFt6iIypMToxlKdO7boEn/utSt\n/VrMbApEGO9oqsph2u5leNr8PJZ0J8rdbpCECCvbtxFe/rO+MiKCIA+Q3ED8KioG\nY1D3Lvc98JFhvX7W/YT9/8zqnzHVNOYMrvpgwM/mrYTV9oD1Eqk0nccglFyxsml1\nY+l+VH94S35Dkf4NIagCfiWvWVEAMyhaG8O00tKRlbxoTAn4Aa21S3hF+dc0CG/Q\nzwIDAQAB\n-----END PUBLIC KEY-----`;
const token = jwt.sign({ sub: 'tester', roles: ['dispatcher'] }, PRIVATE_KEY, {
  algorithm: 'RS256',
});
const {
  createServer,
  getAttachments,
  getEvents,
  getObject,
} = require('../dist/index.js');

test('incident endpoints lifecycle', async () => {
  const server = createServer().listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  let res = await fetch(`${base}/incidents`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Outage', severity: 'low', description: 'desc' })
  });
  assert.strictEqual(res.status, 201);
  const created = await res.json();
  assert.equal(created.title, 'Outage');
  const id = created.id;

  res = await fetch(`${base}/incidents`);
  let list = await res.json();
  assert.strictEqual(list.length, 1);
  assert.equal(list[0].id, id);

  res = await fetch(`${base}/incidents/${id}`);
  const detail = await res.json();
  assert.equal(detail.id, id);

  res = await fetch(`${base}/incidents/${id}/comment`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ comment: 'hello' })
  });
  assert.strictEqual(res.status, 200);
  const afterComment = await res.json();
  assert.deepEqual(afterComment.comments, ['hello']);

  res = await fetch(`${base}/incidents/${id}/status`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: 'closed' })
  });
  assert.strictEqual(res.status, 200);
  const afterStatus = await res.json();
  assert.equal(afterStatus.status, 'closed');

  res = await fetch(`${base}/incidents?status=closed&q=Out`);
  list = await res.json();
  assert.strictEqual(list.length, 1);

  const form = new FormData();
  const fileContent = 'hello world';
  form.append('file', new Blob([fileContent]), 'README.md');
  res = await fetch(`${base}/incidents/${id}/attachments`, {
    method: 'POST',
    body: form,
  });
  assert.strictEqual(res.status, 201);
  const attachment = await res.json();
  const allAttachments = getAttachments();
  assert.strictEqual(allAttachments.length, 1);
  assert.equal(allAttachments[0].id, attachment.id);
  assert.equal(getObject(attachment.objectName).toString(), fileContent);
  const event = getEvents().find((e) => e.type === 'ATTACHMENT_ADDED');
  assert.ok(event);
  assert.equal(event.incidentId, id);

  server.close();
});
