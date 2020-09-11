import "./lib/event-polyfill.js";
import { URLPonyfill } from "./lib/url-ponyfill.js";

let interceptingNavigation = false;
const paths = { included: [], excluded: [] };

// Shorthand accessors
const arrayPush = Array.prototype.push;
const { EventTarget, location, history, decodeURIComponent } = window;

// Defaults
const DEFAULT_INCLUDE = [/.?/];
const DEFAULT_EXCLUDE = [];

// Events are case sensitive in the DOM3 event specification, supported in IE11
export const ROUTE_CHANGED = "routeChanged";

// Intercept browser navigation
export const interceptNavigation = ({
  include = DEFAULT_INCLUDE,
  exclude = DEFAULT_EXCLUDE,
} = {}) => {
  if (!interceptingNavigation) {
    interceptingNavigation = true;

    // Register the global click handler to incercept clicks on anchor elements
    document.body.addEventListener("click", globalClickHandler);

    // Observe browser navigation
    window.addEventListener("hashchange", routeChanged);
    window.addEventListener("popstate", routeChanged);
  }

  arrayPush.apply(paths.included, include);
  arrayPush.apply(paths.excluded, exclude);
};

// Use a 'div' element as an implementer of EventTarget;
export const router = document.createElement("div");

export const currentPath = () => decodeURIComponent(location.pathname);

export const currentQuery = () => decodeURIComponent(location.search.slice(1));

export const currentHash = () => decodeURIComponent(location.hash.slice(1));

// Navigate to any href
export const navigate = (targetHref) => {
  // If there is no href, do nothing
  if (targetHref == undefined) {
    return;
  }

  const { href, origin, pathname } = URLPonyfill(targetHref);

  // If we are already at this href, do nothing
  if (href === location.href) {
    return;
  }

  // We should intercept navigation if all conditions are met:
  // - the target origin is the same as the current origin
  // - the path does not match some path in the excluded list
  // - the path matches some path in the included list
  if (
    origin === location.origin &&
    !paths.excluded.some((path) => path.test(pathname)) &&
    paths.included.some((path) => path.test(pathname))
  ) {
    // Add a new navigation state to the browser history
    history.pushState({}, "", href);
    routeChanged();
  } else {
    // Navigate normally
    location.href = href;
  }
};

// Notify observers on the router that the route changed
const routeChanged = () => {
  const routeChangedEvent = new Event(ROUTE_CHANGED);
  routeChangedEvent.routePath = currentPath();
  routeChangedEvent.routeQuery = currentQuery();
  routeChangedEvent.routeHash = currentHash();
  router.dispatchEvent(routeChangedEvent);
};

const globalClickHandler = (event) => {
  // Ignore this click if it is
  // - handled by another service `event.defaultPrevented`
  // - not left-click `event.button === 0`
  // - modified with meta `event.metaKey`
  // - modified with ctrl `event.ctrlKey`
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey
  ) {
    return;
  }

  // Find the first anchor link with an href in the event path. This is what the user 'clicked'
  const anchor = event
    .composedPath()
    .find((element) => element.tagName === "A" && element.href);

  // Ignore this click if this anchor
  // - does not exist
  // - has _blank target
  // - has _top or _parent target and `window.top !== window`
  if (
    !anchor ||
    anchor.target === "_blank" ||
    ((anchor.target === "_top" || anchor.target === "_parent") &&
      window.top !== window)
  ) {
    return;
  }

  // Stop the browser from handling the click
  event.preventDefault();

  // Use our own navigation method
  navigate(anchor.href);
};
