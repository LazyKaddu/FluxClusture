export function generateRoomId() {
    return crypto.randomUUID(); 
}



export function generateSecureShortId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    // Use the Web Crypto API for true randomness rather than Math.random()
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);
    
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[randomValues[i] % chars.length];
    }
    return result;
}



export async function generateFileHash(arrayBuffer) {
    // 1. Use the native Web Crypto API to digest the buffer
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    
    // 2. Convert the raw binary buffer to a byte array
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    // 3. Convert bytes to a readable hex string
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
}