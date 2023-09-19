import { createElement, getTextLabel } from '../../scripts/scripts.js';

const docRange = document.createRange();

function getQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  return { category: urlParams.get('category'), sku: urlParams.get('sku') };
}

function findPartBySKU(parts, sku) {
  return parts.find((part) => part['Base Part Number'].toLowerCase() === sku.toLowerCase());
}

async function getPDPData(pathSegments) {
  const { category, sku } = pathSegments;

  try {
    const route = `/product-data/rc-${category}.json`;
    const response = await fetch(route);
    const { data } = await response.json();
    return findPartBySKU(data, sku);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching part data:', error);
  }
  return null;
}

function findPartImagesBySKU(parts, sku) {
  return parts.filter((part) => part['Part Number'].toLowerCase() === sku.toLowerCase());
}

async function fetchPartImages(sku) {
  const placeholderImage = '/product-images/rc-placeholder-image.png';
  try {
    const route = '/product-images/road-choice-website-images.json';
    const response = await fetch(route);
    const { data } = await response.json();
    const images = findPartImagesBySKU(data, sku);

    if (images.length !== 0) {
      return images;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching part image(s):', error);
  }
  return [{ 'Image URL': placeholderImage }];
}

function renderColDetails(part, listEle) {
  // use an array to exclude certain details from json
  const colKeys = ['Base Part Number',
    'Mack Part Number',
    'Volvo Part Number',
    'Subcategory',
    'Subcategory2',
    'Order Type',
    'Part Name',
    'Category',
    'Parma',
  ];
  const keys = Object.keys(part);

  keys.forEach((key) => {
    if (!colKeys.includes(key) && part[key].length) {
      const liFragment = docRange.createContextualFragment(`<li class="pdp-list-item">
        <span class="pdp-list-item-title"> ${key}:</span>
        <span class="pdp-list-item-value"> ${part[key]}</span>
      </li>`);
      listEle.append(liFragment);
    }
  });
}

function renderImages(images, imgWraper) {
  const imageList = createElement('ul', { classes: 'pdp-image-list' });
  images.forEach((image, idx) => {
    const liFragment = docRange.createContextualFragment(`<li class="pdp-image-item ${idx === 0 ? 'active' : ''}"> 
      <img class="pdp-gallery-image" src=${image['Image URL']} />
    </li>`);
    imageList.append(liFragment);
  });
  imgWraper.append(imageList);
  imgWraper.addEventListener('click', (e) => {
    const target = e.target.closest('.pdp-image-item');
    if (target) {
      const activeImage = imgWraper.querySelector('.pdp-image-item.active');
      activeImage.classList.remove('active');
      target.classList.add('active');
      imgWraper.querySelector('.pdp-selected-image img').src = target.querySelector('img').src;
    }
  });
}

function renderPartDetails(part, block, images) {
  const fragment = `
    <div class="pdp-details-wrapper">
      <div class="pdp-image-column">
        <div class="pdp-image-wrapper">
          <div class="pdp-selected-image">
            <img class="pdp-image" src=${images[0]['Image URL']} />
          </div>
        </div>
      </div>
      <div class="pdp-content-coulmn">
        <h1 class="pdp-title">${part['Base Part Number']}</h1>
        <div class="pdp-description"> ${part['Part Name']}</div>
        <ul class="pdp-list"></ul>
      </div>
    </div>
  `;

  const pdpFragment = docRange.createContextualFragment(fragment);
  block.append(pdpFragment);
  renderColDetails(part, block.querySelector('.pdp-list'));

  if (images.length > 1) {
    renderImages(images, block.querySelector('.pdp-image-wrapper'));
  }
}

// filter the catalogs by category and group them by language
function findCatalogsPDSByCategory(data, category) {
  const catalogs = data
    .filter((catalog) => catalog.type.toLowerCase() !== 'manual')
    .filter((catalog) => catalog.category.replace(/[^\w]/g, '').toLowerCase() === category.replace(/[^\w]/g, '').toLowerCase());

  if (catalogs) {
    return catalogs.reduce((acc, cur) => {
      acc[cur.language] = acc[cur.language] || [];
      acc[cur.language].push(cur);
      return acc;
    }, {});
  }
  return [];
}

// filter the manuals by category and group them by language
function findManualsByCategory(data, category) {
  const catalogs = data
    .filter((catalog) => catalog.type.toLowerCase() === 'manual')
    .filter((catalog) => catalog.category.replace(/[^\w]/g, '').toLowerCase() === category.replace(/[^\w]/g, '').toLowerCase());

  if (catalogs) {
    return catalogs.reduce((acc, cur) => {
      acc[cur.language] = acc[cur.language] || [];
      acc[cur.language].push(cur);
      return acc;
    }, {});
  }
  return [];
}

// Check if product has catalog, product sheet , ecatalaogs section
async function fetchCatalogDocs(category) {
  try {
    const route = '/catalogs-categories.json';
    const response = await fetch(route);
    const { data } = await response.json();

    return {
      catalogs: findCatalogsPDSByCategory(data, category),
      manuals: findManualsByCategory(data, category),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching part catalogs:', error);
  }
  return null;
}

function renderCatlaogs(catalogs) {
  const catalogContainer = document.querySelector('.pdp-catalogs');
  const sectionWrapper = catalogContainer.querySelector('.default-content-wrapper');
  if (!catalogContainer || !sectionWrapper || !Object.keys(catalogs).length) return;

  const fragment = docRange.createContextualFragment(`
      <ul class="pdp-catalogs-list"></ul>
  `);
  sectionWrapper.append(fragment);

  Object.entries(catalogs).forEach(([language, catalog]) => {
    const catalogFragment = docRange.createContextualFragment(`
      <li class="pdp-catalogs-list-item">
        <div class="pdp-catalogs-list-title">${getTextLabel(language)}</div>
        <div class="pdp-catalogs-list-link">
          ${catalog.map((catalogItem) => `<a target="_blank" href="${catalogItem.file}">${catalogItem.title}</a>`).join('')}
        </div>
      </li>
    `);
    sectionWrapper.querySelector('.pdp-catalogs-list').append(catalogFragment);
  });
  catalogContainer.classList.remove('hide');
}

function renderManuals(manualList) {
  const manualContainer = document.querySelector('.pdp-manuals');
  const sectionWrapper = manualContainer.querySelector('.default-content-wrapper');
  if (!manualContainer || !sectionWrapper || !Object.keys(manualList).length) return;

  const fragment = docRange.createContextualFragment(`
    <ul class="pdp-manuals-list"></ul>
  `);
  sectionWrapper.append(fragment);

  Object.entries(manualList).forEach(([language, manuals]) => {
    const manualsFragment = docRange.createContextualFragment(`
      <li class="pdp-manuals-list-item">
        <div class="pdp-manuals-list-title">${getTextLabel(language)}</div>
        <div class="pdp-manuals-list-link">
          ${manuals.map((manualIitem) => `<a target="_blank" href="${manualIitem.file}">${manualIitem.title}</a>`).join('')}
        </div>
      </li>
    `);
    sectionWrapper.querySelector('.pdp-manuals-list').append(manualsFragment);
  });
  manualContainer.classList.remove('hide');
}

// Check if product has catalog, product sheet , ecatalaogs section
async function fetchSDS(category) {
  try {
    const route = '/sds-categories.json';
    const response = await fetch(route);
    const { data } = await response.json();

    const sdsList = data.filter((catalog) => catalog.category.replace(/[^\w]/g, '').toLowerCase() === category.replace(/[^\w]/g, '').toLowerCase());
    return sdsList;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching part SDS:', error);
  }
  return null;
}

function renderSDS(sdsList) {
  const sdsContainer = document.querySelector('.pdp-sds');
  const sectionWrapper = sdsContainer.querySelector('.default-content-wrapper');
  if (!sdsContainer || !sectionWrapper || !sdsList.length) return;

  const fragment = docRange.createContextualFragment(`
    <ul class="pdp-sds-list"></ul>
  `);
  sectionWrapper.append(fragment);

  sdsList.forEach((sds) => {
    const sdsFragment = docRange.createContextualFragment(`
      <li class="pdp-sds-list-item">
        <a target="_blank" href="${sds.file}">${sds.title}</a>
      </li>
    `);
    sectionWrapper.querySelector('.pdp-sds-list').append(sdsFragment);
  });
  sdsContainer.classList.remove('hide');
}

function setOrCreateMetadata(propName, propVal) {
  const meta = document.head.querySelector(`meta[property="${propName}"]`);
  if (meta) {
    meta.setAttribute('content', propVal);
  } else {
    const newMeta = createElement('meta', {
      props: {
        property: propName,
        content: propVal,
      },
    });
    document.head.appendChild(newMeta);
  }
}

function updateMetadata(part, images) {
  setOrCreateMetadata('og:title', part['Base Part Number']);
  setOrCreateMetadata('og:description', part['Part Name']);
  setOrCreateMetadata('og:url', window.location.href);
  setOrCreateMetadata('og:image', images[0]['Image URL']);
  setOrCreateMetadata('twitter:title', part['Base Part Number']);
  setOrCreateMetadata('twitter:description', part['Part Name']);
  setOrCreateMetadata('twitter:image', images[0]['Image URL']);
}

function renderBreadcrumbs(part) {
  const breadcrumbSection = document.querySelector('.section.breadcrumbs');
  if (!breadcrumbSection) return;

  const breadcrumbs = docRange.createContextualFragment(`
    <div class="breadcrumb-wrapper">
      <div class="breadcrumb block">
        <div class="breadcrumb-content">
          <ul class="breadcrumb-list">
            <li class="breadcrumb-item breadcrumb-item-0">
              <a class="breadcrumb-link" href="/">Road Choice</a>
            </li>
            <li class="breadcrumb-item breadcrumb-item-0">
              <a class="breadcrumb-link" href="/">Parts</a>
            </li>
            <li class="breadcrumb-item breadcrumb-item-1">
              <a class="breadcrumb-link" href="/part-category/${part.Category.toLowerCase()}">${part.Category}</a>
            </li>
            <li class="breadcrumb-item breadcrumb-item-2">
              <a class="breadcrumb-link" href="/part-category/${part.Subcategory.toLowerCase()}">${part.Subcategory}</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `);
  breadcrumbSection.append(breadcrumbs);
}

export default async function decorate(block) {
  // document.querySelector('main .search').classList.add('hide');
  const pathSegments = getQueryParams();
  const part = await getPDPData(pathSegments);

  if (part) {
    fetchPartImages(part['Base Part Number']).then((images) => {
      renderBreadcrumbs(part, block);
      updateMetadata(part, images);
      renderPartDetails(part, block, images);
    });
  }

  // check if we have catalogs, PDS section
  fetchCatalogDocs(pathSegments.category).then(({ catalogs, manuals }) => {
    if (catalogs) {
      renderCatlaogs(catalogs);
    }
    if (manuals) {
      renderManuals(manuals);
    }
  });

  // check if we have SDS
  fetchSDS(pathSegments.category).then((sdsList) => {
    if (sdsList) {
      renderSDS(sdsList);
    }
  });

  document.querySelector('main').addEventListener('click', (e) => {
    if (e.target.matches('.section.accordion h3')) {
      e.target.closest('.section.accordion').classList.toggle('accordion-open');
    }
  });
}
