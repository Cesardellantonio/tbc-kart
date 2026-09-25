// Interlagos — kart-scale Autódromo José Carlos Pace (São Paulo), traced from the real map and driven anticlockwise.
// Curved uphill pit straight → Senna S (T1 left, T2 right) → Curva do Sol → Reta Oposta → Descida do Lago (T4, T5 left)
// → Ferradura (double right) → Laranjinha (R) → Pinheirinho (L) → Bico de Pato hairpin (R) → Mergulho (L) → Junção (L)
// → the flat-out left climb of the Subida dos Boxes to the line. +X east, +Z south (north up), metres, list order.

const waypoints = [
  [-36.08, 28.70], // START / FINISH
  [-34.25, 33.93], // pit straight
  [-29.71, 46.92], // pit straight
  [-25.17, 59.92], // T1 Senna S (L R6.5, 110°)
  [-24.19, 61.74], // T1 Senna S (L R6.5, 110°)
  [-22.68, 63.16], // T1 Senna S (L R6.5, 110°)
  [-20.80, 64.03], // T1 Senna S (L R6.5, 110°)
  [-18.75, 64.27], // T1 Senna S (L R6.5, 110°)
  [-16.72, 63.85], // T1 Senna S (L R6.5, 110°)
  [-14.93, 62.82], // T1 Senna S (L R6.5, 110°)
  [-12.06, 60.48], // T2 Senna S (R R7, 64°)
  [-10.40, 59.48], // T2 Senna S (R R7, 64°)
  [-8.53, 58.97], // T2 Senna S (R R7, 64°)
  [-6.58, 58.99], // T2 Senna S (R R7, 64°)
  [-4.72, 59.55], // T2 Senna S (R R7, 64°)
  [0.22, 61.81], // T3 Curva do Sol (L R20, 98°)
  [6.81, 63.55], // T3 Curva do Sol (L R20, 98°)
  [13.60, 62.98], // T3 Curva do Sol (L R20, 98°)
  [19.81, 60.16], // T3 Curva do Sol (L R20, 98°)
  [24.71, 55.42], // T3 Curva do Sol (L R20, 98°)
  [27.73, 49.31], // T3 Curva do Sol (L R20, 98°)
  [31.96, 35.02], // Reta Oposta
  [36.18, 20.73], // Reta Oposta
  [40.41, 6.45], // Reta Oposta
  [44.64, -7.84], // Reta Oposta
  [48.87, -22.12], // T4 Descida do Lago (L R7, 107°)
  [49.15, -24.28], // T4 Descida do Lago (L R7, 107°)
  [48.76, -26.42], // T4 Descida do Lago (L R7, 107°)
  [47.74, -28.34], // T4 Descida do Lago (L R7, 107°)
  [46.17, -29.85], // T4 Descida do Lago (L R7, 107°)
  [44.22, -30.80], // T4 Descida do Lago (L R7, 107°)
  [42.06, -31.11], // T4 Descida do Lago (L R7, 107°)
  [27.81, -30.92], // T5 Descida do Lago (L R14, 49°)
  [23.86, -30.29], // T5 Descida do Lago (L R14, 49°)
  [20.25, -28.57], // T5 Descida do Lago (L R14, 49°)
  [17.27, -25.90], // T5 Descida do Lago (L R14, 49°)
  [8.03, -14.88], // run to Ferradura
  [-1.20, -3.85], // run to Ferradura
  [-10.43, 7.18], // T6 Ferradura (R R8, 48°)
  [-12.08, 8.67], // T6 Ferradura (R R8, 48°)
  [-14.08, 9.65], // T6 Ferradura (R R8, 48°)
  [-16.27, 10.04], // T6 Ferradura (R R8, 48°)
  [-21.41, 10.23], // T7 Ferradura (R R10, 85°)
  [-24.35, 9.90], // T7 Ferradura (R R10, 85°)
  [-27.07, 8.72], // T7 Ferradura (R R10, 85°)
  [-29.33, 6.80], // T7 Ferradura (R R10, 85°)
  [-30.92, 4.30], // T7 Ferradura (R R10, 85°)
  [-31.71, 1.45], // T7 Ferradura (R R10, 85°)
  [-32.53, -5.27], // T8 Laranjinha (R R6, 124°)
  [-32.47, -7.12], // T8 Laranjinha (R R6, 124°)
  [-31.84, -8.86], // T8 Laranjinha (R R6, 124°)
  [-30.72, -10.33], // T8 Laranjinha (R R6, 124°)
  [-29.20, -11.39], // T8 Laranjinha (R R6, 124°)
  [-27.43, -11.93], // T8 Laranjinha (R R6, 124°)
  [-25.58, -11.91], // T8 Laranjinha (R R6, 124°)
  [-23.83, -11.33], // T8 Laranjinha (R R6, 124°)
  [-21.17, -9.96], // T9 Pinheirinho (L R6, 122°)
  [-19.44, -9.39], // T9 Pinheirinho (L R6, 122°)
  [-17.62, -9.35], // T9 Pinheirinho (L R6, 122°)
  [-15.87, -9.87], // T9 Pinheirinho (L R6, 122°)
  [-14.36, -10.88], // T9 Pinheirinho (L R6, 122°)
  [-13.22, -12.31], // T9 Pinheirinho (L R6, 122°)
  [-12.57, -14.00], // T9 Pinheirinho (L R6, 122°)
  [-12.45, -15.82], // T9 Pinheirinho (L R6, 122°)
  [-12.75, -18.30], // T9 Pinheirinho exit (L R6, 41°)
  [-13.96, -20.84], // T9 Pinheirinho exit (L R6, 41°)
  [-20.67, -27.46], // to Bico
  [-26.94, -33.52], // Bico approach (R R8.5, 34°)
  [-28.46, -35.51], // Bico approach (R R8.5, 34°)
  [-29.35, -37.91], // Bico approach (R R8.5, 34°)
  [-29.46, -40.01], // T10 Bico de Pato (R R6.5, 73°)
  [-28.92, -42.00], // T10 Bico de Pato (R R6.5, 73°)
  [-27.77, -43.72], // T10 Bico de Pato (R R6.5, 73°)
  [-26.15, -44.99], // T10 Bico de Pato (R R6.5, 73°)
  [-24.20, -45.69], // T10 Bico de Pato (R R6.5, 73°)
  [-22.14, -45.75], // T10 Bico de Pato (R R6.5, 73°)
  [-20.16, -45.16], // T10 Bico de Pato (R R6.5, 73°)
  [-18.47, -43.97], // T10 Bico de Pato (R R6.5, 73°)
  [-9.52, -35.30], // T11 Mergulho (L R11, 98°)
  [-6.44, -33.19], // T11 Mergulho (L R11, 98°)
  [-2.82, -32.24], // T11 Mergulho (L R11, 98°)
  [0.90, -32.55], // T11 Mergulho (L R11, 98°)
  [4.30, -34.09], // T11 Mergulho (L R11, 98°)
  [7.00, -36.68], // T11 Mergulho (L R11, 98°)
  [12.24, -43.81], // to Junção
  [17.49, -50.95], // T12 Junção (L R7, 109°)
  [18.50, -52.92], // T12 Junção (L R7, 109°)
  [18.85, -55.10], // T12 Junção (L R7, 109°)
  [18.50, -57.28], // T12 Junção (L R7, 109°)
  [17.48, -59.25], // T12 Junção (L R7, 109°)
  [15.91, -60.80], // T12 Junção (L R7, 109°)
  [13.92, -61.78], // T12 Junção (L R7, 109°)
  [10.17, -62.95], // Subida dos Boxes (L R30, 32°)
  [2.04, -64.28], // Subida dos Boxes (L R30, 32°)
  [-6.14, -63.36], // Subida dos Boxes (L R30, 32°)
  [-16.24, -60.78], // Subida dos Boxes
  [-26.33, -58.20], // Subida dos Boxes (L R26, 61°)
  [-32.75, -55.61], // Subida dos Boxes (L R26, 61°)
  [-38.26, -51.42], // Subida dos Boxes (L R26, 61°)
  [-42.46, -45.92], // Subida dos Boxes (L R26, 61°)
  [-45.07, -39.50], // Subida dos Boxes (L R26, 61°)
  [-48.72, -25.34], // Subida dos Boxes (L R35, 34°)
  [-49.80, -15.14], // Subida dos Boxes (L R35, 34°)
  [-47.87, -5.06], // Subida dos Boxes (L R35, 34°)
  [-43.33, 7.93], // pit straight
  [-38.79, 20.93], // pit straight
];

export default {
  id: 'interlagos',
  name: 'Interlagos',
  location: 'Brazil',
  inspiredBy: 'Autódromo José Carlos Pace (Interlagos)',
  blurb: 'Anticlockwise and old-school: a flat-out climb to the line, then a dive-bomb into the Senna S.',
  laps: 3,
  waypoints,
  startIndex: 0,
};
