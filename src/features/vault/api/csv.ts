import type { Row } from '../../../lib/database.types';
export function csvRows(rows:unknown[][]):string{const cell=(value:unknown)=>`"${String(value??'').replace(/^\s*[=+@\-]|^[\t\r\n]/, "'$&").replaceAll('"','""')}"`;return rows.map(row=>row.map(cell).join(',')).join('\r\n');}
export function metadataCsv(files: Row<'files'>[]): string {
    const cell = (value: unknown) => `"${String(value ?? '').replace(/^\s*[=+@\-]|^[\t\r\n]/, "'$&").replaceAll('"', '""')}"`;
    return [['Name', 'Description', 'MIME', 'Bytes', 'Uploaded', 'Uploader', 'Folder'], ...files.map(file => [file.name, file.description, file.mime, file.size, file.created_at, file.created_by, file.folder_id])].map(row => row.map(cell).join(',')).join('\r\n');
}
