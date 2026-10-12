import { STORE_KEY, THEME_KEY, DATA_VERSION, BACKUP_VERSION } from './constants.js';
import { downloadJsonFile } from './utils.js';
export function backupPayload(state){return {app:'CQStudio',name:'Offline Class & Quiz Studio',backupVersion:BACKUP_VERSION,exportedAt:new Date().toISOString(),storeKey:STORE_KEY,dataVersion:DATA_VERSION,state,theme:localStorage.getItem(THEME_KEY)||document.documentElement.dataset.theme||'light'};}
export function exportAllData(state){downloadJsonFile(backupPayload(state),`cqstudio-backup-${new Date().toISOString().slice(0,10)}.json`);}
export function extractImportState(parsed){if(parsed?.app==='CQStudio'&&parsed.state)return parsed.state;if(parsed?.state?.classes)return parsed.state;if(parsed?.classes)return parsed;throw new Error('This file does not look like a CQStudio backup.');}
