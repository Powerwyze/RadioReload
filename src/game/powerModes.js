export const POWER_MODE_OPTIONS = [
  {
    id: 'composite',
    title: 'Composite Drive',
    description: 'Pulse strength and confidence blended with onset density and spectral flux.'
  },
  {
    id: 'spectral-flux',
    title: 'Flux Drive',
    description: 'Weapon power follows how much the frequency picture changes frame to frame.'
  },
  {
    id: 'low-end-energy',
    title: 'Bass Drive',
    description: 'Weapon power follows kick and bass weight in the low-end band.'
  }
];

export const DEFAULT_POWER_MODE = POWER_MODE_OPTIONS[0].id;

export function getPowerMode(modeId) {
  return POWER_MODE_OPTIONS.find((option) => option.id === modeId) ?? POWER_MODE_OPTIONS[0];
}
