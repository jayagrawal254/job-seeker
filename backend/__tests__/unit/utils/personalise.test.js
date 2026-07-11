const personalise = require('../../../src/utils/personalise');

describe('personalise util', () => {
    it('replaces {{recname}} and {{organisation}} placeholders', () => {
        const template = 'Hi {{recname}}, from {{organisation}}!';
        const recruiter = { recname: 'John Doe', organisation: 'Google' };
        expect(personalise(template, recruiter)).toBe('Hi John Doe, from Google!');
    });

    it('is case-insensitive and handles spaces inside placeholders', () => {
        const template = 'Hi {{ RECNAME }}, from {{  OrGaniSation  }}!';
        const recruiter = { recname: 'John Doe', organisation: 'Google' };
        expect(personalise(template, recruiter)).toBe('Hi John Doe, from Google!');
    });

    it('replaces multiple occurrences', () => {
        const template = 'Hi {{recname}}. Your name is {{recname}}.';
        const recruiter = { recname: 'John Doe' };
        expect(personalise(template, recruiter)).toBe('Hi John Doe. Your name is John Doe.');
    });

    it('uses fallback values if recruiter or properties are missing', () => {
        const template = 'Hi {{recname}}, from {{organisation}}!';
        expect(personalise(template, null)).toBe('Hi there, from your company!');
        expect(personalise(template, {})).toBe('Hi there, from your company!');
    });

    it('handles undefined template input gracefully', () => {
        expect(personalise(undefined, null)).toBe('undefined');
    });
});
