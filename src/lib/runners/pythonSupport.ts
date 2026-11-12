/** Enable an offline, pure-Python dependency archive supplied by a problem author. */
export async function withPythonDependencies(
    code: string,
    enabled: boolean,
    loadArchive: () => Promise<Buffer>
): Promise<{ code: string; archive?: Buffer }> {
    if (!enabled) return { code };
    const archive = await loadArchive();
    return {
        archive,
        code: "import sys as _cojudge_sys\nfrom pathlib import Path as _cojudge_Path\n" +
            "_cojudge_sys.path.insert(0, str(_cojudge_Path(__file__).with_name('python-libs.zip')))\n" + code
    };
}
