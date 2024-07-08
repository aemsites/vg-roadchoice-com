import {
  sampleRUM,
  buildBlock,
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateBlocks,
  decorateTemplateAndTheme,
  getMetadata,
  waitForLCP,
  loadBlocks,
  loadBlock,
  loadCSS,
  readBlockConfig,
  toCamelCase,
  toClassName,
  loadScript,
} from './lib-franklin.js';

/**
 * Add the image as background
 * @param {Element} section the section container
 * @param {string} picture the picture's link
 */
function addBackgroundImage(section, picture) {
  section.classList.add('background');
  section.style.backgroundImage = `url('${picture}')`;
}

/**
 * Create an element with the given id and classes.
 * @param {string} tagName the tag
 * @param {Object} options the element options
 * @param {string[]|string} [options.classes=[]] the class or classes to add
 * @param {Object.<string, string>} [options.props={}] any other attributes to add to the element
 * @param {string} [options.textContent=null] add text content into the element
 * @returns {HTMLElement} the element
 */
export function createElement(tagName, options = {}) {
  const { classes = [], props = {}, textContent = null } = options;
  const elem = document.createElement(tagName);
  const isString = typeof classes === 'string';
  if (classes || (isString && classes !== '') || (!isString && classes.length > 0)) {
    const classesArr = isString ? [classes] : classes;
    elem.classList.add(...classesArr);
  }
  if (!isString && classes.length === 0) elem.removeAttribute('class');

  if (props) {
    Object.keys(props).forEach((propName) => {
      const value = propName === props[propName] ? '' : props[propName];
      elem.setAttribute(propName, value);
    });
  }

  if (textContent) {
    elem.textContent = textContent;
  }

  return elem;
}

/**
 * Decorates all sections in a container element.
 * @param {Element} main The container element
 */
export function decorateSections(main) {
  main.querySelectorAll(':scope > div').forEach((section) => {
    const wrappers = [];
    let defaultContent = false;
    [...section.children].forEach((e) => {
      if (e.tagName === 'DIV' || !defaultContent) {
        const wrapper = createElement('div');
        wrappers.push(wrapper);
        defaultContent = e.tagName !== 'DIV';
        if (defaultContent) wrapper.classList.add('default-content-wrapper');
      }
      wrappers[wrappers.length - 1].append(e);
    });
    wrappers.forEach((wrapper) => section.append(wrapper));
    section.classList.add('section');
    section.dataset.sectionStatus = 'initialized';
    section.style.display = 'none';

    /* process section metadata */
    const sectionMeta = section.querySelector('div.section-metadata');
    if (sectionMeta) {
      const meta = readBlockConfig(sectionMeta);
      Object.keys(meta).forEach((key) => {
        if (key === 'style') {
          const styles = meta.style.split(',').map((style) => toClassName(style.trim()));
          styles.forEach((style) => section.classList.add(style));
        } if (key === 'background') {
          const picture = sectionMeta.querySelector('picture');
          if (picture) addBackgroundImage(section, meta[key]);
        } else {
          section.dataset[toCamelCase(key)] = meta[key];
        }
      });
      sectionMeta.parentNode.remove();
    }
  });
}

/**
 * Decorates paragraphs containing a single link as buttons.
 * @param {Element} element container element
 */
export function decorateButtons(element) {
  element.querySelectorAll('a').forEach((link) => {
    link.title = link.title || link.textContent;
    if (link.href !== link.textContent) {
      const up = link.parentElement;
      const twoup = link.parentElement.parentElement;
      if (!link.querySelector('img') && up.childNodes.length === 1) {
        if (up.tagName === 'P' || up.tagName === 'DIV') {
          link.className = 'button primary'; // default
          up.className = 'button-container';
        }
        if (up.tagName === 'STRONG' && twoup.childNodes.length === 1 && twoup.tagName === 'P') {
          link.className = 'button primary';
          twoup.className = 'button-container';
        }
        if (up.tagName === 'EM' && twoup.childNodes.length === 1 && twoup.tagName === 'P') {
          link.className = 'button secondary';
          twoup.className = 'button-container';
        }
      }
    }
  });
}

const LCP_BLOCKS = []; // add your LCP blocks to the list
window.hlx.RUM_GENERATION = 'project-1'; // add your RUM generation information here
window.mack = window.mack || {};
window.mack.newsData = window.mack.newsData || {
  news: [],
  offset: 0,
  allLoaded: false,
};

let placeholders = null;

async function getPlaceholders() {
  placeholders = await fetch('/placeholder.json').then((resp) => resp.json());
}

/**
 * Returns the text label for the given key from the placeholder data.
 * @param {string} key The key
 * @returns {string} The text label from data or the key if not found
 */
export function getTextLabel(key) {
  return placeholders?.data.find((el) => el.Key === key)?.Text || key;
}

/**
* add a link to the previous image
* @param {Element} node the image container element
*/
export function findAndCreateImageLink(node) {
  const links = node.querySelectorAll('picture ~ a');

  [...links].forEach((link) => {
    let prevEl = link.previousElementSibling;

    if (prevEl.tagName.toLowerCase() === 'br') {
      prevEl = prevEl.previousElementSibling;
    }

    if (prevEl.tagName.toLowerCase() === 'picture') {
      link.innerHTML = '';
      link.appendChild(prevEl);
      link.setAttribute('target', '_blank');
      link.classList.add('image-link');
    }
  });
}

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const header = main.querySelector('h1');
  const picture = main.querySelector('picture');
  const isCarousel = header?.closest('.carousel');
  const heroBlock = main.querySelector('.hero');

  if (isCarousel || heroBlock) {
    return;
  }

  if (header && picture
    // eslint-disable-next-line no-bitwise
    && (header.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = createElement('div');
    section.append(buildBlock('hero', { elems: [picture, header] }));
    section.querySelector('.hero').classList.add('auto-block');
    main.prepend(section);
  }
}

function buildSearchForm(main, head) {
  const noSearchBlock = head.querySelector('meta[name="no-search"]');
  if (noSearchBlock) return;
  const section = createElement('div');
  section.appendChild(buildBlock('search', []));
  main.prepend(section);
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main, head) {
  try {
    buildHeroBlock(main);
    if (head) {
      buildSearchForm(main, head);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

export function decorateLinks(block) {
  [...block.querySelectorAll('a')]
    .filter(({ href }) => !!href)
    .forEach((link) => {
      // handling modal links
      if (link.getAttribute('href').startsWith('/#id-modal')) {
        link.addEventListener('click', (event) => {
          event.preventDefault();
          const modalId = link.getAttribute('href').split('#')[1];
          const modalEvent = new CustomEvent('open-modal', {
            detail: {
              modalId,
            },
          });

          document.dispatchEvent(modalEvent, { bubbles: true });
        });
        return;
      }

      const url = new URL(link.href);
      const external = !url.host.match('roadchoice.com') && !url.host.match('.hlx.(page|live)') && !url.host.match('localhost');
      if (url.pathname.endsWith('.pdf') || external) {
        link.target = '_blank';
      }
    });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main, head) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main, head);
  decorateSections(main);
  decorateBlocks(main);
  decorateLinks(main);
}

async function loadTemplate(doc, templateName) {
  const lowercaseTemplateName = templateName.toLowerCase();
  try {
    const cssLoaded = new Promise((resolve) => {
      loadCSS(`${window.hlx.codeBasePath}/templates/${lowercaseTemplateName}/${lowercaseTemplateName}.css`, resolve);
    });
    const decorationComplete = new Promise((resolve) => {
      (async () => {
        try {
          const mod = await import(`../templates/${lowercaseTemplateName}/${lowercaseTemplateName}.js`);
          if (mod.default) {
            await mod.default(doc);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.log(`failed to load module for ${lowercaseTemplateName}`, error);
        }
        resolve();
      })();
    });
    await Promise.all([cssLoaded, decorationComplete]);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`failed to load block ${lowercaseTemplateName}`, error);
  }
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main, doc.head);
    document.body.classList.add('appear');
    await waitForLCP(LCP_BLOCKS);
  }

  await getPlaceholders();
}

/**
 * Adds the favicon.
 * @param {string} href The favicon URL
 */
export function addFavIcon(href) {
  const link = createElement('link', {
    props: {
      rel: 'icon',
      type: 'image/svg+xml',
      href,
    },
  });
  const existingLink = document.querySelector('head link[rel="icon"]');
  if (existingLink) {
    existingLink.parentElement.replaceChild(link, existingLink);
  } else {
    document.getElementsByTagName('head')[0].appendChild(link);
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const templateName = getMetadata('template');
  if (templateName) await loadTemplate(doc, templateName);

  const main = doc.querySelector('main');
  await loadBlocks(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  const header = doc.querySelector('header');
  const subnav = header.querySelector('.block.sub-nav');

  loadHeader(header);
  loadFooter(doc.querySelector('footer'));

  if (subnav) {
    loadBlock(subnav);
    header.appendChild(subnav);
  }

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  addFavIcon(`${window.hlx.codeBasePath}/styles/favicon.svg`);
  sampleRUM('lazy');
  sampleRUM.observe(main.querySelectorAll('div[data-block-name]'));
  sampleRUM.observe(main.querySelectorAll('picture > img'));
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();

/** Helper functions */
// video helpers

/**
 * Checks if the link is an embedded video link from YouTube
 * @param {Element} link the link to check
 * @returns {boolean} true if the link is a YouTube video link
 */
export function isVideoLink(link) {
  const linkString = link.getAttribute('href');
  return (linkString.includes('youtube.com/embed/'));
}

/**
 * Creates an iframe element with the specified URL and appends it to the specified parent element.
 * @param {string} url - The URL to load in the iframe.
 * @param {Object} options - An object containing optional parameters.
 * @param {HTMLElement} options.parentEl - The parent element to append the iframe to.
 * @param {string[]} options.classes - An array of CSS class names to apply to the iframe.
 * @returns {HTMLIFrameElement} The created iframe element.
*/
export function createIframe(url, { parentEl, classes = [] }) {
  // iframe must be recreated every time otherwise the new history record would be created
  const iframe = createElement('iframe', {
    classes,
    props: {
      frameborder: '0',
      allowfullscreen: 'allowfullscreen',
      src: url,
    },
  });

  if (parentEl) {
    parentEl.appendChild(iframe);
  }

  return iframe;
}

/* this function load script only when it wasn't loaded yet */
const scriptMap = new Map();

/**
 * Loads script and returns a promise that resolves when the script is loaded.
 * @param {string} url - The URL of the script to load.
 * @param {Object} attrs - An object containing optional parameters.
 * @returns {Promise} A promise that resolves when the script is loaded.
 */
export function loadScriptIfNotLoadedYet(url, attrs) {
  if (scriptMap.has(url)) {
    return scriptMap.get(url).promise;
  }

  const promise = loadScript(url, attrs);
  scriptMap.set(url, { url, attrs, promise });
  return promise;
}

/**
 * Creates a new block element with the specified name and content, and loads it into the page.
 * @param {string} blockName - block name with '-' instead of spaces
 * @param {string} blockContent - the content that will be set as block inner HTML
 * @param {object} options - other options like variantsClasses
 * @param {string[]} options.variantsClasses - An array of CSS class names to apply to the block.
 * @returns {HTMLElement} The created block element.
 */
export function loadAsBlock(blockName, blockContent, options = {}) {
  const { variantsClasses = [] } = options;
  const blockEl = createElement('div', {
    classes: ['block', blockName, ...variantsClasses],
    props: { 'data-block-name': blockName },
  });

  blockEl.innerHTML = blockContent;
  loadBlock(blockEl);

  return blockEl;
}

/**
 * Example Usage:
 *
 * domEl('main',
 *  div({ class: 'card' },
 *  a({ href: item.path },
 *    div({ class: 'card-thumb' },
 *     createOptimizedPicture(item.image, item.title, 'lazy', [{ width: '800' }]),
 *    ),
 *   div({ class: 'card-caption' },
 *      h3(item.title),
 *      p({ class: 'card-description' }, item.description),
 *      p({ class: 'button-container' },
 *       a({ href: item.path, 'aria-label': 'Read More', class: 'button primary' }, 'Read More'),
 *     ),
 *   ),
 *  ),
 * )
 */

/**
 * Helper for more concisely generating DOM Elements with attributes and children
 * @param {string} tag HTML tag of the desired element
 * @param  {[Object?, ...Element]} items: First item can optionally be an object of attributes,
 *  everything else is a child element
 * @returns {Element} The constructred DOM Element
 */
export function domEl(tag, ...items) {
  const element = document.createElement(tag);

  if (!items || items.length === 0) return element;

  if (!(items[0] instanceof Element || items[0] instanceof HTMLElement) && typeof items[0] === 'object') {
    const [attributes, ...rest] = items;
    // eslint-disable-next-line no-param-reassign
    items = rest;

    Object.entries(attributes).forEach(([key, value]) => {
      if (!key.startsWith('on')) {
        element.setAttribute(key, Array.isArray(value) ? value.join(' ') : value);
      } else {
        element.addEventListener(key.substring(2).toLowerCase(), value);
      }
    });
  }

  items.forEach((item) => {
    // eslint-disable-next-line no-param-reassign
    item = item instanceof Element || item instanceof HTMLElement
      ? item
      : document.createTextNode(item);
    element.appendChild(item);
  });

  return element;
}

/*
    More shorthand functions can be added for very common DOM elements below.
    domEl function from above can be used for one-off DOM element occurrences.
  */
export function div(...items) { return domEl('div', ...items); }
export function p(...items) { return domEl('p', ...items); }
export function a(...items) { return domEl('a', ...items); }
export function h1(...items) { return domEl('h1', ...items); }
export function h2(...items) { return domEl('h2', ...items); }
export function h3(...items) { return domEl('h3', ...items); }
export function h4(...items) { return domEl('h4', ...items); }
export function h5(...items) { return domEl('h5', ...items); }
export function h6(...items) { return domEl('h6', ...items); }
export function ul(...items) { return domEl('ul', ...items); }
export function li(...items) { return domEl('li', ...items); }
export function i(...items) { return domEl('i', ...items); }
export function img(...items) { return domEl('img', ...items); }
export function span(...items) { return domEl('span', ...items); }
export function input(...items) { return domEl('input', ...items); }
export function form(...items) { return domEl('form', ...items); }
export function button(...items) { return domEl('button', ...items); }

/**
 * A helper function that delays the execution of a function
 * @param {function} func the function to execute
 * @param {number} timeout the timeout in milliseconds, 200 by default
 * @returns {function} the function that will be executed after the timeout
 */
export function debounce(func, timeout = 200) {
  let timer;
  return (...args) => {
    clearTimeout(timer);

    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
}

/**
 * Returns the children of an element
 * @param {NodeList} elements list of tested elements
 * @param {String} childrenCheck check that will be ran for every element list
 * @returns list of elements that pass the children check
 */
export function getAllElWithChildren(elements, childrenCheck) {
  return [...elements].filter((el) => el.querySelector(childrenCheck));
}

/**
 * Adds attributes to all anchors and buttons that start with properties between [ brackets ]
 * @param {NodeList} links list of links to check if have properties to add as attributes
 */
export function checkLinkProps(links) {
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

const allLinks = [...document.querySelectorAll('a'), ...document.querySelectorAll('button')];
checkLinkProps(allLinks);

// fetch data helpers

/**
 * Returns a list of properties listed in the block
 * @param {string} route get the Json data from the route
 * @returns {Object} the json data object
*/
export const getJsonFromUrl = async (route) => {
  try {
    const response = await fetch(route, {
      method: 'GET',
      headers: {
        'Accept-Encoding': 'gzip',
      },
    });
    if (!response.ok) return null;
    const json = await response.json();
    return json;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('getJsonFromUrl:', { error });
  }
  return null;
};

/**
 * Save the fetched data in a temporary array
*/
const tempData = [];
/**
 * The default limit of the fetched data
 */
export const defaultLimit = 100_000;

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
    // eslint-disable-next-line no-console
    console.error('getInitialJSONData:', { error });
    return null;
  }
};

/**
 * Returns a more data if the limit is reached
 * @param {string} url get the Json data from the route
 * @param {number} total the total of the data
 * @param {number} offset the offset of the data
 * @param {number} limit the limit of the data
 * @returns {Object} the json data object
 * @example getMoreJSONData('https://roadchoice.com/api/news', 1000, 0, 100_000)
*/
async function getMoreJSONData(url, total, offset = 0, limit = defaultLimit) {
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
    // eslint-disable-next-line no-console
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
export const getLongJSONData = async (props) => {
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
export function loadWorker() {
  const worker = new Worker('/blocks/search/worker.js', { type: 'module' });
  // this just launch the worker, and the message listener is triggered in another script
  worker.postMessage('run');
  // this enable the search in any page
  worker.onmessage = (e) => { window.allProducts = e.data; };
  return worker;
}

/**
 * checks for p elements for different configurations
 * space -> [*space*]
 * button -> [*button*] (id) text content
*/
//  EXAMPLES:
//  - white spacing required in document -> [*space*]
//  - button with id -> [*button*] (cookie preference) Cookie preference center

(() => {
  const pElements = document.querySelectorAll('p');
  pElements.forEach((el) => {
    if (el.textContent === '[*space*]') {
      const spaceSpan = createElement('span', { classes: 'space' });
      el.replaceWith(spaceSpan);
    }
    if (el.textContent.includes('[*button*]')) {
      const id = el.textContent.match(/\((.*?)\)/)[1].toLowerCase().replace(/\s/g, '-');
      const textContent = el.textContent.split(')')[1].trim();
      const newBtn = createElement('a', {
        classes: ['button', 'primary'],
        props: { id },
        textContent,
      });
      el.textContent = '';
      el.classList.add('button-container');
      el.appendChild(newBtn);
    }
  });
})();
