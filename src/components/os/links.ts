import type { LifeLink } from '../../lib/life';

/** Words for what a Go button does. */
export function linkLabel(link: LifeLink): string {
  switch (link.to) {
    case 'work': return 'Go to work';
    case 'food': return 'Find food';
    case 'fashion': return 'Go to the boutique';
    case 'gadgets': return 'Go to the gadget shop';
    case 'park': return 'Go to the park';
    case 'nightlife': return 'Go to the lounge';
    case 'travel': return 'Go to the travel desk';
    case 'home': return 'Go home';
    case 'homes': return 'Find a home';
    case 'catalogue': return 'Open furniture';
    case 'explore': return 'Somewhere new';
    case 'friend': return link.residentId ? 'Go and see them' : 'Find someone';
    case 'homeUse': return { shower: 'Shower at home', cook: 'Cook at home', relax: 'Relax at home', study: 'Study at home', sleep: 'Go to bed' }[link.use];
  }
}
