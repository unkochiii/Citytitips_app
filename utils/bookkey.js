export function normalizeBookKey(key) {
    if (!key) return null;
    if (key.startsWith("/works/")) return key;
    return `/works/${key}`;
}

export function stripBookKey(key) {
    if (!key) return null;
    return key.replace("/works/", "");
}
