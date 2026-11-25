import { isIPv4 } from 'node:net';

function isLoopback(address: string) {
	const ip = address.startsWith('::ffff:') ? address.slice(7) : address;
	return ip === '::1' || (isIPv4(ip) && ip.startsWith('127.'));
}

export function isLocalAssessmentClient(hostname: string, address: string) {
	const localHost = hostname === 'localhost' || hostname.endsWith('.localhost') ||
		isLoopback(hostname === '[::1]' ? '::1' : hostname);
	return localHost && isLoopback(address);
}
