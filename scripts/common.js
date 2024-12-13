import { loadCSS, getMetadata } from './aem.js';

/**
 * The default limit of the fetched data
 */
const DEFAULT_LIMIT = 100_000;

let placeholders = null;

/**
 * Gets the language path from the current URL.
 * @returns {string} The language path, e.g., "/en/" or "/en-US/". Defaults to "/".
 */
const getLanguagePath = () => {
  const { pathname } = new URL(window.location.href);
  const langCodeMatch = pathname.match('^(/[a-z]{2}(-[a-z]{2})?/).*');

  return langCodeMatch ? langCodeMatch[1] : '/';
};

/**
 * Fetches placeholders from a JSON file based on the current language path.
 * @returns {Promise<void>} A promise that resolves when the placeholders are fetched and stored.
 */
async function getPlaceholders() {
  const url = `${getLanguagePath()}placeholder.json`;

  placeholders = await fetch(url).then((resp) => resp.json());
}

/**
 * Gets the text label for a given key from the placeholders.
 * @param {string} key - The key to look up in the placeholders.
 * @returns {string} The text label corresponding to the key, or the key itself if not found.
 */
function getTextLabel(key) {
  return placeholders?.data.find((el) => el.Key === key)?.Text || key;
}

/**
 * Create an element with the given id and classes.
 * @param {string} tagName the tag
 * @param {Object} options the element options
 * @param {string[]|string} [options.classes=[]] the class or classes to add
 * @param {Object} [options.props={}] any other attributes to add to the element
 * @returns {HTMLElement} the element
 */
function createElement(tagName, options = {}) {
  const { classes = [], props = {} } = options;
  const elem = document.createElement(tagName);
  const isString = typeof classes === 'string';
  if (classes || (isString && classes !== '') || (!isString && classes.length > 0)) {
    const classesArr = isString ? [...(classes?.split(' ') || [])] : classes;
    elem.classList.add(...classesArr);
  }
  if (!isString && classes.length === 0) elem.removeAttribute('class');

  if (props) {
    Object.keys(props).forEach((propName) => {
      const isBooleanAttribute = propName === 'allowfullscreen' || propName === 'autoplay' || propName === 'muted' || propName === 'controls';

      // For boolean attributes, add the attribute without a value if it's truthy
      if (isBooleanAttribute) {
        if (props[propName]) {
          elem.setAttribute(propName, '');
        }
      } else {
        const value = props[propName];
        elem.setAttribute(propName, value);
      }
    });
  }

  return elem;
}

/**
 * Adds the favicon.
 * @param {string} href The favicon URL
 */
function addFavIcon(href) {
  const link = createElement('link', { props: { rel: 'icon', type: 'image/svg+xml', href } });
  const existingLink = document.querySelector('head link[rel="icon"]');
  if (existingLink) {
    existingLink.parentElement.replaceChild(link, existingLink);
  } else {
    document.getElementsByTagName('head')[0].appendChild(link);
  }
}

/**
 * Loads a template by dynamically importing its CSS and JavaScript files.
 * The template name is converted to lowercase to ensure case-insensitive file paths.
 *
 * @param {Document} doc - The document object where the template will be applied.
 * @param {string} templateName - The name of the template to load.
 */
async function loadTemplate(doc, templateName) {
  const lowercaseTemplateName = templateName.toLowerCase();
  try {
    const cssLoaded = loadCSS(`${window.hlx.codeBasePath}/templates/${lowercaseTemplateName}/${lowercaseTemplateName}.css`);
    const decorationComplete = new Promise((resolve) => {
      (async () => {
        try {
          const mod = await import(`../templates/${lowercaseTemplateName}/${lowercaseTemplateName}.js`);
          if (mod.default) {
            await mod.default(doc);
          }
        } catch (error) {
          console.log(`failed to load module for ${lowercaseTemplateName}`, error);
        }
        resolve();
      })();
    });
    await Promise.all([cssLoaded, decorationComplete]);
  } catch (error) {
    console.log(`failed to load block ${lowercaseTemplateName}`, error);
  }
}

/**
 * loads everything that happens a lot later, without impacting
 * the user experience.
 */
function loadDelayed() {
  window.setTimeout(() => {
    import('./delayed.js');
  }, 3000);
  // load anything that can be postponed to the latest here
}

/**
 * Removes empty tags from a given block element.
 * The function iterates through all child elements of the block and removes those
 * that are not self-closing and have no content inside.
 *
 * @param {HTMLElement} block - The block element from which empty tags will be removed.
 */
const removeEmptyTags = (block) => {
  block.querySelectorAll('*').forEach((x) => {
    const tagName = `</${x.tagName}>`;

    // checking that the tag is not autoclosed to make sure we don't remove <meta />
    // checking the innerHTML and trim it to make sure the content inside the tag is 0
    if (x.outerHTML.slice(tagName.length * -1).toUpperCase() === tagName && x.innerHTML.trim().length === 0) {
      x.remove();
    }
  });
};

/**
 * This function recursively traverses the child elements of a given element
 * and removes all <div> elements that have no attributes,
 * moving their children to the parent element.
 * @param {HTMLElement} element the parent element to remove its children
 * @param {Object} options the unwrap options
 * @param {boolean} [options.ignoreDataAlign=false] whether to ignore divs with data-align attribute
 * @returns {void}
 */
const unwrapDivs = (element, options = {}) => {
  const stack = [element];
  const { ignoreDataAlign = false } = options;

  while (stack.length > 0) {
    const currentElement = stack.pop();

    let i = 0;
    while (i < currentElement.children.length) {
      const node = currentElement.children[i];
      const attributesLength = [...node.attributes].filter((el) => {
        if (ignoreDataAlign) {
          return !(el.name.startsWith('data-align') || el.name.startsWith('data-valign'));
        }

        return el;
      }).length;

      if (node.tagName === 'DIV' && attributesLength === 0) {
        while (node.firstChild) {
          currentElement.insertBefore(node.firstChild, node);
        }
        node.remove();
      } else {
        stack.push(node);
        i += 1;
      }
    }
  }
};

/**
 * Converts variant classes to BEM (Block Element Modifier) format.
 * For each expected variant name, if the blockClasses contains the variant,
 * it removes the variant class and adds a new class in the BEM format.
 *
 * @param {DOMTokenList} blockClasses - The list of classes for the block element.
 * @param {Array<string>} expectedVariantsNames - The array of expected variant names.
 * @param {string} blockName - The name of the block element.
 */
const variantsClassesToBEM = (blockClasses, expectedVariantsNames, blockName) => {
  expectedVariantsNames.forEach((variant) => {
    if (blockClasses.contains(variant)) {
      blockClasses.remove(variant);
      blockClasses.add(`${blockName}--${variant}`);
    }
  });
};

/**
 * Converts a given text into a URL-friendly slug.
 * The function performs the following transformations:
 * - Converts the text to lowercase.
 * - Trims whitespace from the beginning and end.
 * - Normalizes the text to separate accents from letters.
 * - Removes all separated accents.
 * - Replaces spaces with hyphens.
 * - Replaces '&' with 'and'.
 * - Removes all non-word characters.
 * - Replaces multiple hyphens with a single hyphen.
 *
 * @param {string} text - The text to be slugified.
 * @returns {string} The slugified version of the text.
 */
const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    // separate accent from letter
    .normalize('NFD')
    // remove all separated accents
    .replace(/[\u0300-\u036f]/g, '')
    // replace spaces with -
    .replace(/\s+/g, '-')
    // replace & with 'and'
    .replace(/&/g, '-and-')
    // remove all non-word chars
    .replace(/[^\w-]+/g, '')
    // replace multiple '-' with single '-'
    .replace(/--+/g, '-');

/**
 * loads the constants file where configuration values are stored
 */
async function getConstantValues() {
  const url = `${getLanguagePath()}constants.json`;
  let constants;
  try {
    const response = await fetch(url).then((resp) => resp.json());
    if (!response.ok) {
      constants = response;
    }
  } catch (error) {
    console.error('Error with constants file', error);
  }
  return constants;
}

/**
 * Extracts key-value pairs from an array of strings and returns them as an object.
 * Each string in the array should be in the format "key: value".
 * If a string does not match this format, a warning is logged and the string is skipped.
 *
 * @param {Array<string>} data - The array of strings to extract key-value pairs from.
 * @returns {Object} The object containing the extracted key-value pairs.
 */
const extractObjectFromArray = (data) => {
  const obj = {};
  for (const item of data) {
    try {
      if (typeof item !== 'string' || !item.includes(':')) {
        throw new TypeError(`Invalid input: "${item}". Expected a string: "key: value".`);
      }
      const [key, value] = item.split(':', 2);
      obj[key.trim()] = value.trim();
    } catch (error) {
      console.warn(`Error with item: "${item}"`, error);
    }
  }
  return obj;
};

/**
 * Check if one trust group is checked.
 * @param {String} groupName the one trust group like: C0002
 */
function checkOneTrustGroup(groupName, cookieCheck = false) {
  const oneTrustCookie = decodeURIComponent(document.cookie.split(';').find((cookie) => cookie.trim().startsWith('OptanonConsent=')));
  return cookieCheck || oneTrustCookie.includes(`${groupName}:1`);
}

/**
 * Returns a list of properties listed in the block
 * @param {string} route get the Json data from the route
 * @returns {Object} the json data object
 */
const getJsonFromUrl = async (route) => {
  try {
    const response = await fetch(route);
    if (!response.ok) return null;
    const json = await response.json();
    return json;
  } catch (error) {
    console.error('getJsonFromUrl:', { error });
  }
  return null;
};

/**
 * See https://www.aem.live/developer/spreadsheets#arrays
 * Converts a string representation of an array, removing all brackets, backslashes, and quotes,
 * into an actual JavaScript array. Splits on commas, trims each string, and filters out empty
 * strings to ensure all elements contain valid data.
 *
 * @param {string} inputString - The string to be converted. It should mimic a serialized array,
 *                               often found in JSON-like structures where arrays are represented
 *                               as strings due to data transmission constraints.
 * @returns {string[]} An array of strings derived from the cleaned input string. Each element
 *                     is a trimmed, non-empty string that was separated by a comma in the
 *                     original input.
 */
const formatStringToArray = (inputString) => {
  // eslint-disable-next-line no-useless-escape
  const cleanedString = inputString.replace(/[\[\]\\'"]+/g, '');
  return cleanedString
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item);
};

/*
  The generateId function should be used only
  for generating the id for UI elements
*/
let idValue = 0;

/**
 * Generates a unique ID with an optional prefix.
 * @param {string} [prefix='id'] - The prefix for the generated ID.
 * @returns {string} The generated unique ID.
 */
const generateId = (prefix = 'id') => {
  idValue += 1;
  return `${prefix}-${idValue}`;
};

/**
 * Adjusts the pretitle of headings within a given element.
 * If a heading is followed by another heading of a lower level,
 * the current heading's content is wrapped in a span with the class 'pretitle'.
 * @param {HTMLElement} element - The element containing the headings to adjust.
 */
const adjustPretitle = (element) => {
  const headingSelector = 'h1, h2, h3, h4, h5, h6';

  [...element.querySelectorAll(headingSelector)].forEach((heading) => {
    const isNextElHeading = heading.nextElementSibling?.matches(headingSelector);
    if (!isNextElHeading) {
      return;
    }

    const currentLevel = Number(heading.tagName[1]);
    const nextElLevel = Number(heading.nextElementSibling.tagName[1]);

    if (currentLevel > nextElLevel) {
      const pretitle = createElement('span', { classes: ['pretitle'] });
      pretitle.append(...heading.childNodes);

      heading.replaceWith(pretitle);
    }
  });
};

/**
 * Extracts the URL without query parameters of images from an array of picture elements
 * @param {HTMLElement} images - An array of picture elements
 * @returns {Array} Array of src strings
 */
function getImageURLs(pictures) {
  return pictures.map((picture) => {
    const imgElement = picture.querySelector('img');
    return imgElement.getAttribute('src').split('?')[0];
  });
}

/**
 * Creates a picture element based on provided image data and breakpoints
 * @param {Array} images - Array of objects defining image data and breakpoints
 * @param {boolean} eager - Whether to load images eagerly
 * @param {string} alt - Alt text for the image
 * @param {string[]|string} imageClass - Class for the image
 * @returns {HTMLElement} The created picture element
 */
function createResponsivePicture(images, eager, alt, imageClass) {
  const picture = document.createElement('picture');
  let fallbackWidth = '';
  let fallbackSrc = '';

  function constructSrcset(src, width, format) {
    const baseUrl = `${src}?format=${format}&optimize=medium`;
    return `${baseUrl}&width=${width} 1x, ${baseUrl}&width=${width * 2} 2x`;
  }

  images.forEach((image) => {
    const originalFormat = image.src.split('.').pop();

    image.breakpoints.forEach((bp) => {
      if (!bp.media) return;

      const srcsetWebp = constructSrcset(image.src, bp.width, 'webp');
      const srcsetOriginal = constructSrcset(image.src, bp.width, originalFormat);

      const webpSource = createElement('source', {
        props: {
          type: 'image/webp',
          srcset: srcsetWebp,
          media: bp.media,
        },
      });

      const originalSource = createElement('source', {
        props: {
          type: `image/${originalFormat}`,
          srcset: srcsetOriginal,
          media: bp.media,
        },
      });

      picture.insertBefore(originalSource, picture.firstChild);
      picture.insertBefore(webpSource, originalSource);
    });

    const fallbackBreakpoint = image.breakpoints.find((bp) => !bp.media);
    if (fallbackBreakpoint && !fallbackSrc) {
      fallbackWidth = fallbackBreakpoint.width;
      fallbackSrc = `${image.src}?width=${fallbackWidth}&format=${originalFormat}&optimize=medium`;
    }
  });

  const img = createElement('img', {
    classes: imageClass,
    props: {
      src: fallbackSrc,
      alt,
      loading: eager ? 'eager' : 'lazy',
      width: fallbackWidth,
    },
  });

  picture.appendChild(img);

  return picture;
}

/**
 * Deeply merges two objects. The properties from the source object are merged into the target object.
 * If a property is an object in both the target and source, the function recursively merges them.
 * @param {Object} originalTarget - The target object to merge properties into.
 * @param {Object} source - The source object from which properties are merged.
 * @returns {Object} The merged target object.
 */
const deepMerge = (originalTarget, source) => {
  let target = originalTarget;
  // Initialize target as an empty object if it's undefined or null
  if (typeof target !== 'object' || target === null) {
    target = {};
  }

  Object.keys(source).forEach((key) => {
    const sourceValue = source[key];
    const targetValue = target[key];
    const sourceIsPlainObject = Object.prototype.toString.call(sourceValue) === '[object Object]';
    const targetIsPlainObject = Object.prototype.toString.call(targetValue) === '[object Object]';

    if (sourceIsPlainObject && targetIsPlainObject) {
      target[key] = target[key] || {};
      deepMerge(target[key], sourceValue);
    } else {
      target[key] = sourceValue;
    }
  });
  return target;
};

/**
 * Returns a list of properties listed in the block
 * @param {Object} props the block props
 * @param {string} props.url get the Json data from the route
 * @param {number} props.offset the offset of the data
 * @param {number} props.limit the limit of the data
 * @returns {Object} the json data object
 */
const getInitialJSONData = async (props) => {
  try {
    const { url, offset = 0, limit = null } = props;
    const nextOffset = offset > 0 ? `?offset=${offset}` : '';
    const nextLimit = limit ? `${offset > 0 ? '&' : '?'}limit=${limit}` : '';
    const results = await fetch(`${url}${nextOffset}${nextLimit}`, {
      method: 'GET',
      headers: {
        'Accept-Encoding': 'gzip',
      },
    });
    const json = await results.json();
    return json;
  } catch (error) {
    console.error('getInitialJSONData:', { error });
    return null;
  }
};

/**
 * Save the fetched data in a temporary array
 */
const tempData = [];

/**
 * Returns a more data if the limit is reached
 * @param {string} url get the Json data from the route
 * @param {number} total the total of the data
 * @param {number} offset the offset of the data
 * @param {number} limit the limit of the data
 * @returns {Object} the json data object
 * @example getMoreJSONData('https://roadchoice.com/api/news', 1000, 0, 100_000)
 */
async function getMoreJSONData(url, total, offset = 0, limit = DEFAULT_LIMIT) {
  try {
    const newOffset = offset + limit;
    const json = await getInitialJSONData({ url, offset: newOffset, limit });
    const isLastCall = json.offset + limit >= json.total;
    if (isLastCall) {
      const lastData = [...tempData, ...json.data];
      tempData.length = 0;
      return lastData;
    }
    tempData.push(...json.data);
    return getMoreJSONData(total, newOffset);
  } catch (error) {
    console.error('getMoreJSONData:', { error });
    return null;
  }
}

/**
 * Return the data from the url if it has more than the default limit
 * @param {Object} props the block props
 * @param {string} props.url get the Json data from the route
 * @param {number} props.offset the offset of the data
 * @param {number} props.limit the limit of the data
 * @returns {Object} the json data object
 * @example getLongJSONData({ url:'https://roadchoice.com/api/news', limit: 100_000, offset: 1000})
 */
const getLongJSONData = async (props) => {
  const { url } = props;
  const json = await getInitialJSONData(props);
  if (!json) return null;
  const initialData = [...json.data];
  let moreData;
  if (json.total > json.limit) {
    moreData = await getMoreJSONData(url, json.total);
  }
  return moreData ? [...initialData, ...moreData] : initialData;
};

/**
 * Launch the search worker to load all the products
 * @returns {Worker} the search worker
 */
function loadWorker() {
  const currentUrl = new URL(window.location.href);
  const { pathname } = currentUrl;
  const langLocale = getMetadata('locale');
  const rootLangPath = langLocale ? `/${langLocale.toLocaleLowerCase()}` : '';
  const worker = new Worker(`${currentUrl.origin}/blocks/search/worker.js`);
  // this just launch the worker, and the message listener is triggered in another script
  worker.postMessage({ rootLangPath, pathname });
  // this enable the search in any page
  worker.onmessage = (e) => {
    if (e?.data) {
      window.allProducts = e.data;
    }
  };
  return worker;
}

/**
 * Adds attributes to all anchors and buttons that start with properties between [ brackets ]
 * @param {NodeList} links list of links to check if have properties to add as attributes
 */
function checkLinkProps(links) {
  links.forEach((link) => {
    const linkText = link.innerText;
    if (linkText[0] !== '[') return;
    const brackets = linkText.match(/^\[(.*?)\]/);
    const rawProperties = brackets && brackets[1];
    const propertyArray = rawProperties?.split(',');
    propertyArray?.forEach((prop) => {
      prop.trimStart();
      /* Check if this link should open in new tab */
      if (prop === 'new-tab') {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
    const firstDashIndex = linkText.indexOf(']');
    const selectedText = linkText.slice(firstDashIndex + 1);
    link.title = selectedText;
    link.innerText = selectedText;
  });
}

/**
 * Resolves a given url to a document to the language/folder context
 * by adding the locale to the url if it doesn't have it and should have
 * @param {string} urlPathToConvert the url path to convert
 */
function getLocaleContextedUrl(urlPathToConvert) {
  const locationUrl = new URL(window.location.href);
  const locale = getMetadata('locale');
  const localeRegexToMatch = new RegExp(`/${locale}/`, 'i');
  const localeInPageUrlRegex = new RegExp(`^/${locale}/`, 'i');
  let pageUrl = urlPathToConvert.startsWith('/') ? urlPathToConvert : `/${urlPathToConvert}`;
  const urlPattern = /^(https?:\/\/)/;

  if (urlPattern.test(urlPathToConvert)) {
    return urlPathToConvert;
  }

  if (!locale) {
    return pageUrl;
  }

  if (localeRegexToMatch.test(locationUrl.pathname) && !localeInPageUrlRegex.test(pageUrl)) {
    pageUrl = `/${locale.toLocaleLowerCase()}${pageUrl}`;
  }

  return pageUrl;
}

/**
 * Formats an array of objects into a single object with key-value pairs.
 * Each object in the array should have 'name' and 'value' properties.
 * @param {Array} values - The array of objects to format.
 * @param {string} values[].name - The name property of the object, which will be used as the key.
 * @param {any} values[].value - The value property of the object, which will be used as the value.
 * @returns {Object} The formatted object with key-value pairs.
 */
const formatValues = (values = []) => {
  return values.reduce((acc, { name, value }) => {
    acc[name] = value;
    return acc;
  }, {});
};

function isPerformanceAllowed() {
  return checkOneTrustGroup(COOKIE_CONFIGS.PERFORMANCE_COOKIE);
}

function isFunctionalAllowed() {
  return checkOneTrustGroup(COOKIE_CONFIGS.FUNCTIONAL_COOKIE);
}

function isTargetingAllowed() {
  return checkOneTrustGroup(COOKIE_CONFIGS.TARGETING_COOKIE);
}

function isSocialAllowed() {
  return checkOneTrustGroup(COOKIE_CONFIGS.SOCIAL_COOKIE);
}

const { cookieValues, projectConfig, dealerLocator, searchConfig } = await getConstantValues();

// This data comes from the sharepoint 'constants.xlsx' file
const COOKIE_CONFIGS = formatValues(cookieValues?.data);
const PROJECT_CONFIG = formatValues(projectConfig?.data);
const DEALER_LOCATOR = formatValues(dealerLocator?.data);
const SEARCH_CONFIG = formatValues(searchConfig?.data);

const allLinks = [...document.querySelectorAll('a'), ...document.querySelectorAll('button')];
checkLinkProps(allLinks);

export { COOKIE_CONFIGS, PROJECT_CONFIG, DEALER_LOCATOR, SEARCH_CONFIG, DEFAULT_LIMIT };

export {
  getLocaleContextedUrl,
  checkLinkProps,
  loadWorker,
  getLongJSONData,
  deepMerge,
  createResponsivePicture,
  getImageURLs,
  getJsonFromUrl,
  isSocialAllowed,
  isTargetingAllowed,
  isFunctionalAllowed,
  isPerformanceAllowed,
  slugify,
  variantsClassesToBEM,
  unwrapDivs,
  removeEmptyTags,
  loadDelayed,
  loadTemplate,
  addFavIcon,
  createElement,
  getPlaceholders,
  getTextLabel,
  getLanguagePath,
};

// Not used in this project:
// Delete?
export { extractObjectFromArray, adjustPretitle, generateId, formatStringToArray };
