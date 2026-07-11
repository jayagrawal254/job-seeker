const parseFrom = require('../../../src/utils/parseFrom');

describe('parseFrom util', () => {
    it('parses name and email correctly', () => {
        const result = parseFrom('Jay Agrawal <jay@example.com>');
        expect(result).toEqual({ name: 'Jay Agrawal', email: 'jay@example.com' });
    });

    it('parses name with extra spaces', () => {
        const result = parseFrom('  Jay Agrawal   <jay@example.com>  ');
        expect(result).toEqual({ name: 'Jay Agrawal', email: 'jay@example.com' });
    });

    it('parses just an email without name', () => {
        const result = parseFrom('jay@example.com');
        expect(result).toEqual({ email: 'jay@example.com' });
    });
    
    it('parses just an email enclosed in angle brackets', () => {
        const result = parseFrom('<jay@example.com>');
        expect(result).toEqual({ name: undefined, email: 'jay@example.com' });
    });

    it('handles undefined input gracefully', () => {
        const result = parseFrom(undefined);
        expect(result).toEqual({ email: 'undefined' });
    });
});
