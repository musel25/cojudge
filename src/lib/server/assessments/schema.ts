export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type CaseKind = 'requirements' | 'state' | 'validation' | 'edge';

export interface TraceCase {
	id: string;
	kind: CaseKind;
	steps: { method: string; args: Json[]; expected: Json }[];
}

export interface Comprehension {
	method: string;
	questions: { prompt: string; choices: string[]; answer: number }[];
}

export interface Level {
	title: string;
	requirements: string;
	visible: TraceCase[];
	hidden: TraceCase[];
	comprehension?: Comprehension;
}

export interface Pack {
	schemaVersion: 1;
	id: string;
	title: string;
	summary: string;
	className: string;
	starter: string;
	levels: [Level, Level, Level, Level];
}

export const packId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_SOURCE_BYTES = 64 * 1024;
export const MAX_PACK_BYTES = 512 * 1024;

const identifier = /^[A-Za-z][A-Za-z0-9_]*$/;
const kinds: ReadonlySet<string> = new Set(['requirements', 'state', 'validation', 'edge']);

function record(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, max = 8_192): value is string {
	return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function jsonValue(value: unknown, depth = 0): value is Json {
	if (value === null || typeof value === 'boolean' || typeof value === 'string') return true;
	if (typeof value === 'number') return Number.isFinite(value) &&
		(!Number.isInteger(value) || Number.isSafeInteger(value));
	if (depth >= 16) return false;
	if (Array.isArray(value)) return value.every((item) => jsonValue(item, depth + 1));
	return record(value) && Object.values(value).every((item) => jsonValue(item, depth + 1));
}

function trace(value: unknown): value is TraceCase {
	return record(value) && text(value.id, 120) && typeof value.kind === 'string' && kinds.has(value.kind) &&
		Array.isArray(value.steps) && value.steps.length > 0 && value.steps.length <= 300 &&
		value.steps.every((step) => record(step) && text(step.method, 80) && identifier.test(step.method) &&
			Array.isArray(step.args) && jsonValue(step.args) && jsonValue(step.expected));
}

function comprehension(value: unknown): value is Comprehension {
	return record(value) && text(value.method, 80) && identifier.test(value.method) &&
		Array.isArray(value.questions) && value.questions.length === 4 &&
		value.questions.every((question) =>
			record(question) && text(question.prompt, 500) && Array.isArray(question.choices) &&
			question.choices.length >= 2 && question.choices.length <= 5 &&
			question.choices.every((choice) => text(choice, 500)) &&
			typeof question.answer === 'number' && Number.isInteger(question.answer) &&
			question.answer >= 0 && question.answer < question.choices.length
		);
}

function level(value: unknown): value is Level {
	return record(value) && text(value.title, 100) && text(value.requirements) &&
		[value.visible, value.hidden].every((cases) =>
			Array.isArray(cases) && cases.length > 0 && cases.length <= 30 && cases.every(trace) &&
			new Set(cases.map((item) => item.id)).size === cases.length
		) && (value.comprehension === undefined || comprehension(value.comprehension));
}

export function parsePack(value: unknown): Pack {
	if (!record(value) || value.schemaVersion !== 1 || !text(value.id, 80) || !packId.test(value.id) ||
		!text(value.title, 100) || !text(value.summary, 1_000) ||
		!text(value.className, 80) || !identifier.test(value.className) ||
		!text(value.starter, MAX_SOURCE_BYTES) || Buffer.byteLength(value.starter) > MAX_SOURCE_BYTES ||
		!Array.isArray(value.levels) || value.levels.length !== 4 || !value.levels.every(level)) {
		throw new Error('Invalid version 1 assessment pack.');
	}
	return value as unknown as Pack;
}
