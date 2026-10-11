import type { MissionsConfig } from './schemas';

/** The three vertical-slice missions. Markers name a block and one corner of its sidewalk loop. */
export const DEFAULT_MISSIONS_CONFIG: MissionsConfig = {
  missions: [
    {
      id: 'harbor-run',
      title: 'Harbor Run',
      start: { block: [2, 2], corner: 'se' },
      reward: 1500,
      steps: [
        {
          type: 'goTo',
          marker: { block: [10, 3], corner: 'nw' },
          radius: 6,
          text: 'Meet the contact at the dock',
        },
        {
          type: 'driveTo',
          marker: { block: [13, 12], corner: 'sw' },
          radius: 8,
          text: 'Drive the car to the garage',
        },
      ],
    },
    {
      id: 'clean-up',
      title: 'Clean Up',
      start: { block: [4, 8], corner: 'ne' },
      reward: 2000,
      steps: [
        { type: 'eliminate', count: 3, text: 'Remove three people from the street' },
        {
          type: 'goTo',
          marker: { block: [7, 7], corner: 'nw' },
          radius: 5,
          text: 'Collect the payment',
        },
      ],
    },
    {
      id: 'lights-out',
      title: 'Lights Out',
      start: { block: [9, 9], corner: 'sw' },
      reward: 3000,
      steps: [
        {
          type: 'driveTo',
          marker: { block: [1, 13], corner: 'ne' },
          radius: 10,
          text: 'Drive out to the harbor',
        },
        {
          type: 'goTo',
          marker: { block: [1, 14], corner: 'nw' },
          radius: 5,
          text: 'Walk the last stretch to the boat',
        },
      ],
    },
  ],
};
