import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateBlocks,
  decorateBlock,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateTemplateAndTheme,
  waitForFirstImage,
  getMetadata,
  loadSection,
  loadSections,
  loadBlock,
  loadCSS,
  toClassName,
  createOptimizedPicture,
} from './aem.js';

import { addFavIcon, createElement, getPlaceholders, loadDelayed, variantsClassesToBEM, loadTemplate } from './common.js';

const disableHeader = getMetadata('disable-header').toLowerCase() === 'true';
const disableFooter = getMetadata('disable-footer').toLowerCase() === 'true';

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

  if (heroBlock) {
    return;
  }

  if (header && picture && header.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING) {
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, header] }));
    section.querySelector('.hero').classList.add('auto-block');
    main.prepend(section);
  }
}

function buildSearchForm(main, head) {
  const noSearchBlock = head.querySelector('meta[name="no-search"]');
  if (noSearchBlock) {
    return;
  }
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
      const external =
        !url.host.match('roadchoice.com') &&
        !url.host.match('.hlx.(page|live)') &&
        !url.host.match('.aem.(page|live)') &&
        !url.host.match('localhost');
      if (url.host.match('build.roadchoice.com') || url.pathname.endsWith('.pdf') || external) {
        link.target = '_blank';
      }
    });
}

function decorateSectionBackgrounds(main) {
  const variantClasses = ['black-bg', 'white-bg', 'primary-red-bg', 'primary-medium-gray-bg', 'secondary-red-bg', 'no-vertical-padding'];

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

/**
 * Don't know what to name this function.
 * This is legacy code that handles some special content...
 * Will leave this here for now... :( sorry
 * @param {Element} main The main element
 */
function decorateSpecial() {
  const pElements = document.querySelectorAll('p');
  pElements.forEach((el) => {
    if (el.textContent === '[*space*]') {
      const spaceSpan = createElement('span', { classes: 'space' });
      el.replaceWith(spaceSpan);
    }
    if (el.textContent.includes('[*button*]')) {
      const id = el.textContent
        .match(/\((.*?)\)/)[1]
        .toLowerCase()
        .replace(/\s/g, '-');
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
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
export function decorateMain(main, head) {
  if (head) {
    const pageStyle = head.querySelector('[name="style"]')?.content;
    if (pageStyle) {
      pageStyle
        .split(',')
        .map((style) => toClassName(style.trim()))
        .forEach((style) => main.classList.add(style));
    }
  }
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main, head);
  decorateSections(main);
  decorateBlocks(main);
  decorateSectionBackgrounds(main);
  decorateLinks(main);
  decorateSpecial();
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  const meta_i18n = doc.querySelector('meta[name="i18n"]');
  const meta_locale = doc.querySelector('meta[name="locale"]');
  document.documentElement.lang = (meta_i18n && meta_i18n.content) || (meta_locale && meta_locale.content.toLowerCase()) || 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  const { head } = doc;
  if (main) {
    decorateMain(main, head);
    document.body.classList.add('appear');

    await getPlaceholders();

    await loadSection(main.querySelector('.section'), waitForFirstImage);
  } else {
    await getPlaceholders();
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const templateName = getMetadata('template');
  if (templateName) {
    await loadTemplate(doc, templateName);
  }

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) {
    element.scrollIntoView();
  }
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

  // TODO: Should we load fonts here like in:
  // https://github.com/adobe/aem-boilerplate/blob/main/scripts/scripts.js
  // (look for `loadFonts`)

  import('../tools/sidekick/aem-genai-variations.js');
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
