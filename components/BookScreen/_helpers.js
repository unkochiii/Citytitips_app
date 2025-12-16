export function normalizeAuthor(a) {
    const username =
        a?.account?.username || a?.username || a?.name || "User";
    const avatar =
        a?.account?.avatar?.secure_url || a?.avatar?.secure_url || null;

    return { username, avatar };
}
