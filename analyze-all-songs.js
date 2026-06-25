const { Pool } = require('pg');

const PROCESSING_URL = process.env.PROCESSING_SERVICE_URL || 'http://localhost:3100';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows: songs } = await pool.query(
    `SELECT id, title, bpm, musical_key FROM songs ORDER BY title`
  );

  console.log(`Found ${songs.length} songs to analyze via ${PROCESSING_URL}`);

  for (const song of songs) {
    console.log(`\nAnalyzing: ${song.title} (${song.id})`);
    console.log(`  Before: bpm=${song.bpm} key=${song.musical_key}`);

    try {
      const res = await fetch(`${PROCESSING_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: song.id, source: 'song' }),
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

  // Verify final DB state
  const { rows: final } = await pool.query(
    `SELECT title, bpm, musical_key, analysis_status FROM songs ORDER BY title`
  );
  console.log('\n=== Final songs state ===');
  for (const r of final) {
    console.log(`  ${r.title} | bpm=${r.bpm} | key=${r.musical_key} | status=${r.analysis_status}`);
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
