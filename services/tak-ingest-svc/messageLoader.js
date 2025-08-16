const fs = require('fs').promises;
const path = require('path');
let S3Client, ListObjectsV2Command, GetObjectCommand;

async function streamToString(stream) {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

async function loadFromS3(bucket, prefixes) {
  if (!S3Client) {
    ({ S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3'));
  }
  const client = new S3Client();
  const messages = [];
  for (const prefix of prefixes) {
    const list = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix })
    );
    for (const obj of list.Contents || []) {
      const { Body } = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: obj.Key })
      );
      const json = JSON.parse(await streamToString(Body));
      const message = json.message || (json.ACMREQ && json.ACMREQ.message) || '';
      messages.push({ ...json, folder: prefix.replace(/\/$/, ''), message });
    }
  }
  return messages;
}

async function loadFromLocal(basePath, folders) {
  const messages = [];
  for (const folder of folders) {
    const dir = path.join(basePath, folder);
    const files = await fs.readdir(dir);
    for (const file of files.filter((f) => f.endsWith('.json'))) {
      const json = JSON.parse(await fs.readFile(path.join(dir, file), 'utf-8'));
      const message = json.message || (json.ACMREQ && json.ACMREQ.message) || '';
      messages.push({ ...json, folder, message });
    }
  }
  return messages;
}

module.exports = async function loadMessages() {
  const bucket = process.env.S3_BUCKET;
  const folders = ['NATO', 'Canada'];
  if (bucket) {
    return loadFromS3(bucket, folders.map((f) => `${f}/`));
  }
  const basePath = process.env.LOCAL_MESSAGE_DIR || path.join(__dirname, 'data');
  return loadFromLocal(basePath, folders);
};
