const { Pool } = require('pg');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Add bpm and musical_key columns to songs table if they don't exist
  await pool.query(`ALTER TABLE songs ADD COLUMN IF NOT EXISTS bpm NUMERIC`);
  await pool.query(`ALTER TABLE songs ADD COLUMN IF NOT EXISTS musical_key TEXT`);
  console.log('Added bpm and musical_key columns to songs table');

  // Backfill existing songs from audio_features (where available)
  const { rows: backfillRows } = await pool.query(
    `UPDATE songs s
     SET bpm = af.bpm,
         musical_key = CASE WHEN af.musical_key IS NOT NULL AND af.key_mode IS NOT NULL
                            THEN af.musical_key || ' ' || af.key_mode
                            ELSE af.musical_key END
     FROM audio_features af
     WHERE af.track_id = s.id::text AND af.track_source = 'song'
       AND (s.bpm IS NULL OR s.musical_key IS NULL)
     RETURNING s.id, s.title, s.bpm, s.musical_key`
  );
  console.log(`Backfilled ${backfillRows.length} songs from audio_features`);

  // Verify
  const { rows } = await pool.query(
    `SELECT s.id, s.title, s.bpm, s.musical_key, s.analysis_status
     FROM songs s
     ORDER BY s.title`
  );
  console.log('\n=== Songs after migration ===');
  for (const r of rows) {
    console.log(`  ${r.title} | bpm=${r.bpm} | key=${r.musical_key} | status=${r.analysis_status}`);
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
