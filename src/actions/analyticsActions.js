export const appOpened = (isFirstOpen) => ({
  type: 'APP_OPENED',
  payload: { isFirstOpen }
});

export const tooltipShown = () => ({
  type: 'TOOLTIP_SHOWN'
});

export const tooltipDismissed = () => ({
  type: 'TOOLTIP_DISMISSED'
});
