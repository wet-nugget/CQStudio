import { STORE_KEY, THEME_KEY, DATA_VERSION, BACKUP_VERSION, MAX_ICON_IMAGE, TYPES, DEFAULT_ICON, ICON_COLORS, letters, sampleQuiz } from './constants.js';
import { $, uid, escapeHtml, normalize, downloadMarkdownFile } from './utils.js';
import { loadState, migrateState, sanitizeQuestion, emptyState, saveState } from './storage.js';
import { exportAllData, extractImportState } from './dataBackup.js';

