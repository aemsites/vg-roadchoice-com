import {
  sampleRUM,
  buildBlock,
  loadHeader,
  loadFooter,
  decorateBlocks,
  decorateBlock,
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
  createOptimizedPicture,
} from './lib-franklin.js';

import {
  addFavIcon,
  createElement,
  decorateIcons,
  getPlaceholders,
  loadDelayed,
  slugify,
  variantsClassesToBEM,
} from './common.js';

const disableHeader = getMetadata('disable-header').toLowerCase() === 'true';
const disableFooter = getMetadata('disable-footer').toLowerCase() === 'true';

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
 * Decorates all sections in a container element.
 * @param {Element} main The container element
 */
export function decorateSections(main) {
  main.querySelectorAll(':scope > div').forEach((section) => {
    const wrappers = [];
    let defaultContent = false;
    [...section.children].forEach((e) => {
      if (e.tagName === 'DIV' || !defaultContent) {
        const wrapper = document.createElement('div');
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
 * Reparents all child elements of a given element to its parent element.
 * @param {Element} element - The element whose children need to be reparented.
 */
const reparentChildren = (element) => {
  const parent = element.parentNode;
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  element.remove();
};

/**
 * Determines the appropriate button class based on the element hierarchy.
 * @param {Element} up - The parent element of the anchor tag.
 * @param {Element} twoUp - The grandparent element of the anchor tag.
 * @returns {string} - The button class to be applied.
 */
const getButtonClass = (up, twoUp) => {
  const isSingleChild = (element) => element.childNodes.length === 1;

  const upTag = up.tagName;
  const twoUpTag = twoUp.tagName;

  if (isSingleChild(twoUp)) {
    if (upTag === 'STRONG' && twoUpTag === 'P') return 'button button--primary';
    if (upTag === 'STRONG' && twoUpTag === 'LI') return 'button arrowed';
    if (upTag === 'EM' && twoUpTag === 'P') return 'button button--secondary';
  }

  if ((upTag === 'STRONG' || upTag === 'EM') && (twoUpTag === 'STRONG' || twoUpTag === 'EM')) {
    return 'button button--red';
  }

  return '';
};

/**
 * Adds the 'button-container' class to an element if it meets certain criteria.
 * @param {Element} element - The element to add the class to.
 */
const addClassToContainer = (element) => {
  if (element.childNodes.length === 1 && ['P', 'DIV', 'LI'].includes(element.tagName)) {
    element.classList.add('button-container');
  }
};

/**
 * Handles the decoration of a single link element.
 * @param {HTMLAnchorElement} link - The anchor tag to decorate.
 */
const handleLinkDecoration = (link) => {
  const up = link.parentElement;
  const twoUp = up.parentElement;
  const threeUp = twoUp.parentElement;

  if (getMetadata('style') === 'redesign-v2') {
    if (['STRONG', 'EM'].includes(up.tagName)) reparentChildren(up);
    if (['STRONG', 'EM'].includes(twoUp.tagName)) reparentChildren(twoUp);

    const buttonClass = getButtonClass(up, twoUp);
    if (buttonClass) link.className = `${buttonClass}`;

    addClassToContainer(up);
    addClassToContainer(twoUp);
    addClassToContainer(threeUp);
  } else {
    // TODO: remove v1 button decoration logic when v2 is fully used
    if (up.tagName === 'P' || up.tagName === 'DIV') {
      link.className = 'button button--primary'; // default
      up.className = 'button-container';
    }
    if (up.tagName === 'STRONG' && twoUp.childNodes.length === 1 && twoUp.tagName === 'P') {
      link.className = 'button button--primary';
      twoUp.className = 'button-container';
    }
    if (up.tagName === 'EM' && twoUp.childNodes.length === 1 && twoUp.tagName === 'P') {
      link.className = 'button button--secondary';
      twoUp.className = 'button-container';
    }
    if (up.tagName === 'STRONG' && twoUp.childNodes.length === 1 && twoUp.tagName === 'LI') {
      const arrow = createElement('span', { classes: ['fa', 'fa-arrow-right'] });
      link.className = 'button arrowed';
      twoUp.parentElement.className = 'button-container';
      link.appendChild(arrow);
    }
    if (up.tagName === 'LI' && twoUp.children.length === 1
      && link.children.length > 0 && link.firstElementChild.tagName === 'STRONG') {
      const arrow = createElement('span', { classes: ['fa', 'fa-arrow-right'] });
      link.className = 'button arrowed';
      twoUp.className = 'button-container';
      link.appendChild(arrow);
    }
  }
};

/**
 * Checks if an anchor tag should be decorated as a button.
 * @param {HTMLAnchorElement} link - The anchor tag to check.
 * @returns {boolean} - Returns true if the link should be decorated, otherwise false.
 */
const shouldDecorateLink = (link) => {
  link.title = link.title || link.textContent;
  return link.href !== link.textContent && !link.querySelector('img') && link.parentElement.childNodes.length === 1;
};

/**
 * Applies button styling to anchor tags within a specified element,
 * decorating them as button-like if they meet certain criteria.
 * @param {Element} element - The container element within which to search and style anchor tags.
 */
export const decorateButtons = (element) => {
  element.querySelectorAll('a').forEach((link) => {
    if (shouldDecorateLink(link)) {
      handleLinkDecoration(link);
    }
  });
};

const LCP_BLOCKS = []; // add your LCP blocks to the list
window.hlx.RUM_GENERATION = 'project-1'; // add your RUM generation information here
window.mack = window.mack || {};
window.mack.newsData = window.mack.newsData || {
  news: [],
  offset: 0,
  allLoaded: false,
};

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
  const heroBlock = main.querySelector('.hero, .v2-hero');

  if (isCarousel || heroBlock) {
    return;
  }

  if (heroBlock) return;
  // eslint-disable-next-line no-bitwise
  if (header && picture
    // eslint-disable-next-line no-bitwise
    && (header.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    const section = document.createElement('div');
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

function buildSubNavigation(main, head) {
  const subnav = head.querySelector('meta[name="sub-navigation"]');
  if (subnav && subnav.content.startsWith('/')) {
    const block = buildBlock('sub-nav', []);
    main.previousElementSibling.prepend(block);
    decorateBlock(block);
  }
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
      buildSubNavigation(main, head);
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
      const external = !url.host.match('roadchoice.com')
      && !url.host.match('.hlx.(page|live)')
      && !url.host.match('.aem.(page|live)')
      && !url.host.match('localhost');
      if (url.host.match('build.roadchoice.com') || url.pathname.endsWith('.pdf') || external) {
        link.target = '_blank';
      }
    });
}

function decorateSectionBackgrounds(main) {
  const variantClasses = [
    'black-bg',
    'white-bg',
    'primary-red-bg',
    'primary-medium-gray-bg',
    'secondary-red-bg',
    'no-vertical-padding',
  ];

  main.querySelectorAll(':scope > .section').forEach((section) => {
    // transform background color variants into BEM classnames
    variantsClassesToBEM(section.classList, variantClasses, 'section');

    // If the section contains a background image
    const src = section.dataset.backgroundImage;

    if (src) {
      const picture = createOptimizedPicture(src, '', false);
      section.prepend(picture);
      section.classList.add('section--with-background');
    }
  });
}

const createInpageNavigation = (main) => {
  const navItems = [];
  const tabItemsObj = [];

  // Extract the inpage navigation info from sections
  [...main.querySelectorAll(':scope > div')].forEach((section) => {
    const title = section.dataset.inpage;
    if (title) {
      const countDuplcated = tabItemsObj.filter((item) => item.title === title)?.length || 0;
      const order = parseFloat(section.dataset.inpageOrder);
      const anchorID = (countDuplcated > 0) ? slugify(`${section.dataset.inpage}-${countDuplcated}`) : slugify(section.dataset.inpage);
      const obj = {
        title,
        id: anchorID,
      };

      if (order) {
        obj.order = order;
      }

      tabItemsObj.push(obj);

      // Set section with ID
      section.dataset.inpageid = anchorID;
    }
  });

  // Sort the object by order
  const sortedObject = tabItemsObj.slice().sort((obj1, obj2) => {
    const order1 = obj1.order ?? Infinity; // Fallback to a large number if 'order' is not present
    const order2 = obj2.order ?? Infinity;

    return order1 - order2;
  });

  // From the array of objects create the DOM
  sortedObject.forEach((item) => {
    const subnavItem = createElement('div');
    const subnavLink = createElement('button', {
      props: {
        'data-id': item.id,
        title: item.title,
      },
    });

    subnavLink.textContent = item.title;

    subnavItem.append(subnavLink);
    navItems.push(subnavItem);
  });

  return navItems;
};

export function buildInpageNavigationBlock(main, classname) {
  const items = createInpageNavigation(main);

  if (items.length > 0) {
    const section = createElement('div');
    Object.assign(section.style, {
      height: '48px',
      overflow: 'hidden',
    });

    section.append(buildBlock(classname, { elems: items }));
    // insert in second position, assumption is that Hero should be first
    main.insertBefore(section, main.children[1]);

    decorateBlock(section.querySelector(`.${classname}`));
  }
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main, head) {
  if (head) {
    const pageStyle = head.querySelector('[name="style"]')?.content;
    if (pageStyle) {
      pageStyle.split(',')
        .map((style) => toClassName(style.trim()))
        .forEach((style) => main.classList.add(style));
    }
  }
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main, head);
  decorateSections(main);
  decorateBlocks(main);
  decorateSectionBackgrounds(main);
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
  const { head } = doc;
  if (main) {
    decorateMain(main, head);
    document.body.classList.add('appear');
    await waitForLCP(LCP_BLOCKS);
  }

  await getPlaceholders();
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

  if (!disableHeader) {
    loadHeader(header);
  }
  if (!disableFooter) {
    loadFooter(doc.querySelector('footer'));
  }

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

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();

/* this function load script only when it wasn't loaded yet */
const scriptMap = new Map();

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
 *
 * @param {string} blockName - block name with '-' instead of spaces
 * @param {string} blockContent - the content that will be set as block inner HTML
 * @param {object} options - other options like variantsClasses
 * @returns
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
 * @param {NodeList} elements list of tested elements
 * @param {String} childrenCheck check that will be run for every element list
 * @param {boolean} [isOpposite=false] Flag to contemplate an edge case that is the opposite case
 * @returns list of elements that pass the children check
 */
export function getAllElWithChildren(elements, childrenCheck, isOpposite = false) {
  if (isOpposite) return [...elements].filter((el) => !el.querySelector(childrenCheck));
  return [...elements].filter((el) => el.querySelector(childrenCheck));
}
