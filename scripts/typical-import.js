#!/usr/bin/env node
// Usage: npm run typical:import -- --city milano [--file path.csv]
// Loads the hand-curated "di solito" layer (CLAUDE.md principle 11) into venue_typical_busyness with
// source='manual' through the service_role-only RPC import_typical_manual (atomic, idempotent, never
// touches source='history'). Never use Google "Popular times" as a source.
const fs = require('fs');
const path = require('path');
const { readServiceEnv } = require('./lib/serviceEnv');

const TYPICAL_CSV_HEADER = 'google_place_id,weekday,hour_from,hour_to,level';
const CITY_SLUG = /^[a-z0-9-]+$/;

function parseImportArgs(argv) {
  let city;
  let file;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--city') city = argv[++i];
    else if (argv[i] === '--file') file = argv[++i];
    else throw new Error(`Argomento non riconosciuto: ${argv[i]}`);
  }
  if (city === undefined)
    throw new Error('Manca --city, es. `npm run typical:import -- --city milano`');
  if (!CITY_SLUG.test(city)) throw new Error(`Slug di città non valido: ${city}`);
  return {
    city,
    file: file ?? path.join(__dirname, '..', 'supabase', 'seed', `typical_busyness_${city}.csv`),
  };
}

function parseInteger(text) {
  return /^\d+$/.test(text) ? Number(text) : Number.NaN;
}

function rangeError(name, value, min, max) {
  return value >= min && value <= max ? null : `${name} deve essere un intero tra ${min} e ${max}`;
}

function validateRow(cells) {
  if (cells.length !== 5) return 'servono 5 colonne';
  const [placeId, ...numbers] = cells;
  const [weekday, hourFrom, hourTo, level] = numbers.map(parseInteger);
  if (placeId === '') return 'google_place_id vuoto';
  return (
    rangeError('weekday', weekday, 0, 6) ??
    rangeError('hour_from', hourFrom, 0, 23) ??
    rangeError('hour_to', hourTo, 0, 23) ??
    rangeError('level', level, 0, 3)
  );
}

function toRow([placeId, weekday, hourFrom, hourTo, level]) {
  return {
    google_place_id: placeId,
    weekday: Number(weekday),
    hour_from: Number(hourFrom),
    hour_to: Number(hourTo),
    level: Number(level),
  };
}

function parseTypicalCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), number: index + 1 }));
  const [header, ...body] = lines.filter(({ line }) => line !== '' && !line.startsWith('#'));
  if (!header || header.line !== TYPICAL_CSV_HEADER) {
    return { rows: [], errors: [`header non valido: atteso "${TYPICAL_CSV_HEADER}"`] };
  }
  const rows = [];
  const errors = [];
  for (const { line, number } of body) {
    const cells = line.split(',').map((cell) => cell.trim());
    const problem = validateRow(cells);
    if (problem) errors.push(`riga ${number}: ${problem}`);
    else rows.push(toRow(cells));
  }
  return { rows, errors };
}

// Both hours are inclusive. hour_to < hour_from crosses midnight: the hours after midnight belong
// to the next weekday (Saturday 6 → Sunday 0). On duplicated cells the last row wins.
function expandTypicalRows(rows) {
  const cells = new Map();
  for (const row of rows) {
    const end = row.hour_to < row.hour_from ? row.hour_to + 24 : row.hour_to;
    for (let absolute = row.hour_from; absolute <= end; absolute += 1) {
      const cell = {
        google_place_id: row.google_place_id,
        weekday: (row.weekday + Math.floor(absolute / 24)) % 7,
        hour: absolute % 24,
        level: row.level,
      };
      cells.set(`${cell.google_place_id}|${cell.weekday}|${cell.hour}`, cell);
    }
  }
  return [...cells.values()];
}

function buildImportRequest(env, citySlug, cells) {
  const { url, serviceRoleKey } = readServiceEnv(env);
  return {
    url: `${url}/rest/v1/rpc/import_typical_manual`,
    init: {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_city_slug: citySlug, p_rows: cells }),
    },
  };
}

async function main() {
  const { city, file } = parseImportArgs(process.argv.slice(2));
  const { rows, errors } = parseTypicalCsv(fs.readFileSync(file, 'utf8'));
  if (errors.length > 0) throw new Error(`CSV non valido:\n  ${errors.join('\n  ')}`);
  if (rows.length === 0) return console.log('Il CSV non ha righe: niente da importare.');

  const { url, init } = buildImportRequest(process.env, city, expandTypicalRows(rows));
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Import rifiutato (${body.message ?? response.status}); nessuna riga scritta.`);
  }
  const [counts] = body;
  console.log(`${city}: ${counts.venues} locali, ${counts.cells} celle orarie importate`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  TYPICAL_CSV_HEADER,
  buildImportRequest,
  expandTypicalRows,
  parseImportArgs,
  parseTypicalCsv,
};
