// TBC Indoor Racing (Vancouver) layout, re-traced in metres for a 6 m wide kart track.
// +X east, +Z south, origin at the venue centre. The kart drives in list order.
// Same layout as the reference map: bottom start/finish straight → right-hand sweeper →
// narrow "ear" hairpin (top right) → long top straight → wide left bulge → bottom chicane.
// Corner radii stay ≥ 3.5 m and separate parts of the track stay ≥ 12 m apart so the
// barriers on both sides never cut into each other.

const waypoints = [
  [12.0, 31.6], //    start / finish straight
  [22.0, 30.6],
  [31.0, 27.3], //    bottom-right sweeper
  [38.5, 21.3],
  [43.0, 12.8],
  [44.0, 2.8], //     right side
  [41.0, -6.2],
  [36.8, -13.2],
  [34.6, -19.7], //   ear — entry leg heading north
  [34.2, -25.4],
  [32.38, -29.78],
  [28.0, -31.6], //   ear — hairpin tip
  [23.62, -29.78],
  [21.8, -25.4], //   ear — return leg heading south
  [21.8, -23.2],
  [19.98, -18.82],
  [15.6, -17.0], //   ear exit onto the top straight
  [8.0, -17.1],
  [-2.0, -17.0],
  [-12.0, -16.7],
  [-23.0, -15.5],
  [-32.0, -12.2], //  top-left corner
  [-39.0, -5.7],
  [-43.5, 3.8], //    left bulge, widest point
  [-41.8, 12.8],
  [-34.0, 18.8],
  [-26.0, 21.8], //   bottom chicane
  [-18.5, 27.1],
  [-10.5, 27.2],
  [-3.5, 25.0],
  [3.5, 28.6],
];

export default {
  id: 'tbc',
  name: 'TBC Indoor',
  location: 'Vancouver, Canada',
  inspiredBy: 'TBC Indoor Racing — the home track',
  blurb: 'The original hall layout: sweeper, the "ear" hairpin, a long back straight and a tight chicane.',
  laps: 7,
  waypoints,
  startIndex: 0,
  samples: 1000, // the v1 sampling, so best laps saved before multi-track still count
  exempt: ['radius', 'grid'], // predates the design rules: a 3.9 m hairpin and a grid on the chicane exit
};
