import strings from '../../i18n/strings.es.json';

export function getMotivationalMessage(stars: 1 | 2 | 3): string {
  switch (stars) {
    case 3:
      return strings.results.messageThreeStars;
    case 2:
      return strings.results.messageTwoStars;
    default:
      return strings.results.messageOneStar;
  }
}
