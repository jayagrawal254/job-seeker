// Hardcoded from recruiter-admin: src/models/location.js (locationList)
const locations = require('./locations.json');

const locationMap = locations.reduce((map, l) => {
    map[l.id] = l.name;
    return map;
}, {});

module.exports = { locations, locationMap };
