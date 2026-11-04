import { describe, expect, it } from 'vitest';
import { metadataCsv } from '../api/csv';
import type { Row } from '../../../lib/database.types';
describe('CSV metadata export', () => {
    it('quotes fields and neutralizes spreadsheet formulas', () => {
        const file = {
            name: '=HYPERLINK("https://evil.test")', description: 'A, useful "note"', mime: 'text/plain', size: 10, created_at: '2026-11-01', created_by: null, folder_id: null
        } as Row<'files'>;
        const csv = metadataCsv([file]);
        expect(csv).toContain('"\'=HYPERLINK(""https://evil.test"")"');
        expect(csv).toContain('"A, useful ""note"""');
    });
});
