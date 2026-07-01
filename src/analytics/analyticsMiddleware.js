import { trackAppOpen, trackTooltipShown, trackTooltipDismissed } from './analyticsService';

const analyticsMiddleware = (store) => (next) => (action) => {
  switch (action.type) {
    case 'APP_OPENED':
      trackAppOpen(action.payload.isFirstOpen);
      break;
    case 'TOOLTIP_SHOWN':
      trackTooltipShown();
      break;
    case 'TOOLTIP_DISMISSED':
      trackTooltipDismissed();
      break;
    default:
      break;
  }

  return next(action);
};

export default analyticsMiddleware;
