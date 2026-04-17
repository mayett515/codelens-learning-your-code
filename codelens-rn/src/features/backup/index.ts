/**
 * Public barrel for the backup feature. Outside consumers should import
 * only from here.
 */
export { exportBackup } from './export';
export type { ExportResult } from './export';

export { importBackup } from './import';
export type { ImportResult } from './import';

export { clearAllData } from './clear';
export type { ClearOptions } from './clear';

export { FORMAT_VERSION, SCHEMA_VERSION, APP_VERSION, ARCHIVE_EXT } from './format';

export { BackupSection } from './ui/BackupSection';
