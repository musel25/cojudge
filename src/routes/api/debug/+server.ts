import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDebugState, debugContinue, debugStep, debugStop, debugSetBreakpoints, debugEval } from '$lib/runners/DebugRunner';

export const GET: RequestHandler = async ({ url }) => {
    const jobId = url.searchParams.get('jobId') || '';
    if (!jobId) {
        return json({ error: 'Missing jobId parameter' }, { status: 400 });
    }
    try {
        const state = await getDebugState(jobId);
        if (state.status === 'completed' || state.status === 'error') {
            console.log(`[debug] session ${jobId} reached terminal state: ${state.status}`);
        }
        return json(state);
    } catch (e: any) {
        console.error(`[debug] session ${jobId} error: ${e.message}`);
        return json({ error: e.message || 'Failed to get debug state' }, { status: 404 });
    }
};

export const POST: RequestHandler = async ({ request }) => {
    const { jobId, action, breakpoints, variable } = await request.json();

    if (!jobId || !action) {
        return json({ error: 'Missing jobId or action' }, { status: 400 });
    }

    const validActions = ['continue', 'step', 'stop', 'setBreakpoints', 'eval'];
    try {
        switch (action) {
            case 'continue':
                return json(await debugContinue(jobId));
            case 'step':
                return json(await debugStep(jobId));
            case 'stop':
                await debugStop(jobId);
                return json({ status: 'stopped' });
            case 'setBreakpoints':
                if (!Array.isArray(breakpoints)) {
                    return json({ error: 'breakpoints must be an array of line numbers' }, { status: 400 });
                }
                await debugSetBreakpoints(jobId, breakpoints);
                return json({ status: 'ok' });
            case 'eval':
                if (!variable || typeof variable !== 'string') {
                    return json({ error: 'Missing expression for eval action' }, { status: 400 });
                }
                return json(await debugEval(jobId, variable.trim()));
            default:
                return json({ error: `Invalid action '${action}'. Must be one of: ${validActions.join(', ')}` }, { status: 400 });
        }
    } catch (e: any) {
        return json({ error: e.message || 'Debug action failed' }, { status: 400 });
    }
};
