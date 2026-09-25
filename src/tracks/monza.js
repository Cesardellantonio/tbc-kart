// Monza — kart-scale layout of the Autodromo Nazionale Monza (5.79 km GP circuit), driven clockwise at about 1:14.
// Laid on its side (real north points west): the real 2.16 × 1.26 km outline fits the hall far better that way than north-up (~1:16.6).
// Main straight → Rettifilo (R-L) → Curva Grande → Roggia (L-R) → Lesmo 1 & 2 → Serraglio with its bridge kink (L) →
// Ascari (L-R-L) → back straight parallel to the main straight → Parabolica (tight entry, radius opening out) → main straight.

const waypoints = [
  [18.14, 38.10],   // start / finish line, mid-way down the main straight
  [15.64, 38.10],   // main straight
  [-3.03, 38.10],
  [-21.70, 38.10],
  [-24.20, 38.10],  // braking for the Rettifilo
  [-26.81, 37.44],  // Variante del Rettifilo (R)
  [-28.80, 35.62],
  [-29.68, 33.08],
  [-29.72, 32.58],
  [-30.61, 30.04],  // Rettifilo (L)
  [-32.59, 28.22],
  [-35.20, 27.56],
  [-37.70, 27.56],
  [-41.70, 27.56],
  [-44.20, 27.56],
  [-48.37, 27.20],  // Curva Grande: long, fast right
  [-52.41, 26.11],
  [-56.20, 24.35],
  [-59.63, 21.95],
  [-62.59, 18.99],
  [-64.99, 15.56],
  [-66.75, 11.77],
  [-67.84, 7.73],
  [-68.27, 5.27],   // underpass straight
  [-69.49, -1.63],
  [-69.92, -4.09],
  [-71.17, -6.92],  // Variante della Roggia (L)
  [-73.58, -8.85],
  [-75.39, -9.70],
  [-77.32, -11.07], // Roggia (R)
  [-78.62, -13.05],
  [-79.60, -15.35],
  [-83.12, -23.63],
  [-84.09, -25.94],
  [-84.80, -29.08], // Lesmo 1
  [-84.36, -32.26],
  [-82.82, -35.09],
  [-80.39, -37.20],
  [-77.37, -38.32],
  [-74.91, -38.75],
  [-66.05, -40.31],
  [-63.59, -40.75],
  [-60.34, -40.69], // Lesmo 2
  [-57.36, -39.42],
  [-55.06, -37.13],
  [-53.66, -35.06], // Serraglio
  [-48.91, -28.01],
  [-44.16, -20.96],
  [-42.76, -18.89],
  [-41.20, -16.79], // Serraglio kink (L), under the bridge
  [-39.47, -14.83],
  [-37.73, -13.03],
  [-31.02, -6.07],
  [-24.30, 0.88],
  [-17.59, 7.83],
  [-15.85, 9.63],
  [-13.81, 11.16],  // Variante Ascari (L)
  [-11.39, 11.97],
  [-8.84, 11.98],
  [-6.87, 11.66],
  [-4.09, 11.71],   // Ascari (R)
  [-1.50, 12.71],
  [0.60, 14.53],
  [1.86, 16.08],
  [4.57, 18.24],    // Ascari (L)
  [7.94, 19.05],
  [10.44, 19.09],   // back straight
  [25.58, 19.36],
  [40.72, 19.62],
  [55.86, 19.89],
  [71.00, 20.15],
  [73.50, 20.19],
  [76.17, 20.77],   // Parabolica: tight entry
  [78.41, 22.33],
  [79.89, 24.63],
  [80.38, 27.31],
  [79.79, 30.57],   // Parabolica: radius opens
  [78.20, 33.47],
  [75.77, 35.72],
  [72.75, 37.08],
  [68.90, 37.84],   // Parabolica exit onto the main straight
  [64.98, 38.10],
  [62.48, 38.10],   // main straight
  [47.70, 38.10],
  [32.92, 38.10],
];

export default {
  id: 'monza',
  name: 'Monza',
  location: 'Italy',
  inspiredBy: 'Autodromo Nazionale Monza',
  blurb: 'Temple of speed: slipstream duels on two long straights, late braking into the Rettifilo and the Parabolica.',
  laps: 5,
  waypoints,
  startIndex: 0,
  width: 7,
};
