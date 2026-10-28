export type TestCasePresentation = { title: string; code: string };

export function getTestCasePresentation(problem: any, testCase: any): TestCasePresentation | null {
    if (typeof testCase?.payload !== 'string') return null;
    try {
        const payload = JSON.parse(testCase.payload);
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
