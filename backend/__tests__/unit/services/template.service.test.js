const path = require('path');
const fs = require('fs');
const templateService = require('../../src/services/template.service');

const TEMPLATES_PATH = path.join(__dirname, '..', '..', 'src', 'constants', 'templates.json');

describe('template.service', () => {
    let originalTemplates;

    beforeAll(() => {
        // Backup original templates to restore later
        if (fs.existsSync(TEMPLATES_PATH)) {
            originalTemplates = fs.readFileSync(TEMPLATES_PATH, 'utf8');
        } else {
            // Should not happen as we just copied it, but good to be safe
            fs.writeFileSync(TEMPLATES_PATH, JSON.stringify([]));
            originalTemplates = '[]';
        }
    });

    afterAll(() => {
        // Restore original templates
        fs.writeFileSync(TEMPLATES_PATH, originalTemplates);
    });

    it('loads templates from the JSON file', () => {
        const mockTemplates = [
            { id: 1, name: 'Template 1', subject: 'Subject 1', body: 'Body 1' },
            { id: 2, name: 'Template 2', subject: 'Subject 2', body: 'Body 2' }
        ];
        fs.writeFileSync(TEMPLATES_PATH, JSON.stringify(mockTemplates));

        const templates = templateService.getTemplates();
        expect(templates).toEqual(mockTemplates);
    });

    it('re-reads templates on each call (disables require cache)', () => {
        const mock1 = [{ id: 1, name: 'First' }];
        fs.writeFileSync(TEMPLATES_PATH, JSON.stringify(mock1));
        const res1 = templateService.getTemplates();
        expect(res1).toEqual(mock1);

        const mock2 = [{ id: 1, name: 'Second (Updated)' }];
        fs.writeFileSync(TEMPLATES_PATH, JSON.stringify(mock2));
        const res2 = templateService.getTemplates();
        expect(res2).toEqual(mock2);
    });
});
