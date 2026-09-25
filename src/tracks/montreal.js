// Montréal — kart-scale indoor layout of Circuit Gilles Villeneuve (Île Notre-Dame), driven clockwise.
// Pit straight → Virage Senna (T1 left, T2 long right hairpin) → T3–T4 → T5 kink → T6–T7 → T8–T9 →
// L'Épingle hairpin (T10) → the long Casino back straight → final chicane (T13 right, T14 left: Wall of
// Champions) → line. +X east, +Z south, metres; real map turned ~66° clockwise to fit the hall, ~1:9.

const waypoints = [
  [-38.0, 36.9],  //  0 start / finish — pit straight
  [-50.1, 45.8],
  [-57.8, 50.0],
  [-64.1, 52.5],  //  3 T1 Virage Senna (left)
  [-67.8, 55.0],
  [-70.4, 58.7],
  [-76.1, 64.4],  //  6 T2 Senna hairpin (right)
  [-84.1, 64.3],
  [-89.8, 58.6],
  [-89.7, 50.5],
  [-82.6, 33.7],
  [-80.3, 30.5],  // 11 T3 (right)
  [-77.0, 28.5],
  [-74.4, 27.1],  // 13 T4 (left)
  [-72.3, 24.9],
  [-67.6, 12.5],  // 15 T5 (right kink)
  [-65.5, 5.3],
  [-61.8, 0.3],
  [-56.5, -3.0],
  [-45.2, -8.3],
  [-41.9, -10.8], // 20 T6 (left)
  [-40.2, -14.5],
  [-40.3, -18.6],
  [-40.4, -23.2], // 23 T7 (right)
  [-38.7, -27.4],
  [-35.3, -30.4],
  [-22.4, -35.8],
  [-9.0, -41.3],
  [3.4, -45.1],
  [17.0, -47.8],  // 29 T8 (right)
  [21.1, -47.6],
  [24.7, -45.7],
  [28.3, -43.8],  // 32 T9 (left)
  [32.4, -43.6],
  [42.3, -46.1],
  [56.8, -52.9],
  [69.2, -58.7],
  [80.0, -63.9],
  [84.7, -64.4],  // 38 T10 L'Épingle hairpin (right)
  [88.6, -61.6],
  [89.8, -57.1],
  [87.7, -52.8],
  [78.1, -43.7],  // 42 Casino straight
  [68.5, -34.5],
  [58.9, -25.4],
  [46.1, -14.9],
  [29.9, -3.2],
  [13.7, 8.6],
  [2.3, 16.8],    // 48 T13 final chicane (right)
  [-1.8, 18.6],
  [-6.4, 18.5],
  [-10.9, 18.4],  // 51 T14 (left) — Wall of Champions
  [-15.1, 20.2],
  [-27.7, 29.4],
];

export default {
  id: 'montreal',
  name: 'Montréal',
  location: 'Canada',
  inspiredBy: 'Circuit Gilles Villeneuve',
  blurb: 'Island blast: long straights, late braking into the hairpin and chicanes — and the Wall of Champions.',
  laps: 4,
  waypoints,
  startIndex: 0,
  width: 6.5,
};
