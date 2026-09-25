// Online lobby card: what a name and a room code may contain, and how long UI feedback lasts.
// CODE_ALPHABET / CODE_LENGTH must match the room codes src/net makes (see the online design):
// no I, O, 0 or 1, so a code read aloud or off a phone screen can't be mistyped.

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5; // characters in a room code
export const NAME_MAX = 12; // characters in a driver name (the timing tower shows the 3-letter code)
export const NAME_KEY = 'tbc-kart.name'; // localStorage key for the remembered name
export const MAX_PLAYERS = 6; // grid size: humans + AI rivals
export const COPIED_TIME = 1.8; // s the COPY button says COPIED before it resets
