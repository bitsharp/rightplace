#!/usr/bin/env node
// Fails when a translation key exists in one language and not in the other (CLAUDE.md: IT + EN always complete).
const fs = require('fs');
const path = require('path');

const LANGUAGES = ['it', 'en'];
const NATIVE_NAMESPACE = 'native';

function flattenKeys(object, prefix = '') {
  return Object.entries(object).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === 'object' ? flattenKeys(value, fullKey) : [fullKey];
  });
}

function readValue(object, dottedKey) {
  return dottedKey
    .split('.')
    .reduce((node, part) => (node == null ? undefined : node[part]), object);
}

function allQualifiedKeys(locales) {
  const keys = new Set();
  for (const namespaces of Object.values(locales)) {
    for (const [namespace, content] of Object.entries(namespaces)) {
      flattenKeys(content).forEach((key) => keys.add(`${namespace}:${key}`));
    }
  }
  return [...keys];
}

function isTranslated(namespaces, qualifiedKey) {
  const [namespace, key] = qualifiedKey.split(':');
  const value = readValue(namespaces[namespace], key);
  return typeof value === 'string' && value.trim().length > 0;
}

function findMissingKeys(locales) {
  const keys = allQualifiedKeys(locales);
  return Object.entries(locales).flatMap(([language, namespaces]) =>
    keys.filter((key) => !isTranslated(namespaces, key)).map((key) => `${language}: ${key}`),
  );
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadLanguage(i18nDir, language) {
  const languageDir = path.join(i18nDir, language);
  const namespaces = Object.fromEntries(
    fs
      .readdirSync(languageDir)
      .filter((file) => file.endsWith('.json'))
      .map((file) => [path.basename(file, '.json'), readJson(path.join(languageDir, file))]),
  );
  namespaces[NATIVE_NAMESPACE] = readJson(path.join(i18nDir, NATIVE_NAMESPACE, `${language}.json`));
  return namespaces;
}

function loadProjectLocales(rootDir) {
  const i18nDir = path.join(rootDir, 'src', 'i18n');
  return Object.fromEntries(
    LANGUAGES.map((language) => [language, loadLanguage(i18nDir, language)]),
  );
}

function main() {
  const missing = findMissingKeys(loadProjectLocales(path.join(__dirname, '..')));
  if (missing.length === 0) {
    console.log('i18n: IT e EN complete.');
    return;
  }
  console.error(`i18n: ${missing.length} traduzioni mancanti:\n  ${missing.join('\n  ')}`);
  process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { findMissingKeys, flattenKeys, loadProjectLocales };
