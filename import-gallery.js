import { access, cp, mkdtemp, rename, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const target = fileURLToPath(new URL('./gallery', import.meta.url));
const input = process.argv[2];
if (!input) {
  console.error('用法：node import-gallery.js /你的/ai-pose-gallery-zh');
  process.exit(1);
}
const source = resolve(input);
const stage = await mkdtemp(join(dirname(target), '.gallery-import-'));
try {
  for (const entry of ['LICENSE', 'img', 'thumbs', 'data']) await access(join(source, entry));
  for (const entry of ['LICENSE', 'img', 'thumbs', 'data']) {
    await cp(join(source, entry), join(stage, entry), { recursive: true, errorOnExist: true, force: false });
  }
  await rename(stage, target);
  console.log('已导入本地图库。请重启 DSH Web。');
} catch (error) {
  console.error(error.code === 'ENOTEMPTY' || error.code === 'EEXIST'
    ? '图库已存在。更新前请先将 gallery 目录移走。' : error.message);
  process.exitCode = 1;
} finally {
  await rm(stage, { recursive: true, force: true });
}
