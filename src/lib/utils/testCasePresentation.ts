export type TestCasePresentation = { title: string; code: string };

export function getTestCasePresentation(problem: any, testCase: any): TestCasePresentation | null {
    const runtime = testCase?.testDetails;
    if (typeof runtime?.title === 'string' && typeof runtime?.code === 'string') {
        return { title: runtime.title, code: runtime.code };
    }
    if (typeof testCase?.payload !== 'string') return null;
    try {
        const payload = JSON.parse(testCase.payload);
        if (Array.isArray(payload?.ops)) {
            return { title: 'Test operations', code: JSON.stringify(payload, null, 2) };
        }
        const id = payload?.test ?? payload?.check;
        const descriptions = problem?.testCaseDescriptions;
        if (typeof id !== 'string' || !descriptions || !Object.hasOwn(descriptions, id)) return null;
        const detail = descriptions[id];
        return typeof detail?.title === 'string' && typeof detail?.code === 'string'
            ? { title: detail.title, code: detail.code }
            : null;
    } catch {
        return null;
    }
}
