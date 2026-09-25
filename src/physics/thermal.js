// Tyre temperature per axle (pure). The tread heats with the power dissipated by slip (sliding, spinning,
// locking) and with carcass flex, and cools toward the hall's air — faster with speed. Grip peaks in a
// window: cold tyres on the first lap and tyres cooked by a long slide both have less.

import {
  AMBIENT_TEMP, TYRE_OPTIMUM, TYRE_WINDOW, TYRE_TEMP_LOSS, TYRE_HEAT_CAPACITY, TYRE_ROLL_HEAT, TYRE_COOLING,
  TYRE_COOLING_SPEED,
} from '../config/physics.js';

// temp (°C) after dt with slip power `power` (W) at speed v (m/s).
export function heat(temp, power, v, dt) {
  const t = temp ?? AMBIENT_TEMP;
  const cooling = (TYRE_COOLING + TYRE_COOLING_SPEED * Math.abs(v)) * (t - AMBIENT_TEMP);
  return t + ((power + TYRE_ROLL_HEAT * Math.abs(v) - cooling) / TYRE_HEAT_CAPACITY) * dt;
}

// Share of peak grip at temp (°C): 1 at the optimum, 1 − TYRE_TEMP_LOSS at the window's edge.
export function thermalGrip(temp) {
  const x = ((temp ?? AMBIENT_TEMP) - TYRE_OPTIMUM) / TYRE_WINDOW;
  return Math.max(1 - 2.5 * TYRE_TEMP_LOSS, 1 - TYRE_TEMP_LOSS * x * x);
}
