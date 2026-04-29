import { browser } from '$app/environment';

const COOKIE_NAME = 'void_user_id';
const MAX_AGE = 60 * 60 * 24 * 365;

function readCookie(name: string) {
	const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
	return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
	document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function getOrCreateAnonymousUserId() {
	if (!browser) return '';

	const existing = readCookie(COOKIE_NAME);
	if (existing) return existing;

	const id = crypto.randomUUID();
	writeCookie(COOKIE_NAME, id);
	return id;
}
