let URLWorks;
let baseAnchor;
let fullAnchor;

const FORWARD_SLASH = "/";

/**
 * A minimal ponyfill for URL()
 *
 * - Uses URL() if it is available
 * - limited to using the baseURI from the current document
 * - only returns the href, origin, and pathname properties
 */
export const URLPonyfill = (targetHref) => {
  // Feature detect URL
  if (URLWorks === undefined) {
    URLWorks = false;
    try {
      const u = new URL("b", "http://a");
      u.pathname = "c%20d";
      URLWorks =
        u.href === "http://a/c%20d" &&
        new URL("http://a/?b c").href === "http://a/?b%20c";
    } catch (e) {
      // silently fail
    }
  }

  // Use URL if it is available
  if (URLWorks) {
    return new URL(targetHref, document.baseURI);
  }

  // Fallback to using anchor elements
  if (!baseAnchor) {
    baseAnchor = document.createElement("a");
    fullAnchor = document.createElement("a");
  }

  baseAnchor.href = targetHref;
  fullAnchor.href = baseAnchor.href;

  let { href, origin, protocol, host, pathname } = fullAnchor;
  origin = origin || `${protocol}//${host}`;

  if (pathname[0] !== FORWARD_SLASH) {
    pathname = `${FORWARD_SLASH}${pathname}`;
  }

  return { href, origin, pathname };
};
