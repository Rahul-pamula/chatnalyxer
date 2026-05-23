import { proto } from '@whiskeysockets/baileys';
import { BufferJSON, initAuthCreds } from '@whiskeysockets/baileys';

/**
 * Custom PostgreSQL Auth State for Baileys
 * Stores authentication credentials in a 'whatsapp_sessions' table
 * 
 * schema:
 * CREATE TABLE IF NOT EXISTS whatsapp_sessions (
 *   session_id VARCHAR(128) NOT NULL,
 *   id VARCHAR(128) NOT NULL,
 *   data TEXT,
 *   PRIMARY KEY (session_id, id)
 * );
 */

export const usePostgresAuthState = async (pool, sessionId) => {
    // Ensure table exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_sessions (
            session_id VARCHAR(128) NOT NULL,
            id VARCHAR(128) NOT NULL,
            data TEXT,
            PRIMARY KEY (session_id, id)
        )
    `);

    const readData = async (type) => {
        try {
            const res = await pool.query(
                'SELECT data FROM whatsapp_sessions WHERE session_id = $1 AND id = $2',
                [sessionId, type]
            );
            return res.rows.length ? JSON.parse(res.rows[0].data, BufferJSON.reviver) : null;
        } catch (error) {
            console.error(`Error reading ${type} from DB:`, error);
            return null;
        }
    };

    const writeData = async (type, data) => {
        try {
            await pool.query(
                `INSERT INTO whatsapp_sessions (session_id, id, data) 
                 VALUES ($1, $2, $3)
                 ON CONFLICT (session_id, id) 
                 DO UPDATE SET data = $3`,
                [sessionId, type, JSON.stringify(data, BufferJSON.replacer)]
            );
        } catch (error) {
            console.error(`Error writing ${type} to DB:`, error);
        }
    };

    const removeData = async (type) => {
        try {
            await pool.query(
                'DELETE FROM whatsapp_sessions WHERE session_id = $1 AND id = $2',
                [sessionId, type]
            );
        } catch (error) {
            console.error(`Error removing ${type} from DB:`, error);
        }
    };

    const creds = (await readData('creds')) || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                tasks.push(writeData(key, value));
                            } else {
                                tasks.push(removeData(key));
                            }
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => {
            return writeData('creds', creds);
        },
        clearState: async () => {
            try {
                await pool.query('DELETE FROM whatsapp_sessions WHERE session_id = $1', [sessionId]);
                console.log(`🧹 Cleared PostgreSQL session data for ${sessionId}`);
            } catch (error) {
                console.error(`Error clearing session data:`, error);
            }
        }
    };
};
