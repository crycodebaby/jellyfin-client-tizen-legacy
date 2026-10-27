'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { root } = require('./runtime-files.cjs');
const ref = process.argv[2] || 'HEAD';
if (!/^[A-Za-z0-9_./-]+$/.test(ref) || ref.startsWith('-')) throw new Error('Ungültige Git-Referenz.');

function git(...args) {
  return execFileSync('git', ['-c', `safe.directory=${root.replace(/\\/g, '/')}`, ...args], {
    cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024
  });
}

const commits = git('rev-list', '--reverse', ref).trim().split('\n').filter(Boolean);
const problems = [];
const privateAddress = /\b(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/;
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/
];
const textExtension = /\.(?:md|json|ya?ml|html|js|cjs|css|xml|svg|txt)$/i;
const forbiddenName = /(?:^|\/)(?:node_modules|\.build|\.buildResult|\.sign|\.private|test-results|playwright-report)(?:\/|$)|(?:^|\/)(?:\.env(?:\..*)?|\.envrc|\.npmrc|\.git-credentials|profiles\.xml|device-profile\.xml)$|\.(?:p12|pfx|p8|p7b|pem|key|cer|crt|jks|keystore|token|wgt|tpk|sqlite|sqlite3|log)$/i;

for (const commit of commits) {
  const emails = git('show', '-s', '--format=%ae%n%ce', commit).trim().split('\n');
  if (emails.some((email) => !/@users\.noreply\.github\.com$/i.test(email))) {
    problems.push(`${commit.slice(0, 8)}: Autor oder Committer nutzt keine GitHub-Noreply-Adresse.`);
  }
  const files = git('ls-tree', '-r', '-z', '--name-only', commit).split('\0').filter(Boolean);
  for (const file of files) {
    if (forbiddenName.test(file) && !file.endsWith('.env.example')) {
      problems.push(`${commit.slice(0, 8)}: Nicht zur Veröffentlichung vorgesehener Dateityp: ${file}`);
      continue;
    }
    if (!textExtension.test(file) && !['LICENSE', '.gitignore'].includes(path.posix.basename(file))) continue;
    const content = git('show', `${commit}:${file}`);
    if (privateAddress.test(content) || secretPatterns.some((pattern) => pattern.test(content))) {
      problems.push(`${commit.slice(0, 8)}: Mögliche private Netzwerkadresse oder Schlüssel in ${file}.`);
    }
  }
}
if (problems.length) {
  console.error(problems.join('\n'));
  console.error('Nicht veröffentlichen, bevor die betroffene Historie geprüft und bereinigt ist.');
  process.exitCode = 1;
} else {
  console.log(`Veröffentlichungsprüfung: ${commits.length} Commit(s) in ${ref} ohne erkannte private Adressen, Schlüsseldateien oder persönliche Commit-E-Mail-Adressen.`);
  console.log('Die automatisierte Prüfung ersetzt keine manuelle Durchsicht.');
}
