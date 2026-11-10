"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newId = exports.roomNames = exports.defaultTrim = exports.defaultWall = void 0;
exports.defaultWall = {
    colour: "#dedbd2",
    texture: "paint",
    sheen: "eggshell",
};
exports.defaultTrim = {
    profile: "flat",
    height: 0.1,
    projection: 0.016,
    colour: "#eeeae2",
    sheen: "satin",
};
exports.roomNames = {
    living: "Living room",
    bedroom: "Bedroom",
    kitchen: "Kitchen",
    dining: "Dining room",
    bathroom: "Bathroom",
    office: "Office",
    children: "Children’s room",
    entry: "Entry / hall",
    utility: "Utility / laundry",
};
const newId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
exports.newId = newId;
