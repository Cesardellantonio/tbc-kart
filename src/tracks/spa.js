// Spa — kart-scale Circuit de Spa-Francorchamps (Belgium), traced from the real centreline at about 1:11,
// driven clockwise and turned to the broadcast map's orientation (La Source bottom-left); +X east, +Z south, metres.
// Pit straight → La Source hairpin → long run down to Eau Rouge / Raidillon → Kemmel → Les Combes → Malmédy →
// Rivage hairpin → Pouhon → Fagnes → Campus / Stavelot → Paul Frère → Blanchimont → Bus Stop chicane → start.

const waypoints = [
  [-66.3, 41.9],    // start / finish line
  [-69.5, 44.3],
  [-74.2, 48.0],    // La Source braking
  [-77.3, 50.5],
  [-80.4, 51.9],
  [-83.7, 51.9],
  [-86.7, 50.4],    // La Source (right hairpin)
  [-88.8, 47.7],
  [-89.5, 44.4],
  [-88.6, 41.2],
  [-86.8, 37.6],
  [-84.26, 34.72],  // straight run down past the old pits
  [-81.72, 31.84],
  [-79.18, 28.96],
  [-76.65, 26.07],
  [-74.11, 23.19],
  [-71.57, 20.31],
  [-69.03, 17.43],  // Eau Rouge (left)
  [-67.68, 15.33],
  [-66.66, 13.07],
  [-65.98, 11.04],
  [-65.41, 9.12],
  [-63.85, 5.01],
  [-62.07, 2.1],    // Raidillon (right)
  [-59.68, -0.33],
  [-56.79, -2.16],
  [-52.71, -3.78],
  [-50.5, -4.56],
  [-48.05, -5.78],  // top of Raidillon (left)
  [-45.85, -7.4],
  [-44.14, -9.01],
  [-40.44, -12.78],
  [-36.9, -16.38],
  [-35.26, -17.9],
  [-33.49, -19.27], // Kemmel kink (right)
  [-31.6, -20.46],
  [-29.6, -21.47],
  [-10.76, -29.93], // Kemmel straight
  [9.08, -38.84],
  [32.4, -49.3],
  [36.0, -51.0],    // end of the Kemmel: brake for Les Combes
  [39.62, -52.71],
  [43.23, -54.42],
  [45.15, -55.27],
  [47.15, -55.86],  // Les Combes (right)
  [49.52, -55.94],
  [51.8, -55.32],
  [53.8, -54.05],
  [55.31, -52.75],
  [56.83, -51.45],
  [58.69, -50.36],  // Les Combes (left)
  [60.81, -49.99],
  [62.92, -50.4],
  [65.25, -51.31],
  [67.58, -52.22],
  [69.67, -52.75],  // Malmédy (right)
  [71.84, -52.77],
  [73.94, -52.28],
  [75.87, -51.3],
  [77.51, -49.88],
  [80.87, -46.18],  // down to Rivage
  [82.38, -44.49],
  [83.81, -42.73],
  [85.05, -40.83],
  [86.0, -38.77],
  [86.51, -36.57],
  [86.47, -34.31],  // Rivage (right hairpin)
  [85.77, -32.16],
  [84.16, -30.18],
  [81.92, -28.97],
  [79.39, -28.72],
  [76.95, -29.45],
  [74.98, -31.07],
  [71.81, -34.94],
  [69.95, -36.6],   // left kink after Rivage
  [67.66, -37.61],
  [65.17, -37.86],
  [62.73, -37.33],
  [57.95, -35.48],
  [53.16, -33.62],  // downhill to Pouhon
  [48.38, -31.77],
  [43.6, -29.91],
  [38.81, -28.06],
  [34.03, -26.2],
  [31.81, -24.95],
  [29.91, -23.26],
  [28.41, -21.21],  // Pouhon, first apex (left)
  [27.38, -18.89],
  [26.85, -16.4],
  [26.74, -13.22],
  [26.81, -11.22],
  [27.13, -7.87],
  [27.68, -5.7],
  [28.59, -3.65],   // Pouhon, second apex (left)
  [29.84, -1.79],
  [31.4, -0.18],
  [33.21, 1.15],
  [35.21, 2.14],
  [38.42, 3.17],
  [51.83, 6.51],
  [56.2, 7.6],
  [59.11, 8.33],
  [61.72, 9.28],
  [64.06, 10.77],
  [65.8, 12.9],     // Fagnes (right)
  [66.51, 15.57],
  [66.33, 18.34],
  [65.57, 21.01],
  [64.84, 23.67],
  [64.89, 25.8],    // Fagnes (left)
  [65.69, 27.79],
  [67.14, 29.36],
  [69.51, 30.77],
  [73.95, 32.74],
  [78.39, 34.72],
  [81.07, 36.33],
  [82.67, 38.14],   // Campus (right)
  [83.5, 40.42],
  [83.44, 42.84],
  [82.42, 45.79],
  [81.32, 48.03],
  [80.23, 50.28],
  [78.48, 53.08],
  [76.6, 54.83],    // Stavelot (right)
  [74.27, 55.89],
  [71.72, 56.16],
  [68.46, 55.64],
  [64.29, 54.52],
  [60.66, 53.24],   // Courbe Paul Frère (right)
  [57.26, 51.42],
  [54.18, 49.1],
  [48.3, 43.9],
  [38.6, 32.4],
  [30.5, 21.8],     // Blanchimont (left)
  [21.3, 15.8],
  [13.0, 13.2],
  [8.53, 12.29],
  [3.96, 12.33],    // Blanchimont (left)
  [-0.49, 13.31],
  [-4.65, 15.19],
  [-8.78, 17.59],   // straight braking zone for the Bus Stop
  [-12.91, 20.0],
  [-17.03, 22.4],
  [-21.16, 24.81],
  [-25.29, 27.21],
  [-29.41, 29.62],
  [-31.13, 30.57],
  [-32.95, 31.29],  // Bus Stop chicane (right)
  [-34.89, 31.55],
  [-36.84, 31.3],
  [-38.66, 30.6],
  [-40.39, 29.66],
  [-42.13, 28.67],
  [-44.73, 27.47],  // Bus Stop chicane (left)
  [-46.57, 27.3],
  [-48.36, 27.76],
  [-50.75, 29.36],
  [-54.9, 32.7],    // pit straight
  [-59.05, 36.05],
  [-63.2, 39.4],
];

export default {
  id: 'spa',
  name: 'Spa',
  location: 'Belgium',
  inspiredBy: 'Circuit de Spa-Francorchamps',
  blurb: 'The epic: flat out up Eau Rouge, slipstream down the Kemmel and brave Blanchimont into the Bus Stop.',
  laps: 3,
  waypoints,
  startIndex: 0,
  width: 6.5, // one of the fastest layouts: room to run side by side through Eau Rouge and Blanchimont
};
