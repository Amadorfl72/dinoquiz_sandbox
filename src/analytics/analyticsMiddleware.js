import { trackAppOpen, trackTooltipShown, trackTooltipDismissed } from './analyticsService';

const analyticsMiddleware = (store) => (next) => (action) => {
  try {
    switch (action.type) {
      case 'APP_OPENED':
        if (typeof action.payload?.isFirstOpen === 'boolean') {
          trackAppOpen(action.payload.isFirstOpen);
        }
        break;
      case 'TOOLTIP_SHOWN':
        if (action.payload?.tooltipId) {
          trackTooltipShown(action.payload.tooltipId);
        }
        break;
      case 'TOOLTIP_DISMISSED':
        if (action.payload?.tooltipId) {
          trackTooltipDismissed(action.payload.tooltipId);
        }
        break;
      default:
        break;
    }
  } catch (error) {
    console.error('[Analytics Middleware Error]', error);
  }

  return next(action);
};

export default analyticsMiddleware;
