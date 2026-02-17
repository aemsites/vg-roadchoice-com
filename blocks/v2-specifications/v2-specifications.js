import { createElement, slugify, removeEmptyTags } from '../../scripts/common.js';

const BLOCK_NAME = 'v2-specifications';
const DESKTOP_MEDIA_QUERY = '(min-width: 1200px)';
const FALLBACK_SECTION_ID = 'id-specifications';

/**
 * Computes the heading level used as "section title" delimiter for this block.
 * Convention: the closest section may define `data-header`, e.g. "Title 5",
 * and we use the last character ("5") as the heading level.
 *
 * @param {HTMLElement} block
 * @returns {string} Heading level character (e.g. "3", "5")
 */
const computeTitleHeadingLevel = (block) => {
  const meta = block.closest('.section')?.dataset?.header || 3;
  const value = String(meta);
  return value.charAt(value.length - 1);
};

/**
 * Checks whether a row starts a new specs section (i.e. contains the section title heading).
 *
 * @param {Element} row
 * @param {string} titleHeadingLevel
 * @returns {boolean}
 */
const isSectionTitleRow = (row, titleHeadingLevel) => !!row.querySelector(`h${titleHeadingLevel}`);

/**
 * Builds a stable section id from a title row by slugifying the title text.
 *
 * @param {Element} row
 * @param {string} titleHeadingLevel
 * @returns {string} e.g. "id-loose-items"
 */
const buildSectionIdFromTitleRow = (row, titleHeadingLevel) => {
  const heading = row.querySelector(`h${titleHeadingLevel}`);
  const text = heading?.textContent?.trim() || row.textContent.trim();
  return `id-${slugify(text)}`;
};

/**
 * Converts author-provided buttons into standalone links.
 *
 * @param {Element} row
 * @returns {void}
 */
const convertButtonsToStandaloneLinks = (row) => {
  row.querySelectorAll('.button-container a').forEach((a) => {
    a.classList.replace('button', 'standalone-link');
  });
};

/**
 * Marks inner headings as subtitle headings for consistent styling.
 *
 * @param {HTMLElement[]} headings
 * @returns {void}
 */
const markInnerHeadingsAsSubtitles = (headings) => {
  headings.forEach((h) => {
    h.classList.add(`${BLOCK_NAME}__subtitle`, 'h5');
  });
};

/**
 * Applies row modifier classes depending on the content type (text, pictures, links)
 * and updates link/button styling where needed.
 *
 * @param {Element} row
 * @returns {void}
 */
const applyRowStyleModifiers = (row) => {
  const headings = [...row.querySelectorAll('h1,h2,h3,h4,h5,h6')];
  const hasInnerHeadings = headings.length > 0;
  const hasPicture = !!row.querySelector('picture');
  const hasLink = !!row.querySelector('.button-container a');

  const modifiers = [];

  if (hasInnerHeadings) {
    modifiers.push(`${BLOCK_NAME}__list--subtitle`);
  }
  if (hasPicture) {
    modifiers.push(`${BLOCK_NAME}__list--with-pictures`);
  }
  if (hasLink) {
    modifiers.push(`${BLOCK_NAME}__list--with-link`);
  }
  if (!hasPicture && !hasLink) {
    modifiers.push(`${BLOCK_NAME}__list--with-text`);
  }

  row.classList.add(...modifiers);

  if (hasLink) {
    convertButtonsToStandaloneLinks(row);
  }
  if (hasInnerHeadings) {
    markInnerHeadingsAsSubtitles(headings);
  }
};

/**
 * Builds a specs section container with header button and content container.
 * The section id is used both for linking and for external accordion references.
 *
 * @param {string} sectionId
 * @param {Element | null} titleEl
 * @returns {{ sectionEl: HTMLElement, contentEl: HTMLElement }}
 */
const buildSection = (sectionId, titleEl) => {
  const sectionEl = createElement('div', {
    classes: [`${BLOCK_NAME}__item`, `${BLOCK_NAME}__item-close`, sectionId],
    props: { id: sectionId, 'data-block-status': 'loaded' },
  });

  const buttonEl = createElement('button', {
    classes: [`${BLOCK_NAME}__button`],
    props: { type: 'button' },
  });

  if (titleEl) {
    titleEl.classList.add(`${BLOCK_NAME}__title`);
    buttonEl.append(titleEl);
  }

  const contentEl = createElement('div', {
    classes: [`${BLOCK_NAME}__content`],
  });

  sectionEl.append(buttonEl, contentEl);

  return { sectionEl, contentEl };
};

/**
 * Wires click toggle behavior for mobile/tablet.
 * On desktop, sections are non-interactive and rely on CSS to keep content visible.
 *
 * @param {HTMLElement} root
 * @returns {void}
 */
const wireMobileSectionToggle = (root) => {
  const mq = window.matchMedia(DESKTOP_MEDIA_QUERY);

  root.addEventListener('click', (e) => {
    if (mq.matches) {
      return;
    }

    const buttonEl = e.target.closest(`.${BLOCK_NAME}__button`);
    if (!buttonEl || !root.contains(buttonEl)) {
      return;
    }

    const sectionEl = buttonEl.closest(`.${BLOCK_NAME}__item`);
    if (sectionEl) {
      sectionEl.classList.toggle(`${BLOCK_NAME}__item-close`);
    }
  });
};

/**
 * Builds specification sections with mobile accordion behaviour.
 *
 * @param {HTMLElement} block
 * @returns {Promise<void>}
 */
export default async function decorate(block) {
  const titleHeadingLevel = computeTitleHeadingLevel(block);
  const rows = [...block.querySelectorAll(':scope > div')];

  const sectionsEl = createElement('div', {
    classes: [`${BLOCK_NAME}__sections`],
  });

  let activeSection = null;

  const getOrCreateFallbackSection = () => {
    if (activeSection) {
      return activeSection;
    }

    activeSection = buildSection(FALLBACK_SECTION_ID, null);
    sectionsEl.appendChild(activeSection.sectionEl);
    return activeSection;
  };

  rows.forEach((row) => {
    if (isSectionTitleRow(row, titleHeadingLevel)) {
      const sectionId = buildSectionIdFromTitleRow(row, titleHeadingLevel);
      const titleEl = row.querySelector(':scope > div') || row;

      activeSection = buildSection(sectionId, titleEl);
      sectionsEl.appendChild(activeSection.sectionEl);
      return;
    }

    const { contentEl } = getOrCreateFallbackSection();
    applyRowStyleModifiers(row);
    contentEl.appendChild(row);
  });

  block.textContent = '';
  block.appendChild(sectionsEl);

  removeEmptyTags(block);
  wireMobileSectionToggle(block);
}
