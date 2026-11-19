import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readmePath = path.join(repositoryRoot, 'README.md');
const startMarker = '<!-- AUTO-LOG-START -->';
const endMarker = '<!-- AUTO-LOG-END -->';

function git(args) {
  return execFileSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
}

function formatHongKongTime(isoDate) {
  return new Intl.DateTimeFormat('zh-HK', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(isoDate));
}

function escapeTableCell(value) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('|', '\\|')
    .replaceAll('\r', ' ')
    .replaceAll('\n', ' ');
}

function formatFileList(files) {
  if (files.length === 0) return '—';
  return files
    .map((file) => `\`${escapeTableCell(file).replaceAll('`', '\\`')}\``)
    .join('<br>');
}

const logOutput = git([
  'log',
  '-8',
  '--format=%H%x00%aI%x00%s%x00',
]);
const fields = logOutput.split('\0');
const commits = [];

for (let index = 0; index + 2 < fields.length; index += 3) {
  const hash = (fields[index] ?? '').trim();
  const date = (fields[index + 1] ?? '').trim();
  const subject = (fields[index + 2] ?? '').trim();

  // Accept only complete Git SHA-1 or SHA-256 hashes before passing them to git.
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(hash)) {
    if (hash || date || subject) {
      console.warn(`略過格式無效嘅提交雜湊：${JSON.stringify(hash)}`);
    }
    continue;
  }
  if (!date) {
    console.warn(`略過缺少提交時間嘅紀錄：${hash}`);
    continue;
  }

  commits.push({ hash, date, subject });
}

const rows = commits.map(({ hash, date, subject }) => {
  const fileOutput = git([
    'diff-tree',
    '--root',
    '--no-commit-id',
    '--name-only',
    '-r',
    '-z',
    hash,
  ]);
  const files = fileOutput
    .split('\0')
    .filter((file) => file && file !== 'README.md');

  return `| ${formatHongKongTime(date)} | ${escapeTableCell(subject || '（沒有提交備註）')} | ${formatFileList(files)} |`;
});

const table = [
  '| 更新時間（香港時間） | 改動說明 | 改動咗邊幾個檔案 |',
  '| --- | --- | --- |',
  ...(rows.length > 0 ? rows : ['| — | 暫時沒有提交紀錄 | — |']),
].join('\n');

const logSection = `${startMarker}\n\n${table}\n\n${endMarker}`;
let readme = readFileSync(readmePath, 'utf8');
const startIndex = readme.indexOf(startMarker);
const endIndex = readme.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
  readme = `${readme.slice(0, startIndex)}${logSection}${readme.slice(endIndex + endMarker.length)}`;
} else {
  const separator = readme.trimEnd().length > 0 ? '\n\n---\n\n' : '';
  readme = `${readme.trimEnd()}${separator}${logSection}\n`;
}

writeFileSync(readmePath, readme, 'utf8');
console.log(`已更新 README.md：記錄最近 ${commits.length} 筆提交。`);
