import pool from '@/database.ts';
import { v4 as uuidv4 } from 'uuid';

interface FileMetadata {
  originalName: string;
  mimeType: string;
  size: number;
  filename: string;
  path: string;
}

export interface SourceVideo extends FileMetadata {
  id: string;
  name?: string;
  duration?: number;
  created_at: Date;
  updated_at: Date;
}

export const createSourceVideo = async (
  file: FileMetadata,
  id?: string,
  duration: number = 0
): Promise<SourceVideo> => {
  const videoId = id || uuidv4();

  const result = await pool.query<SourceVideo>(
    `INSERT INTO discovery_showcase.source_video
     (id, original_name, mime_type, size, filename, path, duration)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [videoId, file.originalName, file.mimeType, file.size, file.filename, file.path, duration]
  );

  // CHANGE: Extract first element from array
  return result.rows[0];
};

export const getSourceVideo = async (
  id: string
): Promise<SourceVideo | undefined> => {
  const result = await pool.query<SourceVideo>(
    'SELECT * FROM discovery_showcase.source_video WHERE id = $1',
    [id]
  );

  // CHANGE: Extract first element or return undefined
  return result.rows[0];
};

export const findSourceVideosByOriginalName = async (
  originalName: string
): Promise<SourceVideo[]> => {
  const result = await pool.query<SourceVideo>(
    'SELECT * FROM discovery_showcase.source_video WHERE original_name ILIKE $1 ORDER BY created_at DESC',
    [`%${originalName}%`]
  );

  return result.rows;
};

export const findSourceVideosByOriginalNames = async (
  originalNames: string[]
): Promise<SourceVideo[]> => {
  if (originalNames.length === 0) {
    return [];
  }

  // Build a query with OR conditions for each name
  const whereClauses = originalNames.map((_, index) =>
    `original_name ILIKE $${index + 1}`
  ).join(' OR ');

  const query = `
    SELECT * FROM discovery_showcase.source_video
    WHERE ${whereClauses}
    ORDER BY created_at DESC
  `;

  // Prepend and append % for fuzzy matching on all names
  const values = originalNames.map(name => `%${name}%`);

  const result = await pool.query<SourceVideo>(
    query,
    values
  );

  return result.rows;
};

export const getSourceVideoByFilename = async (
  filename: string
): Promise<SourceVideo | undefined> => {
  const result = await pool.query<SourceVideo>(
    'SELECT * FROM discovery_showcase.source_video WHERE filename = $1',
    [filename]
  );

  // CHANGE: Extract first element or return undefined
  return result.rows[0];
};

export const getAllSourceVideos = async (): Promise<SourceVideo[]> => {
  const result = await pool.query<SourceVideo>(
    'SELECT * FROM discovery_showcase.source_video ORDER BY created_at DESC'
  );

  // CHANGE: Return entire array for multiple results
  return result.rows;
};

export const deleteSourceVideo = async (id: string): Promise<boolean> => {
  const result = await pool.query(
    'DELETE FROM discovery_showcase.source_video WHERE id = $1',
    [id]
  );

  return result.rowCount === 1;
};

export const deleteAllSourceVideos = async (): Promise<void> => {
  await pool.query('DELETE FROM discovery_showcase.source_video');
};

export const getSourceVideosByIds = async (ids: string[]): Promise<SourceVideo[]> => {
  if (ids.length === 0) {
    return [];
  }

  // Postgres "ANY" allows matching against an array of values efficiently
  const result = await pool.query<SourceVideo>(
    `SELECT * FROM discovery_showcase.source_video 
     WHERE id = ANY($1::uuid[]) 
     ORDER BY created_at DESC`,
    [ids]
  );

  return result.rows;
};

export const renameSourceVideo = async (
  id: string,
  name: string
): Promise<SourceVideo | undefined> => {
  const result = await pool.query<SourceVideo>(
    `UPDATE discovery_showcase.source_video
     SET name = $2,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, name]
  );

  return result.rows[0];
};