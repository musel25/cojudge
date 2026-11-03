import { emptyProgress, normalizeProgress, PROGRESS_KEYS, sameProgress, validateSnapshot, type ProgressSnapshot, type ServerProgressData } from './serverProgressData';

export const BASELINE_KEY = 'cojudge-vps-baseline-v1';
// The last write whose reply has not arrived. A slow link can time out the
// reply after the server has stored the write.
export const PENDING_KEY = 'cojudge-vps-pending-v1';
export type SyncStatus = { state: 'connecting' | 'saving' | 'saved' | 'pending' | 'error' | 'conflict'; savedAt?: string | null; message?: string };
type Options = {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  get: () => Promise<ProgressSnapshot>;
  put: (baseRevision: number, data: ServerProgressData) => Promise<{ conflict: boolean; snapshot: ProgressSnapshot }>;
  apply: (data: ServerProgressData) => void;
  status: (state: SyncStatus) => void;
};

export class ProgressSync {
  private busy = false;
  private conflict = false;
  constructor(private options: Options) {}

  private local(): ServerProgressData {
    return normalizeProgress(Object.fromEntries(PROGRESS_KEYS.map(key => [key, JSON.parse(this.options.storage.getItem(key) || '{}')])));
  }

  private baseline(): ProgressSnapshot | null {
    const raw = this.options.storage.getItem(BASELINE_KEY);
    return raw ? validateSnapshot(JSON.parse(raw)) : null;
  }

  // Accept the next server revision as this browser's own save when it holds
  // exactly the data of the write whose reply was lost.
  private adoptPending(remote: ProgressSnapshot): void {
    const raw = this.options.storage.getItem(PENDING_KEY);
    if (!raw) return;
    const pending = JSON.parse(raw) as { baseRevision: number; data: unknown };
    if (remote.revision === pending.baseRevision + 1 && sameProgress(remote.data, normalizeProgress(pending.data))) {
      this.options.storage.setItem(BASELINE_KEY, JSON.stringify(remote));
    }
    if (remote.revision > pending.baseRevision) this.options.storage.removeItem(PENDING_KEY);
  }

  private acknowledge(snapshot: ProgressSnapshot): void {
    this.options.storage.setItem(BASELINE_KEY, JSON.stringify(snapshot));
    this.options.status({ state: sameProgress(this.local(), snapshot.data) ? 'saved' : 'pending', savedAt: snapshot.savedAt });
  }

  private reportConflict(): void {
    this.conflict = true;
    this.options.status({ state: 'conflict', message: 'This browser and the server have different changes. Both copies are kept.' });
  }

  private async write(remote: ProgressSnapshot, data: ServerProgressData): Promise<void> {
    this.options.status({ state: 'saving' });
    this.options.storage.setItem(PENDING_KEY, JSON.stringify({ baseRevision: remote.revision, data }));
    const result = await this.options.put(remote.revision, data);
    this.options.storage.removeItem(PENDING_KEY);
    if (result.conflict) { this.reportConflict(); return; }
    this.conflict = false;
    this.acknowledge(result.snapshot);
  }

  async tick(): Promise<void> {
    if (this.busy || this.conflict) return;
    this.busy = true;
    try {
      const remote = validateSnapshot(await this.options.get());
      this.adoptPending(remote);
      // Read after the await, so typing or another tab's save during the
      // request cannot be mistaken for an empty or unchanged browser.
      const local = this.local();
      const base = this.baseline();
      if (base && base.revision > remote.revision) { this.reportConflict(); return; }
      if (remote.revision === 0) { await this.write(remote, local); return; }
      if (sameProgress(local, remote.data)) { this.acknowledge(remote); return; }
      if ((!base && emptyProgress(local)) || (base && sameProgress(local, base.data))) {
        this.options.apply(remote.data);
        this.acknowledge(remote);
      } else if (base && sameProgress(remote.data, base.data)) {
        await this.write(remote, local);
      } else {
        this.reportConflict();
      }
    } catch (error) {
      this.options.status({ state: 'error', message: error instanceof Error ? error.message : 'Server save failed.' });
    } finally { this.busy = false; }
  }

  async useServer(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const remote = validateSnapshot(await this.options.get());
      // A failed backup (for example quota exhaustion) aborts the restore.
      this.options.storage.setItem(`cojudge-vps-conflict-${Date.now()}`, JSON.stringify(this.local()));
      this.options.apply(remote.data);
      this.conflict = false;
      this.acknowledge(remote);
    } catch (error) {
      this.options.status({ state: this.conflict ? 'conflict' : 'error', message: error instanceof Error ? error.message : 'Restore failed.' });
    } finally { this.busy = false; }
  }

  async useBrowser(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const remote = validateSnapshot(await this.options.get());
      this.adoptPending(remote);
      const base = this.baseline();
      const local = this.local();
      if (base && base.revision === remote.revision && sameProgress(local, remote.data)) {
        this.conflict = false;
        this.acknowledge(remote);
      } else await this.write(remote, local);
    }
    catch (error) { this.options.status({ state: this.conflict ? 'conflict' : 'error', message: error instanceof Error ? error.message : 'Server save failed.' }); }
    finally { this.busy = false; }
  }
}
