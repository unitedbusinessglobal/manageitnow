// GST helpers for invoices. Rules here must be reviewed by a CA before launch.

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Basic GSTIN format check (15 chars). Does not call the GST portal. */
export function isValidGstin(gstin) {
  return typeof gstin === 'string' && GSTIN_RE.test(gstin.trim().toUpperCase());
}

/** State code is the first two digits of a GSTIN. */
export function stateCodeFromGstin(gstin) {
  return isValidGstin(gstin) ? gstin.trim().slice(0, 2) : null;
}

/**
 * Split GST for a taxable amount.
 * Same state as supplier -> CGST + SGST (half each); otherwise IGST.
 *
 * @param {number} taxablePaise
 * @param {string} supplierState  2-digit code
 * @param {string} placeOfSupply  2-digit code of the customer
 * @param {number} ratePercent    e.g. 18
 */
export function computeGst(taxablePaise, supplierState, placeOfSupply, ratePercent = 18) {
  if (!Number.isInteger(taxablePaise) || taxablePaise < 0) {
    throw new Error('taxablePaise must be a non-negative integer');
  }
  const intraState = Boolean(placeOfSupply) && supplierState === placeOfSupply;
  if (intraState) {
    const half = Math.round((taxablePaise * ratePercent) / 200);
    return {
      type: 'intra',
      cgstPaise: half,
      sgstPaise: half,
      igstPaise: 0,
      totalPaise: taxablePaise + 2 * half,
    };
  }
  const igst = Math.round((taxablePaise * ratePercent) / 100);
  return { type: 'inter', cgstPaise: 0, sgstPaise: 0, igstPaise: igst, totalPaise: taxablePaise + igst };
}

/** Indian financial year label for a date, e.g. 2026-11-05 -> "2026-27". */
export function financialYear(date = new Date()) {
  const y = date.getUTCFullYear();
  const start = date.getUTCMonth() >= 3 ? y : y - 1; // FY starts 1 April
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

/** Sequential invoice number, e.g. MIN/2026-27/000123 */
export function invoiceNumber(fy, sequence, prefix = 'MIN') {
  return `${prefix}/${fy}/${String(sequence).padStart(6, '0')}`;
}
