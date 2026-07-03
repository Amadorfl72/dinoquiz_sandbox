export const triggerUIFeedback = (eventType, data) => {
  const event = new CustomEvent(eventType, { detail: data });
  window.dispatchEvent(event);
};