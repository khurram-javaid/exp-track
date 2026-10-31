const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

function isObjectId(value) {
    return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

function validText(value, maxLength) {
    return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function validAmount(value, minimum = 0.01) {
    return typeof value === 'number' && Number.isFinite(value) && value >= minimum &&
        value <= 100000000 && Math.abs(value * 100 - Math.round(value * 100)) < 1e-8;
}

module.exports = { emailPattern, monthPattern, isObjectId, validText, validAmount };
