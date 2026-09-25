// Online multiplayer: protocol limits, send rates, clock sync, snapshot interpolation and the human
// liveries. Times are seconds unless marked otherwise. The room-code alphabet / length and the
// player cap live in config/lobby.js (the lobby card and the net layer must agree on them).

// Bump when a message changes shape: a host refuses a client that speaks another version.
export const PROTOCOL_VERSION = 1;
export const PEER_PREFIX = 'tbckart-'; // PeerJS id of a room's host = prefix + room code
export const CONNECT_TIMEOUT = 8; // s to reach the broker / the host (and hear its welcome)
export const MAX_MESSAGE = 8192; // bytes of JSON; anything longer is dropped unread

export const KART_RATE = 20; // Hz each human sends its own kart to the host
export const SNAP_RATE = 20; // Hz the host sends every kart's state to each client
export const STATE_LEN = 8; // kart state s: [x, z, yaw, vx, vz, steer, yawRate, slipAngle]
export const CONTROLS_LEN = 2; // kart controls c: [throttle, brake]
export const WORLD_LIMIT = 5000; // m: |x|, |z| beyond this is not a real kart position
export const SPEED_LIMIT = 100; // m/s (or rad/s): larger velocities / rates are garbage

// Heartbeat and clock: a client pings the host every PING_INTERVAL (a quick burst right after it
// joins, so the clock is good before anyone presses START); the host answers each ping.
export const PING_INTERVAL = 1; // s between pings
export const PING_BURST = 5; // pings sent at join…
export const PING_BURST_GAP = 0.1; // …this far apart (s)
export const CLOCK_WINDOW = 16; // most recent ping samples kept (older ones age out as clocks drift)
export const CLOCK_BEST = 3; // offset = median of the samples with the lowest round trip
export const SILENCE_TIMEOUT = 5; // s without a word from a peer before it counts as gone

// Remote karts are drawn this far in the past, between two snapshots, so a late packet rarely leaves
// a gap. Past the newest snapshot a kart coasts on its velocity for a moment, then freezes.
export const INTERP_DELAY = 0.1; // s behind the host clock
// Coasting covers a snapshot held up by a lost packet (resent a round trip later): along the kart's
// arc it drifts ~0.5 m in 0.35 s at the limit, where freezing a 25 m/s kart puts it metres behind.
export const EXTRAPOLATE_MAX = 0.35; // s of coasting past the newest snapshot
export const INTERP_BUFFER = 32; // snapshots kept per kart (1.6 s at 20 Hz)
// On a slow path (a kart relayed through the host, or ?netlag) snapshots arrive older than
// INTERP_DELAY, so each kart is drawn at least its typical snapshot age plus this margin behind…
export const INTERP_MARGIN = 0.06; // s (a bit more than one snapshot interval)
export const AGE_SMOOTHING = 0.1; // …where the age is averaged over snapshots at this rate (0..1)…
export const AGE_SPREAD = 3; // …plus this many mean deviations of it (uneven arrivals: loss, jitter)

export const START_LEAD = 1; // s between START and the shared countdown (every client hears it first)
export const RESULTS_GRACE = 20; // s after the first human's flag before results are final anyway

// Karts of the other humans. The host keeps the player's own yellow #07 (config/kart.js LIVERY); the
// others take these in join order. suit / stripe dress the driver like RIVALS in config/race.js.
export const HOST_LIVERY = { body: 0xffc21a, suit: 0x1d3557, stripe: 0xe63946, number: '07' };
export const HUMAN_LIVERIES = [
  { body: 0xf4f6fb, suit: 0x23252a, stripe: 0xe63946, number: '2' }, // white
  { body: 0x22d3ee, suit: 0x0b2545, stripe: 0xffffff, number: '3' }, // cyan
  { body: 0xff5fa2, suit: 0x2b2d42, stripe: 0xffffff, number: '44' }, // pink
  { body: 0x9be15d, suit: 0x1b4332, stripe: 0x111111, number: '63' }, // lime
  { body: 0x1d3557, suit: 0xf4f6fb, stripe: 0xffc21a, number: '77' }, // navy
];

// Dev / test only: ?netlag=ms delays everything this browser sends by that much (one way), and
// ?netloss=0..1 loses that share of messages. The channel is reliable and ordered, so a lost message
// is resent one round trip later and holds back the ones behind it — just like a real lossy link.
export const NETLAG_MAX = 2000; // ms
export const NETLOSS_MAX = 0.5; // share of messages
export const RESEND_MIN = 0.05; // s: the earliest a lost message is resent (a retransmit timer's floor)

// The game's side of an online race (app/online*.js). Contacts and slipstream against another driver's
// kart use where it is now, not where it is drawn (INTERP_DELAY and more in the past: a kart length or
// two at racing speed, enough for phantom bumps when following closely): its newest snapshot is
// dead-reckoned forward, for at most this long (a kart relayed through the host on a slow link arrives
// ~0.3 s old).
export const CONTACT_EXTRAPOLATE = 0.4; // s
// A remote kart's telemetry is rebuilt from its velocities, so it rolls, pitches, smokes and revs like
// a local one: the rear counts as sliding past this body slip angle, and the fore-aft acceleration
// (differentiated from 20 Hz snapshots, so steppy) is smoothed at this rate.
export const REMOTE_SLIDE_ANGLE = 0.12; // rad
export const REMOTE_ACCEL_RATE = 6; // 1/s
export const NOTICE_TIME = 3; // s a "DRIVER LEFT" / "HOST LEFT" notice stays up
