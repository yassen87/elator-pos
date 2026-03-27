
/**
 * Format phone number to E.164 (removing leading 0, adding country code 20 for Egypt if missing)
 * @param {string} phone 
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
    let p = (phone || '').replace(/\D/g, ''); // Remove non-digits
    if (p.startsWith('00')) p = p.substring(2);
    if (p.startsWith('0')) p = p.substring(1);
    if (!p.startsWith('20') && p.length <= 11) p = '20' + p;
    return p;
};
