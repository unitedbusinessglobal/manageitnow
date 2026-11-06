import { describe, it, expect } from 'vitest';
import { computeGst, isValidGstin, stateCodeFromGstin, financialYear, invoiceNumber } from '../lib/gst.js';

describe('computeGst', () => {
  it('splits CGST/SGST within the same state', () => {
    expect(computeGst(100000, '33', '33', 18)).toEqual({ type: 'intra', cgstPaise: 9000, sgstPaise: 9000, igstPaise: 0, totalPaise: 118000 });
  });
  it('charges IGST across states', () => {
    expect(computeGst(100000, '33', '29', 18)).toEqual({ type: 'inter', cgstPaise: 0, sgstPaise: 0, igstPaise: 18000, totalPaise: 118000 });
  });
});

describe('GSTIN', () => {
  it('accepts a well-formed GSTIN and reads its state', () => {
    expect(isValidGstin('33ABCDE1234F1Z5')).toBe(true);
    expect(stateCodeFromGstin('33ABCDE1234F1Z5')).toBe('33');
  });
  it('rejects a malformed GSTIN', () => {
    expect(isValidGstin('33ABC')).toBe(false);
  });
});

describe('invoice numbering', () => {
  it('uses the April–March financial year', () => {
    expect(financialYear(new Date('2026-11-05T00:00:00Z'))).toBe('2026-27');
    expect(financialYear(new Date('2027-02-01T00:00:00Z'))).toBe('2026-27');
    expect(financialYear(new Date('2027-04-01T00:00:00Z'))).toBe('2027-28');
  });
  it('pads the sequence', () => {
    expect(invoiceNumber('2026-27', 123)).toBe('MIN/2026-27/000123');
  });
});
