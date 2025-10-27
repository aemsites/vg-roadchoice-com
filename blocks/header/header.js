import { getMetadata } from '../../scripts/aem.js';
import { createElement } from '../../scripts/common.js';
import { fetchCategories } from '../search/graphql-api.js';

// media query match that indicates mobile/tablet width
const MQ = window.matchMedia('(min-width: 992px)');
const isDesktop = MQ.matches;
let categoriesClone;
const docRange = document.createRange();

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop) {
      navSectionExpanded.focus();
    } else if (!isDesktop) {
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

function HideOtherNavItems(parent, element) {
  const { children } = parent;
  if (parent.classList.contains('level-2')) {
    parent.closest('.has-sublevel').classList.add('next-level');
  }
  const otherItems = [...children].filter((item) => item !== element);
  otherItems.forEach((item) => item.classList.add('hide'));
}

function ShowOtherNavItems(parent) {
  const { children } = parent;
  if (parent.classList.contains('level-2')) {
    parent.closest('.has-sublevel').classList.remove('next-level');
  }
  [...children].forEach((item) => item.classList.remove('hide'));
}

function buildSubSection(sectionNavs) {
  [...sectionNavs].forEach((ul) => {
    const lvlWrapper = ul.closest('li');
    const arrowRight = createElement('span', { classes: ['icon', 'fa', 'fa-arrow-right'] });
    const arrowLeft = createElement('span', { classes: ['icon', 'fa', 'fa-arrow-left', 'hide'] });
    lvlWrapper.appendChild(arrowRight);
    lvlWrapper.prepend(arrowLeft);
    lvlWrapper.classList.add('has-sublevel');
    arrowRight.onclick = () => {
      lvlWrapper.classList.add('show');
      lvlWrapper.setAttribute('aria-expanded', 'true');
      HideOtherNavItems(lvlWrapper.parentElement, lvlWrapper);
      arrowRight.classList.add('hide');
      arrowLeft.classList.remove('hide');
    };
    arrowLeft.onclick = () => {
      lvlWrapper.classList.remove('show');
      lvlWrapper.setAttribute('aria-expanded', 'false');
      ShowOtherNavItems(lvlWrapper.parentElement);
      arrowRight.classList.remove('hide');
      arrowLeft.classList.add('hide');
    };
  });
}

function setupNextLevelList(navSections, selector, level) {
  navSections.querySelectorAll(selector).forEach((navSection) => {
    const nextLevelList = navSection.querySelector('ul');
    if (nextLevelList) {
      nextLevelList.className = `level-${level}`;
      navSection.classList.add('nav-drop');
      navSection.setAttribute('aria-expanded', 'false');
    }
  });
  if (level === 2) {
    const categories = navSections.querySelector('.nav-drop');
    categories.classList.add('categories');
    categoriesClone = categories.cloneNode(true);
    if (isDesktop) {
      categories.onclick = (e) => {
        e.preventDefault();
        const li = e.target.localName === 'a' ? e.target.closest('li') : e.target;
        const expanded = li.getAttribute('aria-expanded') === 'true';
        li.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        categoriesClone.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      };
    }
  }
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = expanded || isDesktop ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  const navDrops = navSections.querySelectorAll('.nav-drop');
  if (isDesktop) {
    navDrops.forEach((drop) => {
      if (!drop.hasAttribute('tabindex')) {
        drop.setAttribute('role', 'button');
        drop.setAttribute('tabindex', 0);
        drop.addEventListener('focus', focusNavSection);
      }
    });
  } else {
    navDrops.forEach((drop) => {
      drop.removeAttribute('role');
      drop.removeAttribute('tabindex');
      drop.removeEventListener('focus', focusNavSection);
    });
  }
  // enable menu collapse on escape keypress
  if (!expanded || isDesktop) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
  }
}

const rawCategoryList = await fetchCategories();
const parsedCategories = rawCategoryList.reduce((accumulator, currentItem) => {
  const categoryKey = currentItem.key;
  const subcategoryKeys = currentItem.subcategories.map((sub) => sub.key);
  accumulator[categoryKey] = subcategoryKeys;
  return accumulator;
}, {});

function buildListsEls(allCategoryData) {
  let htmlString = '';

  for (const category in allCategoryData) {
    if (Object.hasOwnProperty.call(allCategoryData, category)) {
      htmlString += '<li>';

      const categoryLink = `/part-category/${category.toLowerCase().replace(/\s+/g, '-')}`;
      htmlString += `<a href="${categoryLink}">${category.toUpperCase()}</a>`;

      htmlString += '<ul>';

      allCategoryData[category].forEach((subCategory) => {
        const subCategoryLink = `/part-category/${subCategory.toLowerCase().replace(/\s+/g, '-')}`;
        htmlString += `<li><a href="${subCategoryLink}">${subCategory}</a></li>`;
      });

      htmlString += '</ul>';
      htmlString += '</li>';
    }
  }
  return htmlString;
}

const buildCategorySection = (section, categories) => {
  const listPlacement = section.querySelector('ul li:first-of-type');
  const subCategoryList = docRange.createContextualFragment(`
      <ul class="level-2" >
        ${buildListsEls(categories)}
      </ul>
      `);

  listPlacement.appendChild(subCategoryList);
};

/**
 * decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // fetch nav content
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const resp = await fetch(`${navPath}.plain.html`);

  if (resp.ok) {
    block.textContent = '';
    const html = await resp.text();

    // decorate nav DOM
    const nav = createElement('nav', { props: { id: 'nav' } });
    const navFragment = docRange.createContextualFragment(html);
    nav.appendChild(navFragment);

    const classes = ['brand', 'sections', 'tools'];
    classes.forEach((c, i) => {
      const section = nav.children[i];
      if (section) section.classList.add(`nav-${c}`);
    });

    // add a link to the image logo brand
    const navBrand = nav.querySelector('.nav-brand');
    if (navBrand) {
      const link = createElement('a', { props: { title: 'Road choice', href: '/' } });
      const picture = navBrand.querySelector('picture');
      link.appendChild(picture);
      navBrand.appendChild(link);
    }

    const navSections = nav.querySelector('.nav-sections');
    buildCategorySection(navSections, parsedCategories);

    if (navSections) {
      const navLevels = 3;
      let selector = ':scope';
      for (let i = 2; i <= navLevels; i += 1) {
        selector += ' > ul > li';
        setupNextLevelList(navSections, selector, i);
      }

      // add css classes for styling purposes
      const sectionClasses = ['main', 'mobile'];
      const sectionNavs = navSections.querySelectorAll(':scope > ul');
      if (sectionNavs.length === sectionClasses.length) {
        const sectionPDFs = navSections.querySelectorAll('a[href$=".pdf"]');
        [...sectionPDFs].forEach((pdf) => {
          pdf.target = '_blank';
        });
        sectionNavs[0].className = 'level-1';
        sectionClasses.forEach((c, i) => sectionNavs[i].classList.add(`nav-sections-${c}`));
      }
      for (let i = 2; i <= navLevels; i += 1) {
        const subSectionNav = sectionNavs[0].querySelectorAll(`ul.level-${i}`);
        if (subSectionNav) buildSubSection(subSectionNav);
      }
    }

    // hamburger for mobile
    const hamburger = createElement('div', { classes: 'nav-hamburger' });
    const hamburgerInnerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
    <span class="nav-hamburger-icon"></span>
    </button>`;
    const fragment = docRange.createContextualFragment(hamburgerInnerHTML);
    hamburger.appendChild(fragment);
    hamburger.onclick = () => toggleMenu(nav, navSections);
    nav.prepend(hamburger);
    nav.setAttribute('aria-expanded', 'false');
    // prevent mobile nav behavior on window resize
    if (isDesktop) toggleMenu(nav, navSections, !isDesktop);

    const navWrapper = createElement('div', { classes: 'nav-wrapper' });
    navWrapper.append(nav);

    // move tools as direct children of nav-wrapper
    const navTools = nav.querySelector('.nav-tools');
    navWrapper.appendChild(navTools);
    if (categoriesClone) {
      navTools.prepend(categoriesClone);
    }

    block.append(navWrapper);
  }
}
