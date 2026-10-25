/*
 * The sections of the app, in the order they appear on the home page.
 *
 * status:
 *   'ready'   the module exists; its card links to `href`
 *   'next'    being built now
 *   'planned' later
 *
 * To ship a module: build it, set status to 'ready' and set `href`
 * (relative, for example 'solar-system/index.html').
 */

export var MODULES = [
  {
    id: 'solar-system',
    title: 'Solar System',
    blurb: 'Follow every planet around the Sun in 2D, with NASA facts for each world.',
    status: 'next',
    href: null,
    icon: '<circle cx="12" cy="12" r="2.4"/><circle cx="12" cy="12" r="8.6"/><circle cx="18.1" cy="5.9" r="1.5" fill="currentColor" stroke="none"/>'
  },
  {
    id: 'gravity-lab',
    title: 'Gravity Lab',
    blurb: 'Change mass and distance, then watch an orbit hold, stretch or fall apart.',
    status: 'planned',
    href: null,
    icon: '<circle cx="8.5" cy="14.5" r="4.2"/><circle cx="19" cy="6" r="1.7" fill="currentColor" stroke="none"/><path d="M12.6 9.4c1.6-2.9 3.8-4.2 6.4-4.2" stroke-dasharray="1.6 2.2"/>'
  },
  {
    id: 'experiments',
    title: 'Experiments',
    blurb: 'Six hands-on experiments you can run in a few minutes.',
    status: 'planned',
    href: null,
    icon: '<path d="M9.5 3.5h5M10.2 3.5v5.6L5.4 17.2a2 2 0 0 0 1.7 3h9.8a2 2 0 0 0 1.7-3l-4.8-8.1V3.5"/><path d="M8 14.5h8"/>'
  },
  {
    id: 'missions',
    title: 'Missions',
    blurb: 'Follow 12 or more real space missions, one step at a time.',
    status: 'planned',
    href: null,
    icon: '<circle cx="5" cy="18.5" r="1.7" fill="currentColor" stroke="none"/><path d="M5 18.5c5 0 3.4-8 8.4-8 3.6 0 3-5.4 6-5.4"/><path d="M17.2 3.2 20 5.1l-2.2 2.6"/>'
  },
  {
    id: 'quizzes',
    title: 'Quizzes',
    blurb: 'Check what you have learned with short quizzes.',
    status: 'planned',
    href: null,
    icon: '<circle cx="12" cy="12" r="8.8"/><path d="M9.4 9.6a2.6 2.6 0 1 1 3.7 2.4c-.8.4-1.1.9-1.1 1.8"/><circle cx="12" cy="16.9" r=".9" fill="currentColor" stroke="none"/>'
  }
];

export var STATUS_LABEL = {
  ready: 'Ready',
  next: 'Building next',
  planned: 'Planned'
};
