let database = null;
function db() {
    if (!database)
        database = new Promise((resolve, reject) => {
            const request = indexedDB.open('cf-ladder', 1);
            request.onupgradeneeded = () => request.result.createObjectStore('state');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    return database;
}
export async function readState() {
    const database = await db();
    return new Promise((resolve, reject) => {
        const request = database.transaction('state', 'readonly').objectStore('state').get('workspace');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
export async function writeState(value) {
    const database = await db();
    return new Promise((resolve, reject) => {
        const tx = database.transaction('state', 'readwrite');
        tx.objectStore('state').put(value, 'workspace');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}
