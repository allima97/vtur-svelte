import Dexie, { type Table } from 'dexie';
import dexieCloud from 'dexie-cloud-addon';

/**
 * Interface para cache de permissões
 */
export interface PermissaoCache {
  id: string;
  userId: string;
  modulo: string;
  permissao: 'none' | 'view' | 'create' | 'edit' | 'delete' | 'admin';
  updatedAt: Date;
}

/**
 * Interface para cache de dados da API
 */
export interface APICache {
  id: string;
  key: string;
  data: unknown;
  timestamp: number;
  ttl: number;
}

/**
 * Interface para preferências do usuário
 */
export interface UserPreference {
  id: string;
  userId: string;
  key: string;
  value: unknown;
  updatedAt: Date;
}

/**
 * Database Dexie para VTUR
 */
export class VTURDatabase extends Dexie {
  permissoes!: Table<PermissaoCache>;
  apiCache!: Table<APICache>;
  preferences!: Table<UserPreference>;

  constructor() {
    super('vtur-db', { addons: [dexieCloud] });

    this.version(1).stores({
      permissoes: 'id, userId, modulo, [userId+modulo]',
      apiCache: 'id, key, timestamp',
      preferences: 'id, userId, key, [userId+key]'
    });
  }
}

/**
 * Instância singleton do banco
 */
export const db = new VTURDatabase();

/**
 * Configuração do Dexie Cloud (opcional)
 */
export async function initDexieCloud() {
  if (import.meta.env.VITE_DEXIE_CLOUD_URL) {
    await db.cloud.configure({
      databaseUrl: import.meta.env.VITE_DEXIE_CLOUD_URL
    });
  }
}

/**
 * Helper para cache de API com TTL
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = 5 * 60 * 1000 // 5 minutos padrão
): Promise<T> {
  const cached = await db.apiCache.get({ key });
  const now = Date.now();

  if (cached && now - cached.timestamp < cached.ttl) {
    return cached.data as T;
  }

  const data = await fetcher();
  
  await db.apiCache.put({
    id: `${key}-${now}`,
    key,
    data,
    timestamp: now,
    ttl: ttlMs
  });

  return data;
}

/**
 * Invalida cache por prefixo de chave
 */
export async function invalidateCache(prefix: string) {
  const items = await db.apiCache
    .filter((item) => item.key.startsWith(prefix))
    .toArray();
  
  await db.apiCache.bulkDelete(items.map((i) => i.id));
}
