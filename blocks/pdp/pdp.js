import {
  createElement,
  getTextLabel,
  getJsonFromUrl,
  getLongJSONData,
  DEFAULT_LIMIT,
  getLocaleContextedUrl,
  setOrCreateMetadata,
  getCategoryObject,
} from '../../scripts/common.js';
import { createOptimizedPicture, getMetadata } from '../../scripts/aem.js';
import { fetchArticlesAndFacets } from '../search/graphql-api.js';

const blockName = 'pdp';
const docTypes = {
  catalog: ['catalog', 'product-data-sheet'],
  manual: ['manual'],
};
const docRange = document.createRange();
const SUPPORTED_LOCALES_WITH_PREFIX = ['en-ca', 'fr-ca'];
let blogCategory;

function getJsonData(route) {
  const requestUrl = new URL(window.location.origin + route);
  requestUrl.search = new URLSearchParams({
    limit: 100000,
  }).toString();

  return getJsonFromUrl(requestUrl, {
    limit: 100000,
  });
}

function getPathParams() {
  // Remove trailing slash if present
  const cleanPath = window.location.pathname.replace(/\/$/, '');
  const parts = cleanPath.split('/');

  // Detect and skip market prefix if present
  const hasLocalePrefix = SUPPORTED_LOCALES_WITH_PREFIX.includes(parts[1]);
  const baseIndex = hasLocalePrefix ? 2 : 1;
  const CATEGORY_INDEX = baseIndex + 1;
  const SKU_INDEX = baseIndex + 2;

  return {
    category: decodeURIComponent(parts[CATEGORY_INDEX] || ''),
    sku: decodeURIComponent(parts[SKU_INDEX] || ''),
  };
}

function findPartBySKU(parts, sku) {
  return parts.find((part) => part['Base Part Number'].toLowerCase() === sku.toLowerCase());
}

function filterModelsBySKU(models, sku) {
  return models.filter((model) => model['Base Part Number'].toLowerCase() === sku.toLowerCase());
}

async function getPDPData(pathSegments) {
  const { category, sku } = pathSegments;

  try {
    const json = await getJsonData(getLocaleContextedUrl(`/product-data/rc-${category.replaceAll(' ', '-')}.json`));
    if (!json) return null;
    return findPartBySKU(json?.data, sku);
  } catch (error) {
    console.error(error);
    return null;
  }
}

function findPartImagesBySKU(parts, sku) {
  return parts.filter((part) => part['Part Number'].toLowerCase() === sku.toLowerCase());
}

async function fetchPartImages(sku) {
  const placeholderImage = getLocaleContextedUrl('/product-images/rc-placeholder-image.png');
  try {
    const data = await getLongJSONData({
      url: getLocaleContextedUrl('/product-images/road-choice-website-images.json'),
      limit: DEFAULT_LIMIT,
    });
    const images = findPartImagesBySKU(data, sku);

    if (images.length !== 0) {
      return images;
    }
  } catch (error) {
    console.error(error);
    return [{ 'Image URL': placeholderImage }];
  }
  return [{ 'Image URL': placeholderImage }];
}

function renderColDetails(part, block, categoryKeys) {
  const list = block.querySelector(`.${blockName}-list`);
  const keys = Object.keys(part);
  keys.forEach((key) => {
    if (categoryKeys.map((item) => item.Attributes).includes(key) && part[key].length) {
      const liFragment = docRange.createContextualFragment(`
        <li class="${blockName}-list-item">
          <span class="${blockName}-list-item-title">${key}</span>:
          <span class="${blockName}-list-item-value">${part[key]}</span>
        </li>
      `);
      list.append(liFragment);
    }
  });
}

function renderImages(block, images) {
  const imageWrapper = block.querySelector(`.${blockName}-image-wrapper`);
  const selectedImage = block.querySelector(`.${blockName}-selected-image`);

  // main image
  const mainPictureUrl = images[0]['Image URL'];
  const mainPicture = createOptimizedPicture(mainPictureUrl, 'Part image', true, undefined, !mainPictureUrl.startsWith('/'));
  mainPicture.querySelector('img').classList.add(`${blockName}-image`);
  selectedImage.append(mainPicture);

  // additional images
  if (images.length <= 1) return;

  const imageList = createElement('ul', { classes: `${blockName}-image-list` });
  images.forEach((image, id) => {
    const liFragment = docRange.createContextualFragment(`
      <li class="${blockName}-image-item ${id === 0 ? 'active' : ''}"> </li>`);
    const picture = createOptimizedPicture(image['Image URL'], 'Additional part image', false, undefined, !image['Image URL'].startsWith('/'));
    picture.querySelector('img').classList.add(`${blockName}-gallery-image`);
    liFragment.querySelector('li').append(picture);
    imageList.append(liFragment);
  });
  imageWrapper.append(imageList);
  imageWrapper.addEventListener('click', (e) => {
    const target = e.target.closest(`.${blockName}-image-item`);
    if (target) {
      const activeImage = imageWrapper.querySelector(`.${blockName}-image-item.active`);
      activeImage.classList.remove('active');
      target.classList.add('active');
      const newMainImage = target.querySelector('picture').cloneNode(true);
      selectedImage.replaceChildren(newMainImage);
    }
  });
}

function renderPartBlock(block) {
  const fragment = `
    <div class="${blockName}-details-wrapper">
      <div class="${blockName}-image-column">
        <div class="${blockName}-image-wrapper">
          <div class="${blockName}-selected-image">
          </div>
        </div>
      </div>
      <div class="${blockName}-content-column">
        <h1 class="${blockName}-title"></h1>
        <div class="${blockName}-description"></div>
        <ul class="${blockName}-list"></ul>
      </div>
    </div>
  `;

  const pdpFragment = docRange.createContextualFragment(fragment);
  block.append(pdpFragment);
}

function setPartData(part, block) {
  block.querySelector(`.${blockName}-title`).textContent = part['Base Part Number'];
  block.querySelector(`.${blockName}-description`).textContent = part['Part Name'];
}

function filterByCategory(data, category, categoryKey = 'category') {
  return data.filter((item) => item[categoryKey].replace(/[^\w]/g, '').toLowerCase() === category.replace(/[^\w]/g, '').toLowerCase());
}

function groupByLanguage(data) {
  return data.reduce((acc, cur) => {
    acc[cur.language] = acc[cur.language] || [];
    acc[cur.language].push(cur);
    return acc;
  }, {});
}

async function fetchCategoryKeys(category) {
  console.log(category);
  try {
    const json = await getLongJSONData({
      url: getLocaleContextedUrl('/product-data/rc-attribute-master-file.json'),
      limit: DEFAULT_LIMIT,
    });
    if (!json || json.length === 0) return [];

    blogCategory = await getCategoryObject(json, category);

    const result = filterByCategory(json, category, 'Subcategory');
    console.log(result);

    return result;
  } catch (error) {
    console.error(error);
    return [];
  }
}

function filterByDocType(data, type, category) {
  return groupByLanguage(
    filterByCategory(
      data.filter((doc) => type.includes(doc.type.toLowerCase())),
      category,
    ),
  );
}

async function fetchDocs(category) {
  try {
    const json = await getJsonData(getLocaleContextedUrl('/catalogs-categories.json'));
    if (!json) return null;
    const data = json?.data;
    return {
      catalogs: filterByDocType(data, docTypes.catalog, category),
      manuals: filterByDocType(data, docTypes.manual, category),
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}

function renderDocsSection(docsList, sectionType) {
  const section = document.querySelector(`.${blockName}-${sectionType}`);
  const sectionWrapper = section?.querySelector('.default-content-wrapper');
  if (!section || !sectionWrapper || !Object.keys(docsList)?.length) return;

  const fragment = docRange.createContextualFragment(`
    <ul class="${blockName}-${sectionType}-list"></ul>
  `);
  sectionWrapper.append(fragment);

  Object.entries(docsList).forEach(([language, docs]) => {
    const docsFragment = docRange.createContextualFragment(`
      <li class="${blockName}-${sectionType}-list-item">
        <div class="${blockName}-${sectionType}-list-title">${getTextLabel(language)}</div>
        <div class="${blockName}-${sectionType}-list-link"></div>
      </li>
    `);
    docs.forEach((doc) => {
      const anchor = createElement('a', { props: { target: '_blank', href: doc.file } });
      anchor.textContent = doc.title;
      docsFragment.querySelector(`.${blockName}-${sectionType}-list-link`).append(anchor);
    });
    sectionWrapper.querySelector(`.${blockName}-${sectionType}-list`).append(docsFragment);
  });
  section.classList.remove('hide');
}

function renderDocs(docs) {
  if (!docs) return;
  renderDocsSection(docs.catalogs, 'catalogs');
  renderDocsSection(docs.manuals, 'manuals');
}

// Check if product has catalog, product sheet or e-catalogs section
async function fetchSDS(category) {
  try {
    const json = await getJsonData(getLocaleContextedUrl('/sds-categories.json'));
    if (!json) return null;
    return filterByCategory(json?.data, category);
  } catch (error) {
    console.error(error);
    return null;
  }
}

function renderSDS(sdsList) {
  if (!sdsList) return;
  const sdsContainer = document.querySelector(`.${blockName}-sds`);
  const sectionWrapper = sdsContainer.querySelector('.default-content-wrapper');
  if (!sdsContainer || !sectionWrapper || !sdsList?.length) return;

  const fragment = docRange.createContextualFragment(`
    <ul class="${blockName}-sds-list"></ul>
  `);
  sectionWrapper.append(fragment);

  sdsList.forEach((sds) => {
    const sdsFragment = docRange.createContextualFragment(`
      <li class="${blockName}-sds-list-item">
        <a target="_blank" href="${sds.file}">${sds.title}</a>
      </li>
    `);
    sectionWrapper.querySelector(`.${blockName}-sds-list`).append(sdsFragment);
  });
  sdsContainer.classList.remove('hide');
}

async function fetchBlogs(category = null) {
  try {
    const queryParams = {
      sort: 'PUBLISH_DATE_DESC',
      category,
      limit: 3,
    };
    const { articles } = await fetchArticlesAndFacets(queryParams);
    const articleArray = [...articles];
    return articleArray;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function renderBlogs(blogList) {
  if (!blogList) return;
  const blogsContainer = document.querySelector(`.${blockName}-blogs`);
  const sectionWrapper = blogsContainer.querySelector('.default-content-wrapper');
  if (!blogsContainer || !sectionWrapper || !blogList?.length) return;

  const fragment = docRange.createContextualFragment(`
    <ul class="${blockName}-blogs-list"></ul>
  `);
  sectionWrapper.append(fragment);

  blogList.forEach((sds) => {
    const blogFragment = docRange.createContextualFragment(`
        <li class="${blockName}-blogs-list-item">
          <a class="${blockName}-blogs-anchor" target="_blank" href="${sds.url}">
            <h6 class="${blockName}-blogs-title">${sds.title}</h6>
          </a>
          <p class="${blockName}-blogs-date">
            ${new Date(parseInt(sds.publishDate, 10) * 1000).toLocaleDateString()}
          </p>
          <p class="${blockName}-blogs-description">${sds.description}</p>
          <a class="${blockName}-blogs-cta" target="_blank" href="${sds.url}">Read More</a>
        </li>
      `);
    sectionWrapper.querySelector(`.${blockName}-blogs-list`).append(blogFragment);
  });
  blogsContainer.classList.remove('hide');
}

async function getPartFitConfig(category) {
  try {
    const json = await getJsonData(getLocaleContextedUrl('/product-fit-vehicles/product-fit-vehicles-config.json'));
    if (!json) return null;
    return filterByCategory(json?.data, category);
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function fetchPartFit(pathSegments) {
  const { category, sku } = pathSegments;

  const hasPartFit = await getPartFitConfig(category);
  if (hasPartFit?.length === 0) return null;
  try {
    const json = await getJsonData(getLocaleContextedUrl(`/product-fit-vehicles/${category.replace(/[^\w]/g, '-')}-application-data.json`));
    if (!json) return null;
    return filterModelsBySKU(json?.data, sku);
  } catch (error) {
    console.error(error);
    return null;
  }
}

function renderPartFit(partFitData) {
  if (!partFitData) return;
  const partFitContainer = document.querySelector(`.${blockName}-part-fit`);
  let sectionWrapper = partFitContainer.querySelector('.default-content-wrapper');

  if (!sectionWrapper) {
    sectionWrapper = createElement('div', { classes: 'default-content-wrapper' });
    partFitContainer.append(sectionWrapper);
  }

  if (!partFitContainer || !sectionWrapper || !partFitData?.length) return;

  const fragment = docRange.createContextualFragment(`
    <div class="${blockName}-part-fit-expanded">
      <div class="${blockName}-part-fit-header">
        <h3 class="${blockName}-part-fit-title">Advanced Filter</h3>
        <div class="${blockName}-part-fit-search">
          <input type="text" class="${blockName}-part-fit-search-input" placeholder="Search" />
        </div>
        <div class="${blockName}-part-fit-filter">
          <div class="${blockName}-part-fit-filter-title">Make</div>
          <div class="${blockName}-part-fit-make-list"></div>
        </div>
        <div class="${blockName}-part-fit-count">0 Entries</div>
      </div>
      <div class="${blockName}-part-fit-list"></div>
    </div>
  `);
  sectionWrapper.append(fragment);

  const makes = partFitData.reduce((acc, cur) => {
    acc.add(cur.Make);
    return acc;
  }, new Set());

  makes.forEach((make) => {
    const makeFragment = docRange.createContextualFragment(`
      <div class="${blockName}-part-fit-make-list-item">${make}</div>
    `);
    sectionWrapper.querySelector(`.${blockName}-part-fit-make-list`).append(makeFragment);
  });

  partFitData.forEach((vehicle) => {
    const partFitFragment = docRange.createContextualFragment(`
        <div class="${blockName}-part-fit-list-item" data-make="${vehicle.Make}">
          <h4 class="${blockName}-part-fit-make">${vehicle.Make}</h4>
          <h6 class="${blockName}-part-fit-model">Model: <span class="value">${vehicle.Model}</span></h6>
          <p class="${blockName}-part-fit-model-description">${vehicle['Model Description']}</p>
          <div class="${blockName}-part-fit-year">Year: <span class="value">${vehicle.Year}</span></div>
          <div class="${blockName}-part-fit-engine-make">Engine Make: <span class="value">
          ${vehicle['Engine Make']}</span></div>
          <div class="${blockName}-part-fit-engine-model">Engine Model: <span class="value">
          ${vehicle['Engine Model']}</span></div>
        </div>
      `);

    sectionWrapper.querySelector(`.${blockName}-part-fit-list`).append(partFitFragment);
  });

  const countVisibleItems = () => {
    const count = sectionWrapper.querySelectorAll(
      `.${blockName}-part-fit-list-item:not(.${blockName}-hide-by-filter):not(.${blockName}-hide-by-search)`,
    ).length;
    sectionWrapper.querySelector(`.${blockName}-part-fit-count`).textContent = `${count} Entries`;
  };

  countVisibleItems();

  // filter
  sectionWrapper.querySelector(`.${blockName}-part-fit-make-list`).addEventListener('click', (e) => {
    const target = e.target.closest(`.${blockName}-part-fit-make-list-item`);
    if (target) {
      if (target.classList.contains('active')) {
        target.classList.remove('active');
        sectionWrapper.querySelectorAll(`.${blockName}-part-fit-list-item.${blockName}-hide-by-filter`).forEach((item) => {
          item.classList.remove(`${blockName}-hide-by-filter`);
        });
      } else {
        sectionWrapper.querySelectorAll(`.${blockName}-part-fit-make-list-item.active`).forEach((item) => {
          item.classList.remove('active');
        });
        target.classList.add('active');
        sectionWrapper.querySelectorAll(`.${blockName}-part-fit-list-item`).forEach((item) => {
          if (item.dataset.make === target.textContent) {
            item.classList.remove(`${blockName}-hide-by-filter`);
          } else {
            item.classList.add(`${blockName}-hide-by-filter`);
          }
        });
      }
      countVisibleItems();
    }
  });

  // search
  sectionWrapper.querySelector(`input.${blockName}-part-fit-search-input`).addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    sectionWrapper.querySelectorAll(`.${blockName}-part-fit-list-item`).forEach((item) => {
      const text = item.textContent.toLowerCase();
      const shouldHide = text.length > 0 && !text.includes(query);
      item.classList.toggle(`${blockName}-hide-by-search`, shouldHide);
    });
    countVisibleItems();
  });

  partFitContainer.classList.remove('hide');
}

function resolvePartLabel(type, part) {
  const { 'Base Part Number': partNumber, 'Part Name': partName } = part;
  let label = getTextLabel(`pdp_metadata_${type}`);
  if (label) {
    label = label.replace('[[part_number]]', partNumber);
    label = label.replace('[[part_name]]', partName);
  }
  return label || partName;
}

function updateMetadata(part) {
  const title = resolvePartLabel('title', part);
  const description = resolvePartLabel('description', part);

  document.title = title;
  setOrCreateMetadata('description', description);
  setOrCreateMetadata('og:title', title);
  setOrCreateMetadata('og:description', description);
  setOrCreateMetadata('og:url', window.location.href);
  setOrCreateMetadata('twitter:title', title);
  setOrCreateMetadata('twitter:description', description);
}

function updateCanonicalUrl(category, sku) {
  const existing = document.querySelector('link[rel="canonical"]');
  const canonicalUrl = `${window.location.origin}${getLocaleContextedUrl(`/parts/${category}/${sku}`)}`;
  if (existing) {
    existing.setAttribute('href', canonicalUrl);
  } else {
    const link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', canonicalUrl);
    document.head.appendChild(link);
  }
}

function updateImageMetadata(images) {
  setOrCreateMetadata('og:image', images[0]['Image URL']);
  setOrCreateMetadata('twitter:image', images[0]['Image URL']);
}

function renderBreadcrumbs(part) {
  const breadcrumbSection = document.querySelector('.section.breadcrumbs');
  if (!breadcrumbSection) return;

  const locale = getMetadata('locale')?.toLowerCase();
  const isLocalizedMarket = ['en-ca', 'fr-ca'].includes(locale);
  const prefix = isLocalizedMarket ? `/${locale}` : '';

  const categorySlug = part.Category.toLowerCase().replace(/[^\w]/g, '-');
  const subcategorySlug = part.Subcategory.toLowerCase().replace(/[^\w]/g, '-');

  const breadcrumbs = docRange.createContextualFragment(`
    <div class="breadcrumb-wrapper">
      <div class="breadcrumb block">
        <div class="breadcrumb-content">
          <ul class="breadcrumb-list">
            <li class="breadcrumb-item breadcrumb-item-0">
              <a class="breadcrumb-link" href="${prefix}/">Road Choice</a>
            </li>
            <li class="breadcrumb-item breadcrumb-item-1">
              <a class="breadcrumb-link" href="${prefix}/part-category/${categorySlug}">
                ${part.Category}
              </a>
            </li>
            <li class="breadcrumb-item breadcrumb-item-2">
              <a class="breadcrumb-link active-link" href="${prefix}/part-category/${subcategorySlug}">
                ${part.Subcategory}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `);

  breadcrumbSection.append(breadcrumbs);
}

export default async function decorate(block) {
  const pathSegments = getPathParams();
  updateCanonicalUrl(pathSegments.category, pathSegments.sku);
  renderPartBlock(block);
  console.log(pathSegments.category);

  getPDPData(pathSegments).then((part) => {
    if (part) {
      renderBreadcrumbs(part, block);
      setPartData(part, block);
      updateMetadata(part);
      fetchCategoryKeys(pathSegments.category).then((categoryKeys) => {
        renderColDetails(part, block, categoryKeys);
      });
    }
  });

  fetchPartImages(pathSegments.sku).then((images) => {
    updateImageMetadata(images);
    renderImages(block, images);
  });

  blogCategory = fetchPartFit(pathSegments).then(renderPartFit);
  fetchDocs(pathSegments.category).then(renderDocs);
  fetchSDS(pathSegments.category).then(renderSDS);
  fetchBlogs(blogCategory).then(renderBlogs);

  document.querySelector('main').addEventListener('click', (e) => {
    if (e.target.matches('.section.accordion h5')) {
      e.target.closest('.section.accordion').classList.toggle('accordion-open');
    }
  });
}
