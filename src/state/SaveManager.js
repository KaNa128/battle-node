// 单存档位 IndexedDB 封装：写入带上 saveVersion / schemaVersion，读取时做结构迁移。
// 只负责存取，不理解 RunState 语义；合并与校验由 RunController 与调用方负责。

const DB_NAME = 'wuxia-roguelike';
const STORE_NAME = 'saves';
const SLOT_KEY = 'run';

export const SAVE_VERSION = 1;
export const SAVE_SCHEMA_VERSION = 1;

export class SaveManager {
  constructor({
    idb = globalThis.indexedDB,
    dbName = DB_NAME,
    storeName = STORE_NAME,
    slotKey = SLOT_KEY,
    saveVersion = SAVE_VERSION,
    schemaVersion = SAVE_SCHEMA_VERSION,
  } = {}) {
    this.idb = idb;
    this.dbName = dbName;
    this.storeName = storeName;
    this.slotKey = slotKey;
    this.saveVersion = saveVersion;
    this.schemaVersion = schemaVersion;
    this.dbPromise = null;
    if (!this.idb) {
      console.warn('SaveManager: 当前环境不支持 IndexedDB，存档功能将不可用');
    }
  }

  async openDb() {
    if (!this.idb) throw new Error('SaveManager: 当前环境不支持 IndexedDB');
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = this.idb.open(this.dbName, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('SaveManager: 打开数据库失败'));
      });
    }
    return this.dbPromise;
  }

  async readRaw() {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const request = tx.objectStore(this.storeName).get(this.slotKey);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error ?? new Error('SaveManager: 读取存档失败'));
    });
  }

  async writeRaw(record) {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).put(record, this.slotKey);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error ?? new Error('SaveManager: 写入存档失败'));
    });
  }

  // 读取时统一迁移到当前 saveVersion；高版本存档直接拒绝，避免旧代码覆盖新数据。
  async load() {
    if (!this.idb) return null;
    const record = await this.readRaw();
    if (!record) return null;
    return this.migrate(record);
  }

  async save(record) {
    if (!record || typeof record !== 'object') {
      throw new Error('SaveManager.save: 存档必须是对象');
    }
    if (!this.idb) return null;
    return this.writeRaw({
      ...record,
      saveVersion: this.saveVersion,
      schemaVersion: this.schemaVersion,
      savedAt: Date.now(),
    });
  }

  async clear() {
    if (!this.idb) return false;
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).delete(this.slotKey);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error ?? new Error('SaveManager: 清空存档失败'));
    });
  }

  async exportJSON() {
    if (!this.idb) return null;
    const record = await this.readRaw();
    return record ? JSON.stringify(record, null, 2) : null;
  }

  async importJSON(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error(`SaveManager.importJSON: JSON 解析失败（${error.message}）`);
    }
    const migrated = this.migrate(parsed);
    return this.save(migrated);
  }

  migrate(record) {
    if (record === null || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error('SaveManager.migrate: 存档必须是对象');
    }

    const version = Number.isInteger(record.saveVersion) ? record.saveVersion : 0;
    if (version > this.saveVersion) {
      throw new Error(
        `SaveManager.migrate: 存档版本 ${version} 高于当前支持的 ${this.saveVersion}，请更新客户端`,
      );
    }

    let migrated = { ...record };
    if (version < 1) {
      // v0 旧结构：玩家字段直接挂在根上（runState），没有独立的 player / map。
      migrated.player = migrated.player ?? migrated.runState ?? null;
      migrated.seed = Number.isInteger(migrated.seed) ? migrated.seed : 20261118;
      migrated.floor = Number.isInteger(migrated.floor) && migrated.floor >= 1 ? migrated.floor : 1;
      migrated.floorSeed = migrated.floorSeed ?? null;
      migrated.nodeId = migrated.nodeId ?? null;
      migrated.map = migrated.map ?? null;
      delete migrated.runState;
      migrated.saveVersion = 1;
    }

    if (!migrated.player || typeof migrated.player !== 'object') {
      throw new Error('SaveManager.migrate: 存档缺少 player 数据');
    }
    if (!migrated.map || !Array.isArray(migrated.map.nodes) || !Array.isArray(migrated.map.rows)) {
      throw new Error('SaveManager.migrate: 存档缺少地图数据');
    }

    return migrated;
  }
}
