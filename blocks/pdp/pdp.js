import {
  createElement,
  getTextLabel,
  getJsonFromUrl,
  getLongJSONData,
  defaultLimit,
} from '../../scripts/scripts.js';
import { createOptimizedPicture } from '../../scripts/lib-franklin.js';

const docTypes = {
  catalog: 'catalog',
  manual: 'manual',
};
const docRange = document.createRange();

function getQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  return { category: urlParams.get('category'), sku: urlParams.get('sku') };
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
    const json = await getJsonFromUrl(`/product-data/rc-${category.replaceAll(' ', '-')}.json`);
    if (!json) return null;
    return findPartBySKU(json?.data, sku);
  } catch (error) {
    return null;
  }
}

function findPartImagesBySKU(parts, sku) {
  return parts.filter((part) => part['Part Number'].toLowerCase() === sku.toLowerCase());
}

async function fetchPartImages(sku) {
  const placeholderImage = '/product-images/rc-placeholder-image.png';
  try {
    const data = await getLongJSONData({
      url: '/product-images/road-choice-website-images.json',
      limit: defaultLimit,
    });
    const images = findPartImagesBySKU(data, sku);

    if (images.length !== 0) {
      return images;
    }
  } catch (error) {
    return [{ 'Image URL': placeholderImage }];
  }
  return [{ 'Image URL': placeholderImage }];
}

function renderColDetails(part, block, categoryKeys) {
  const list = block.querySelector('.pdp-list');
  const keys = Object.keys(part);
  keys.forEach((key) => {
    if (categoryKeys.map((item) => item.Attributes).includes(key) && part[key].length) {
      const liFragment = docRange.createContextualFragment(`<li class="pdp-list-item">
        <span class="pdp-list-item-title">${key}</span>:
        <span class="pdp-list-item-value">${part[key]}</span>
      </li>`);
      list.append(liFragment);
    }
  });
}

function renderImages(block, images) {
  const imageWrapper = block.querySelector('.pdp-image-wrapper');
  const selectedImage = block.querySelector('.pdp-selected-image');

  // main image
  const mainPictureUrl = images[0]['Image URL'];
  const mainPicture = createOptimizedPicture(
    mainPictureUrl,
    'Part image',
    true,
    undefined,
    !mainPictureUrl.startsWith('/'),
  );
  mainPicture.querySelector('img').classList.add('pdp-image');
  selectedImage.append(mainPicture);

  // additional images
  if (images.length <= 1) return;

  const imageList = createElement('ul', { classes: 'pdp-image-list' });
  images.forEach((image, id) => {
    const liFragment = docRange.createContextualFragment(`
      <li class="pdp-image-item ${id === 0 ? 'active' : ''}"> </li>`);
    const picture = createOptimizedPicture(
      image['Image URL'],
      'Additional part image',
      false,
      undefined,
      !image['Image URL'].startsWith('/'),
    );
    picture.querySelector('img').classList.add('pdp-gallery-image');
    liFragment.querySelector('li').append(picture);
    imageList.append(liFragment);
  });
  imageWrapper.append(imageList);
  imageWrapper.addEventListener('click', (e) => {
    const target = e.target.closest('.pdp-image-item');
    if (target) {
      const activeImage = imageWrapper.querySelector('.pdp-image-item.active');
      activeImage.classList.remove('active');
      target.classList.add('active');
      const newMainImage = target.querySelector('picture').cloneNode(true);
      selectedImage.replaceChildren(newMainImage);
    }
  });
}

function renderPartBlock(block) {
  const fragment = `
    <div class="pdp-details-wrapper">
      <div class="pdp-image-column">
        <div class="pdp-image-wrapper">
          <div class="pdp-selected-image">
          </div>
        </div>
      </div>
      <div class="pdp-content-column">
        <h1 class="pdp-title"></h1>
        <div class="pdp-description"></div>
        <ul class="pdp-list"></ul>
      </div>
    </div>
  `;

  const pdpFragment = docRange.createContextualFragment(fragment);
  block.append(pdpFragment);
}

function setPartData(part, block) {
  block.querySelector('.pdp-title').textContent = part['Base Part Number'];
  block.querySelector('.pdp-description').textContent = part['Part Name'];
}

function filterByCategory(data, category, categoryKey = 'category') {
  return data.filter((item) => item[categoryKey].replace(/[^\w]/g, '')
    .toLowerCase() === category.replace(/[^\w]/g, '').toLowerCase());
}

function groupByLanguage(data) {
  return data.reduce((acc, cur) => {
    acc[cur.language] = acc[cur.language] || [];
    acc[cur.language].push(cur);
    return acc;
  }, {});
}

async function fetchCategoryKeys(category) {
  try {
    const json = await getLongJSONData({
      url: '/product-data/rc-attribute-master-file.json',
      limit: defaultLimit,
    });
    if (!json || json.length === 0) return [];
    return filterByCategory(json, category, 'Subcategory');
  } catch (error) {
    return [];
  }
}

function filterByDocType(data, type, category) {
  return groupByLanguage(filterByCategory(data
    .filter((doc) => doc.type.toLowerCase() === type), category));
}

async function fetchDocs(category) {
  try {
    const json = await getJsonFromUrl('/catalogs-categories.json');
    if (!json) return null;
    const data = json?.data;
    return {
      catalogs: filterByDocType(data, docTypes.catalog, category),
      manuals: filterByDocType(data, docTypes.manual, category),
    };
  } catch (error) {
    return null;
  }
}

function renderDocsSection(docsList, sectionType) {
  const section = document.querySelector(`.pdp-${sectionType}`);
  const sectionWrapper = section.querySelector('.default-content-wrapper');
  if (!section || !sectionWrapper || !Object.keys(docsList)?.length) return;

  const fragment = docRange.createContextualFragment(`
    <ul class="pdp-${sectionType}-list"></ul>
  `);
  sectionWrapper.append(fragment);

  Object.entries(docsList).forEach(([language, docs]) => {
    const docsFragment = docRange.createContextualFragment(`
      <li class="pdp-${sectionType}-list-item">
        <div class="pdp-${sectionType}-list-title">${getTextLabel(language)}</div>
        <div class="pdp-${sectionType}-list-link"></div>
      </li>
    `);
    docs.forEach((doc) => {
      const anchor = createElement('a', {
        props: { target: '_blank', href: doc.file },
        textContent: doc.title,
      });
      docsFragment.querySelector(`.pdp-${sectionType}-list-link`).append(anchor);
    });
    sectionWrapper.querySelector(`.pdp-${sectionType}-list`).append(docsFragment);
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
    const json = await getJsonFromUrl('/sds-categories.json');
    if (!json) return null;
    return filterByCategory(json?.data, category);
  } catch (error) {
    return null;
  }
}

function renderSDS(sdsList) {
  if (!sdsList) return;
  const sdsContainer = document.querySelector('.pdp-sds');
  const sectionWrapper = sdsContainer.querySelector('.default-content-wrapper');
  if (!sdsContainer || !sectionWrapper || !sdsList?.length) return;

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

async function fetchBlogs(category) {
  try {
    const json = await getJsonFromUrl('/blog/query-index.json');
    if (!json) return null;
    return filterByCategory(json?.data, category);
  } catch (error) {
    return null;
  }
}

function renderBlogs(blogList) {
  if (!blogList) return;
  const blogsContainer = document.querySelector('.pdp-blogs');
  const sectionWrapper = blogsContainer.querySelector('.default-content-wrapper');
  if (!blogsContainer || !sectionWrapper || !blogList?.length) return;

  const fragment = docRange.createContextualFragment(`
    <ul class="pdp-blogs-list"></ul>
  `);
  sectionWrapper.append(fragment);

  blogList
    .filter((blog) => Number.isInteger(parseInt(blog.date, 10)))
    .sort((blog1, blog2) => blog1.date - blog2.date)
    .slice(-3)
    .forEach((sds) => {
      const blogFragment = docRange.createContextualFragment(`
        <li class="pdp-blogs-list-item">
          <a class="pdp-blogs-anchor" target="_blank" href="${sds.path}">
            <h6 class="pdp-blogs-title">${sds.title}</h6>
          </a>
          <p class="pdp-blogs-date">
            ${new Date(parseInt(sds.date, 10) * 1000).toLocaleDateString()}
          </p>
          <p class="pdp-blogs-description">${sds.description}</p>
          <a class="pdp-blogs-cta" target="_blank" href="${sds.path}">Read More</a>
        </li>
      `);
      sectionWrapper.querySelector('.pdp-blogs-list').append(blogFragment);
    });
  blogsContainer.classList.remove('hide');
}

async function getPartFitConfig(category) {
  try {
    const json = await getJsonFromUrl('/product-fit-vehicles/product-fit-vehicles-config.json');
    if (!json) return null;
    return filterByCategory(json?.data, category);
  } catch (error) {
    return null;
  }
}

async function fetchPartFit(pathSegments) {
  const { category, sku } = pathSegments;

  const hasPartFit = await getPartFitConfig(category);
  if (hasPartFit?.length === 0) return null;
  try {
    const json = await getJsonFromUrl(`/product-fit-vehicles/${
      category.replace(/[^\w]/g, '-')}-application-data.json`);
    if (!json) return null;
    return filterModelsBySKU(json?.data, sku);
  } catch (error) {
    return null;
  }
}

function renderPartFit(partFitData) {
  if (!partFitData) return;
  const partFitContainer = document.querySelector('.pdp-part-fit');
  let sectionWrapper = partFitContainer.querySelector('.default-content-wrapper');

  if (!sectionWrapper) {
    sectionWrapper = createElement('div', { classes: 'default-content-wrapper' });
    partFitContainer.append(sectionWrapper);
  }

  if (!partFitContainer || !sectionWrapper || !partFitData?.length) return;

  const fragment = docRange.createContextualFragment(`
    <div class="pdp-part-fit-expanded">
      <div class="pdp-part-fit-header">
        <h3 class="pdp-part-fit-title">Advanced Filter</h3>
        <div class="pdp-part-fit-search">
          <input type="text" class="pdp-part-fit-search-input" placeholder="Search" />
        </div>
        <div class="pdp-part-fit-filter">
          <div class="pdp-part-fit-filter-title">Make</div>
          <div class="pdp-part-fit-make-list"></div>
        </div>
        <div class="pdp-part-fit-count">0 Entries</div>
      </div>
      <div class="pdp-part-fit-list"></div>
    </div>
  `);
  sectionWrapper.append(fragment);

  const makes = partFitData.reduce((acc, cur) => {
    acc.add(cur.Make);
    return acc;
  }, new Set());

  makes.forEach((make) => {
    const makeFragment = docRange.createContextualFragment(`
      <div class="pdp-part-fit-make-list-item">${make}</div>
    `);
    sectionWrapper.querySelector('.pdp-part-fit-make-list').append(makeFragment);
  });

  partFitData
    .forEach((vehicle) => {
      const partFitFragment = docRange.createContextualFragment(`
        <div class="pdp-part-fit-list-item" data-make="${vehicle.Make}">
          <h4 class="pdp-part-fit-make">${vehicle.Make}</h4>
          <h6 class="pdp-part-fit-model">Model: <span class="value">${vehicle.Model}</span></h6>
          <p class="pdp-part-fit-model-description">${vehicle['Model Description']}</p>
          <div class="pdp-part-fit-year">Year: <span class="value">${vehicle.Year}</span></div>
          <div class="pdp-part-fit-engine-make">Engine Make: <span class="value">
          ${vehicle['Engine Make']}</span></div>
          <div class="pdp-part-fit-engine-model">Engine Model: <span class="value">
          ${vehicle['Engine Model']}</span></div>
        </div>
      `);

      sectionWrapper.querySelector('.pdp-part-fit-list').append(partFitFragment);
    });

  const countVisibleItems = () => {
    const count = sectionWrapper
      .querySelectorAll('.pdp-part-fit-list-item:not(.pdp-hide-by-filter):not(.pdp-hide-by-search)')
      .length;
    sectionWrapper.querySelector('.pdp-part-fit-count').textContent = `${count} Entries`;
  };

  countVisibleItems();

  // filter
  sectionWrapper.querySelector('.pdp-part-fit-make-list').addEventListener('click', (e) => {
    const target = e.target.closest('.pdp-part-fit-make-list-item');
    if (target) {
      if (target.classList.contains('active')) {
        target.classList.remove('active');
        sectionWrapper.querySelectorAll('.pdp-part-fit-list-item.pdp-hide-by-filter').forEach((item) => {
          item.classList.remove('pdp-hide-by-filter');
        });
      } else {
        sectionWrapper.querySelectorAll('.pdp-part-fit-make-list-item.active').forEach((item) => {
          item.classList.remove('active');
        });
        target.classList.add('active');
        sectionWrapper.querySelectorAll('.pdp-part-fit-list-item').forEach((item) => {
          if (item.dataset.make === target.textContent) {
            item.classList.remove('pdp-hide-by-filter');
          } else {
            item.classList.add('pdp-hide-by-filter');
          }
        });
      }
      countVisibleItems();
    }
  });

  // search
  sectionWrapper.querySelector('input.pdp-part-fit-search-input').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    sectionWrapper.querySelectorAll('.pdp-part-fit-list-item').forEach((item) => {
      const text = item.textContent.toLowerCase();
      const shouldHide = text.length > 0 && !text.includes(query);
      item.classList.toggle('pdp-hide-by-search', shouldHide);
    });
    countVisibleItems();
  });

  partFitContainer.classList.remove('hide');
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

function updateMetadata(part) {
  setOrCreateMetadata('og:title', part['Base Part Number']);
  setOrCreateMetadata('og:description', part['Part Name']);
  setOrCreateMetadata('og:url', window.location.href);
  setOrCreateMetadata('twitter:title', part['Base Part Number']);
  setOrCreateMetadata('twitter:description', part['Part Name']);
}

function updateImageMetadata(images) {
  setOrCreateMetadata('og:image', images[0]['Image URL']);
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
            <li class="breadcrumb-item breadcrumb-item-1">
              <a class="breadcrumb-link"
                href="/part-category/${part.Category.toLowerCase().replace(/[^\w]/g, '-')}">
                ${part.Category}
              </a>
            </li>
            <li class="breadcrumb-item breadcrumb-item-2">
              <a class="breadcrumb-link"
                href="/part-category/?category=${part.Subcategory.toLowerCase().replace(/[^\w]/g, '-')}">
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
  const pathSegments = getQueryParams();
  renderPartBlock(block);

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

  fetchPartFit(pathSegments).then(renderPartFit);
  fetchDocs(pathSegments.category).then(renderDocs);
  fetchSDS(pathSegments.category).then(renderSDS);
  fetchBlogs(pathSegments.category).then(renderBlogs);

  document.querySelector('main').addEventListener('click', (e) => {
    if (e.target.matches('.section.accordion h5')) {
      e.target.closest('.section.accordion').classList.toggle('accordion-open');
    }
  });
}
