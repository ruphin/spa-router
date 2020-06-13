// These polyfill certain features of Event that are required for the link interception to work
// They are a no-op on modern browsers

// Polyfill Event() constructor on old browsers
if (typeof window.Event !== "function") {
  const Event = function Event(
    event,
    { bubbles = false, cancelable = false } = {}
  ) {
    const evt = document.createEvent("Event");
    evt.initEvent(event, bubbles, cancelable);
    return evt;
  };
  Event.prototype = window.Event.prototype;
  window.Event = Event;
}

// Polyfill composedPath() on old browsers (and old Edge)
// This version excludes `document` and `window` from the path for simplicity
if (!Event.prototype.composedPath) {
  Event.prototype.composedPath = function composedPath() {
    let element = this.target;
    if (!element) {
      return [];
    }

    const path = [element];
    while (element.parentElement) {
      element = element.parentElement;
      path.push(element);
    }
    return path;
  };
}
