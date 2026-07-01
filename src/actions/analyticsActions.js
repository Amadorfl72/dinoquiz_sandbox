export const appOpened = (isFirstOpen) => ({
  type: 'APP_OPENED',
  payload: { isFirstOpen }
});

export const tooltipShown = (tooltipId) => ({
  type: 'TOOLTIP_SHOWN',
  payload: { tooltipId }
});

export const tooltipDismissed = (tooltipId) => ({
  type: 'TOOLTIP_DISMISSED',
  payload: { tooltipId }
});
