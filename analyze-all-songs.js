const { Pool } = require('pg');

const PROCESSING_URL = process.env.PROCESSING_SERVICE_URL || 'http://localhost:3100';

async function analyzeTable(pool, table, source) {
  const { rows } = await pool.query(
    `SELECT id, title, bpm, musical_key, analysis_status FROM ${table} ORDER BY title`
  );

  console.log(`\nFound ${rows.length} ${source}(s) to analyze via ${PROCESSING_URL}`);

  for (const row of rows) {
    console.log(`\nAnalyzing: ${row.title} (${row.id})`);
    console.log(`  Before: bpm=${row.bpm} key=${row.musical_key} status=${row.analysis_status}`);

    try {
      const res = await fetch(`${PROCESSING_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: row.id, source }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.log(`  ERROR ${res.status}:`, data.error || data.detail || 'Unknown');
      } else {
        const feat = data.features || {};
        console.log(`  After:  bpm=${feat.bpm} key=${feat.musical_key} ${feat.key_mode} | status=${data.status}`);
      }
    } catch (e) {
      console.log(`  FAILED:`, e.message);
    }
  }

  const { rows: final } = await pool.query(
    `SELECT title, bpm, musical_key, analysis_status FROM ${table} ORDER BY title`
  );
  console.log(`\n=== Final ${source} state ===`);
  for (const r of final) {
    console.log(`  ${r.title} | bpm=${r.bpm} | key=${r.musical_key} | status=${r.analysis_status}`);
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  await analyzeTable(pool, 'songs', 'song');
  await analyzeTable(pool, 'user_uploads', 'upload');

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
