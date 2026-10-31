function toMinorUnits(amount) {
    return Math.round(amount * 100);
}

function fromMinorUnits(amount) {
    return Number((amount / 100).toFixed(2));
}

module.exports = { toMinorUnits, fromMinorUnits };
