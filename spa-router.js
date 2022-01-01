let interceptingNavigation = false;
let _currentPath, _currentQuery, _currentHash;

class RouteChangedEvent extends Event {
  constructor({ routePath, routeQuery, routeHash }) {
    super(ROUTE_CHANGED);
    Object.assign(this, { routePath, routeQuery, routeHash });
  }
}

const paths = { included: [], excluded: [] };

// Shorthand accessors
const arrayPush = Array.prototype.push;
const { location, history, decodeURIComponent } = window;

// Defaults
const DEFAULT_INCLUDE = [/.?/];
const DEFAULT_EXCLUDE = [];

// Events are case sensitive in the DOM3 event specification
export const ROUTE_CHANGED = "routeChanged";

// Intercept browser navigation
export const interceptNavigation = ({
  include = DEFAULT_INCLUDE,
  exclude = DEFAULT_EXCLUDE,
} = {}) => {
  if (!interceptingNavigation) {
    interceptingNavigation = true;

    // Register a global click handler to incercept clicks on anchor elements
    document.body.addEventListener("click", globalClickHandler);

    // Observe browser navigation
    window.addEventListener("hashchange", routeChanged);
    window.addEventListener("popstate", routeChanged);
  }

  const addNewRegexes = (newRegexes, regexes) => {
    arrayPush.apply(
      regexes,
      newRegexes.filter((newRegex) => {
        const source = newRegex.source;
        return !regexes.some((regex) => regex.source === source);
      })
    );
  };

  addNewRegexes(include, paths.included);
  addNewRegexes(exclude, paths.excluded);
};

export const router = new EventTarget();

export const currentPath = () => _currentPath;
export const currentQuery = () => _currentQuery;
export const currentHash = () => _currentHash;

Object.defineProperties(router, {
  path: { get: currentPath },
  query: { get: currentQuery },
  hash: { get: currentHash },
});

const setPathQueryHash = () => {
  _currentPath = decodeURIComponent(location.pathname);
  _currentQuery = decodeURIComponent(location.search.slice(1));
  _currentHash = decodeURIComponent(location.hash.slice(1));
};
setPathQueryHash();

// Navigate to any href
export const navigate = (targetHref) => {
  // If there is no href, do nothing
  if (targetHref == undefined) {
    return;
  }

  const { href, origin, pathname } = new URL(targetHref, document.baseURI);

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
    setPathQueryHash();
  }
};

// Notify observers on the router that the route changed
const routeChanged = () => {
  setPathQueryHash();
  const routeChangedEvent = new RouteChangedEvent({
    routePath: router.path,
    routeQuery: router.query,
    routeHash: router.hash,
  });
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
