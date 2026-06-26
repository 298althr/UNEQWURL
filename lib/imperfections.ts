import { query } from "./db";
import type { ImperfectionConfig, ImperfectionProfile } from "./imperfection-types";

export async function listProfiles(userId: string): Promise<ImperfectionProfile[]> {
  const { rows } = await query<ImperfectionProfile>(
    `select id, user_id, name, description, is_default, config, created_at, updated_at
     from imperfection_profiles
     where user_id = $1
     order by is_default desc, updated_at desc`,
    [userId]
  );
  return rows;
}

export async function getProfile(id: string, userId?: string): Promise<ImperfectionProfile | null> {
  const sql = userId
    ? `select id, user_id, name, description, is_default, config, created_at, updated_at
       from imperfection_profiles
       where id = $1 and user_id = $2`
    : `select id, user_id, name, description, is_default, config, created_at, updated_at
       from imperfection_profiles
       where id = $1`;
  const params = userId ? [id, userId] : [id];
  const { rows } = await query<ImperfectionProfile>(sql, params);
  return rows[0] ?? null;
}

export async function createProfile(
  userId: string,
  name: string,
  description: string | null,
  config: ImperfectionConfig,
  isDefault = false
): Promise<ImperfectionProfile> {
  const { rows } = await query<ImperfectionProfile>(
    `insert into imperfection_profiles (user_id, name, description, is_default, config)
     values ($1, $2, $3, $4, $5)
     returning id, user_id, name, description, is_default, config, created_at, updated_at`,
    [userId, name, description, isDefault, JSON.stringify(config)]
  );
  return rows[0];
}

export async function updateProfile(
  id: string,
  userId: string,
  updates: Partial<Pick<ImperfectionProfile, "name" | "description" | "is_default" | "config">>
): Promise<ImperfectionProfile | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (updates.name !== undefined) {
    sets.push(`name = $${i++}`);
    params.push(updates.name);
  }
  if (updates.description !== undefined) {
    sets.push(`description = $${i++}`);
    params.push(updates.description);
  }
  if (updates.is_default !== undefined) {
    sets.push(`is_default = $${i++}`);
    params.push(updates.is_default);
  }
  if (updates.config !== undefined) {
    sets.push(`config = $${i++}`);
    params.push(JSON.stringify(updates.config));
  }
  if (sets.length === 0) return getProfile(id, userId);

  sets.push(`updated_at = now()`);
  params.push(id, userId);

  const { rows } = await query<ImperfectionProfile>(
    `update imperfection_profiles
     set ${sets.join(", ")}
     where id = $${i++} and user_id = $${i++}
     returning id, user_id, name, description, is_default, config, created_at, updated_at`,
    params
  );
  return rows[0] ?? null;
}

export async function deleteProfile(id: string, userId: string): Promise<boolean> {
  const { rowCount } = await query(
    `delete from imperfection_profiles where id = $1 and user_id = $2`,
    [id, userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function createSession(
  userId: string,
  songId: string,
  profileId: string | null,
  consoleState: Record<string, unknown>,
  metrics: Record<string, unknown>
): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `insert into imperfection_sessions (user_id, profile_id, song_id, console_state, metrics)
     values ($1, $2, $3, $4, $5)
     returning id`,
    [userId, profileId, songId, JSON.stringify(consoleState), JSON.stringify(metrics)]
  );
  return rows[0].id;
}

export async function updateSessionMetrics(
  sessionId: string,
  userId: string,
  metrics: Record<string, unknown>
): Promise<boolean> {
  const { rowCount } = await query(
    `update imperfection_sessions
     set metrics = $1, updated_at = now()
     where id = $2 and user_id = $3`,
    [JSON.stringify(metrics), sessionId, userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function endSession(sessionId: string, userId: string): Promise<boolean> {
  const { rowCount } = await query(
    `update imperfection_sessions
     set ended_at = now(), updated_at = now()
     where id = $1 and user_id = $2`,
    [sessionId, userId]
  );
  return (rowCount ?? 0) > 0;
}
