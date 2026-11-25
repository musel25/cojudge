import { assessmentContext, catalog } from '$lib/server/assessments/catalog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	assessmentContext(event);
	event.setHeaders({ 'cache-control': 'no-store' });
	return { assessments: await catalog() };
};
