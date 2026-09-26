// Spielberg — kart-scale indoor layout of the Red Bull Ring (Austria), driven clockwise, north up, ~1:10 scale.
// Uphill start straight → T1 Niki Lauda (R) → long uphill straight with the T2 kink (L) → T3 Remus hairpin (R) →
// downhill straight → T4 Schlossgold (long R) → T5/T6 downhill lefts → T7/T8 Rauch/Würth (fast R) →
// T9 Jochen Rindt and T10 (R) back onto the start straight. +X east, +Z south, metres; list order = driving order.

const waypoints = [
  [20.48, 30.58], // start / finish line
  [17.40, 31.44],
  [7.98, 34.07],
  [-1.44, 36.69],
  [-4.53, 37.55], // T1 Niki Lauda (R)
  [-7.41, 37.87],
  [-10.25, 37.25],
  [-12.74, 35.76],
  [-14.63, 33.56],
  [-16.29, 30.82],
  [-22.77, 20.19],
  [-29.24, 9.55],
  [-35.71, -1.09],
  [-42.18, -11.73],
  [-43.84, -14.46], // T2 kink (L), uphill straight
  [-45.07, -16.35],
  [-46.39, -18.16],
  [-47.82, -19.90],
  [-49.38, -21.71],
  [-50.95, -23.51], // T3 Remus — entry
  [-52.56, -25.89],
  [-53.56, -28.59],
  [-53.89, -31.44],
  [-53.53, -34.29], // T3 Remus — hairpin
  [-52.51, -36.37],
  [-50.73, -37.84],
  [-48.50, -38.45],
  [-47.24, -38.52], // top straight, downhill
  [-44.96, -38.58],
  [-42.67, -38.51],
  [-40.39, -38.31],
  [-37.22, -37.94],
  [-23.84, -36.39],
  [-10.46, -34.83],
  [2.91, -33.27],
  [6.09, -32.90], // T4 Schlossgold (R)
  [8.78, -32.09],
  [11.02, -30.41],
  [12.54, -28.05],
  [13.16, -25.31],
  [12.79, -22.53],
  [11.49, -20.05], // T4 exit sweep (R)
  [8.82, -17.52],
  [5.90, -16.34],
  [2.74, -16.24],
  [-0.42, -16.71],
  [-8.59, -17.91],
  [-11.75, -18.37], // T5 (L)
  [-14.93, -18.33],
  [-17.94, -17.29],
  [-20.47, -15.36],
  [-22.26, -12.73],
  [-23.13, -9.67],
  [-23.01, -6.49],
  [-21.89, -3.52],
  [-20.42, -0.96],
  [-18.96, 1.60],
  [-17.50, 4.16], // T6 (L)
  [-15.50, 6.47],
  [-12.78, 7.87],
  [-9.74, 8.15],
  [-6.81, 7.26],
  [-4.43, 5.34],
  [-3.77, 4.55], // T7 Rauch (R)
  [-2.16, 2.89],
  [-0.32, 1.48],
  [1.69, 0.36],
  [4.01, -0.73],
  [6.32, -1.81], // T8 Würth (R)
  [8.40, -2.61],
  [10.58, -3.12],
  [12.80, -3.31],
  [16.00, -3.37],
  [30.05, -3.64],
  [44.10, -3.90],
  [47.30, -3.96], // T9 Jochen Rindt (R)
  [50.13, -3.65],
  [52.79, -2.61],
  [55.09, -0.93],
  [56.89, 1.29],
  [58.05, 3.90],
  [58.90, 6.76],
  [59.76, 9.63], // T10 (R) onto the start straight
  [60.15, 12.62],
  [59.59, 15.57],
  [58.13, 18.20],
  [55.93, 20.25],
  [53.19, 21.50],
  [50.11, 22.36],
  [36.84, 26.04],
  [23.56, 29.72],
];

export default {
  id: 'spielberg',
  name: 'Spielberg',
  location: 'Austria',
  inspiredBy: 'Red Bull Ring',
  blurb: 'Short and punchy: three big straights, three big stops, and the Remus hairpin begging for a late lunge.',
  laps: 5,
  waypoints,
  startIndex: 0,
};
