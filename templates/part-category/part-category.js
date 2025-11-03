import { fetchCategories, subcategorySearch } from '../../blocks/search/graphql-api.js';
import { createElement, getLongJSONData, DEFAULT_LIMIT, getLocaleContextedUrl, setOrCreateMetadata, getTextLabel } from '../../scripts/common.js';
import { getCategoryObject, transformFacets, getCategory } from '../../scripts/services/part-category.service.js';

const categoryMaster = getLocaleContextedUrl('/product-data/rc-attribute-master-file.json');
const amount = 12;
let category;
let mainCategory;
const json = {
  data: [],
  limit: 0,
  offset: 0,
  total: 0,
};

function get404PageUrl() {
  return getLocaleContextedUrl('/404.html');
}

/**
 * Loads product data for the given category and updates internal state and sessionStorage.
 * If the data file does not exist or contains no products, the state is reset and an empty array is returned.
 *
 * @param {string} cat - The category name.
 * @returns {Promise<Array>} The list of products in the category, or an empty array if not found.
 * @emits {Event} CategoryDataLoaded - When the category data is successfully loaded.
 */
const getCategoryData = async (categoryObj) => {
  try {
    const cat = categoryObj.subcategory.toLowerCase();

    const queryParams = {
      category: categoryObj.category,
      subcategory: categoryObj.subcategory,
      facetFields: JSON.parse(sessionStorage.getItem('filter-attribs')),
      dynamicFilters: [],
    };

    const productsAndFacets = await subcategorySearch(queryParams);
    const { items, facets } = productsAndFacets;

    const products = items.map((item) => item.metadata);
    const filters = transformFacets(facets);

    const filterEvent = new Event('FilterAttribsLoaded');
    sessionStorage.setItem('filter-attribs', JSON.stringify(filters));
    document.dispatchEvent(filterEvent);

    if (!Array.isArray(products) || products.length === 0) {
      console.warn(`[CategoryData] No product data found or empty array returned for category: "${cat}"`);
      json.data = [];
      json.limit = 0;
      json.total = 0;
      return [];
    }

    json.data = products;
    json.limit = 20;
    json.total = products.length;

    mainCategory = categoryObj.category;

    if (!mainCategory) {
      console.warn(`[CategoryData] mainCategory is missing for: "${cat}"`);
    }

    window.categoryData = json.data;
    sessionStorage.setItem('amount', amount);

    const event = new Event('CategoryDataLoaded');
    document.dispatchEvent(event);

    return products;
  } catch (err) {
    console.error('%c[CategoryData] Error fetching category data', 'color:red;background-color:aliceblue', err);
    // window.location.href = get404PageUrl();
  }
};

/**
 * Updates the sessionStorage with the filter attributes.
 * @param {string} cat The category name.
 * @returns {void}
 * @throws {Error} If the filter attributes are not found.
 * @emits {Event} _FilterAttribsLoaded_ When the filter attributes are loaded.
 */
const getFilterAttrib = async (cat) => {
  try {
    const filtersJson = await getLongJSONData({
      url: categoryMaster,
      limit: DEFAULT_LIMIT,
    });

    if (!filtersJson) throw new Error('Failed to fetch filter data');

    const filterAttribs = filtersJson
      .filter((el) => el.Subcategory.toLowerCase().replace(/ /g, '-') === cat.toLowerCase() && el.Filter === '')
      .map((el) => el.Attributes);

    const event = new Event('FilterAttribsLoaded');
    sessionStorage.setItem('filter-attribs', JSON.stringify(filterAttribs));
    document.dispatchEvent(event);
  } catch (err) {
    console.log('%cError fetching filter attributes', 'color:red;background-color:aliceblue', err);
    window.location.href = get404PageUrl();
  }
};

const resetCategoryData = () => {
  sessionStorage.removeItem('category-data');
  sessionStorage.removeItem('filter-attribs');
  sessionStorage.removeItem('amount');
};

/**
 * Updates the title's textContent based on the Subcategory from the product data.
 * @param {HTMLElement} title - The title element to update.
 * @param {string} category - The fallback category name.
 * @param {Array} categoryData - The product data array to retrieve the Subcategory from.
 */
const updateTitleWithSubcategory = (title, category, categoryData) => {
  const subcategory = Array.isArray(categoryData) && categoryData.length > 0 ? categoryData[0]?.Subcategory : null;
  title.textContent = subcategory || category.replaceAll('-', ' ');

  if (!subcategory) {
    console.log(
      subcategory === null ? 'No product data found, using fallback category' : 'No subcategory found in product data, using fallback category',
    );
  }
};

/**
 * Sets the canonical URL for the current category page.
 *
 * This helps search engines understand the preferred URL for the content,
 * avoiding duplicate indexing issues. The canonical link is appended to
 * the <head> element with the proper locale context.
 *
 * @param {string} category - The category slug to include in the canonical URL.
 */
function setCanonicalUrl(category) {
  const canonical = document.createElement('link');
  canonical.setAttribute('rel', 'canonical');
  canonical.setAttribute('href', `${window.location.origin}${getLocaleContextedUrl(`/part-category/${category}`)}`);
  document.head.appendChild(canonical);
}

function resolvePartLabel(type, cat) {
  let label = getTextLabel(`category_metadata_${type}`);
  if (label) {
    label = label.replace('[[category]]', cat);
  }
  return label || cat;
}

/**
 * Sets page metadata for a category page, including <title>, Open Graph, and Twitter tags.
 *
 * @param {string} category - The category slug from the URL.
 */
function updateMetadata(category) {
  const readableCategory = category.replace(/-/g, ' ');
  const capitalizedCategory = readableCategory.charAt(0).toUpperCase() + readableCategory.slice(1);
  const title = resolvePartLabel('title', capitalizedCategory);
  const description = resolvePartLabel('description', capitalizedCategory);

  document.title = title;
  setOrCreateMetadata('description', description);
  setOrCreateMetadata('og:title', title);
  setOrCreateMetadata('og:description', description);
  setOrCreateMetadata('twitter:title', title);
  setOrCreateMetadata('twitter:description', description);
}

export default async function decorate(doc) {
  category = getCategory();
  if (!category) {
    console.log('No category provided — assuming this is the category template');
    return;
  }
  setCanonicalUrl(category);
  updateMetadata(category);
  const main = doc.querySelector('main');
  const breadcrumbBlock = main.querySelector('.breadcrumb-container .breadcrumb');
  const titleWrapper = createElement('div', { classes: 'title-wrapper' });
  const title = createElement('h1', { classes: 'part-category-title' });

  titleWrapper.appendChild(title);

  const section = [...main.children].filter((child) => !['breadcrumb-container', 'search-container'].some((el) => child.classList.contains(el)))[0];
  section.classList.add('part-category');
  section.prepend(titleWrapper);

  const allCategories = await fetchCategories();
  const categoryObject = getCategoryObject(allCategories, category);
  mainCategory = categoryObject.category;

  resetCategoryData();
  await getFilterAttrib(category);
  await getCategoryData(categoryObject);

  updateTitleWithSubcategory(title, category, categoryObject.subcategory);

  // Update breadcrumb dynamically once the block is loaded
  const observer = new MutationObserver((mutations) => {
    const { target } = mutations[0];

    if (target.dataset.blockStatus === 'loaded') {
      const breadcrumbList = target.querySelector('.breadcrumb-list');
      if (!breadcrumbList) {
        console.warn('No breadcrumb list found.');
        observer.disconnect();
        return;
      }

      // Remove last breadcrumb item (it's the current category, which we’ll replace)
      const lastItem = breadcrumbList.lastElementChild;
      if (lastItem) breadcrumbList.removeChild(lastItem);

      let index = breadcrumbList.children.length;

      // If mainCategory is present, add it before the final category
      if (mainCategory) {
        const mainSlug = mainCategory.toLowerCase().replace(/\s/g, '-');
        const mainLink = createElement('a', {
          classes: 'breadcrumb-link',
          props: { href: getLocaleContextedUrl(`/part-category/${mainSlug}`) },
        });
        mainLink.textContent = mainCategory;

        const mainItem = createElement('li', {
          classes: ['breadcrumb-item', `breadcrumb-item-${index}`],
        });
        mainItem.appendChild(mainLink);
        breadcrumbList.appendChild(mainItem);
        index += 1;
      }

      // Add final category (the one from the URL)
      const finalLink = createElement('a', {
        classes: 'breadcrumb-link active-link',
        props: { href: getLocaleContextedUrl(`/part-category/${category}`) },
      });
      finalLink.textContent = title.textContent;

      const finalItem = createElement('li', {
        classes: ['breadcrumb-item', `breadcrumb-item-${index}`],
      });
      finalItem.appendChild(finalLink);
      breadcrumbList.appendChild(finalItem);

      observer.disconnect();
    }
  });

  observer.observe(breadcrumbBlock, { attributes: true, attributeFilter: ['data-block-status'] });
}
