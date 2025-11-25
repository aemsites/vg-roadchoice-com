import { fetchCategories } from '../../scripts/graphql-api.js';
import {
  createElement,
  getLongJSONData,
  DEFAULT_LIMIT,
  getLocaleContextedUrl,
  setOrCreateMetadata,
  getTextLabel,
  getCategoryObject,
} from '../../scripts/common.js';
import { getCategory, urlToObject, updateGlobalQueryObject } from '../../scripts/services/part-category.service.js';

function get404PageUrl() {
  return getLocaleContextedUrl('/404.html');
}

/**
 * Fetches the filter attributes fron sharepoint.
 * @param {string} subcategory The subcategory name.
 * @returns {void}
 * @throws {Error} If the filter attributes are not found.
 * @emits {Event} _FilterAttribsLoaded_ When the filter attributes are loaded.
 */
const getFilterAttrib = async (subcategory) => {
  try {
    const filtersJson = await getLongJSONData({
      url: getLocaleContextedUrl('/product-data/rc-attribute-master-file.json'),
      limit: DEFAULT_LIMIT,
    });

    if (!filtersJson) throw new Error('Failed to fetch filter data');

    const filterAttribs = filtersJson.filter((el) => el.Subcategory === subcategory && el.Filter === '').map((el) => el.Attributes);

    return filterAttribs;
  } catch (err) {
    console.log('%cError fetching filter attributes', 'color:red;background-color:aliceblue', err);
    window.location.href = get404PageUrl();
  }
};

/**
 * Determines the appropriate facet fields (filters) for a category query
 * and updates the global application state with the final query object.
 *
 * This function handles fetching default facet fields if none are provided
 * and redirects the user to a 404 page if an error occurs during the process.
 * Note: The function currently returns undefined (return;) on success.
 *
 * @async
 * @param {object} queryObject - The incoming query parameters and configuration.
 * @returns {Promise<void>} A Promise that resolves when the operation is complete.
 * Note: It returns nothing (void) on successful execution but updates the global state.
 */
const initializeCategoryQuery = async (queryObject) => {
  const { category, subcategory, facetFields, dynamicFilters } = queryObject;

  let fieldsToUse;
  if (!Array.isArray(facetFields) || facetFields.length === 0) {
    const sharepointFacetFields = await getFilterAttrib(subcategory);
    fieldsToUse = sharepointFacetFields;
  } else {
    fieldsToUse = facetFields;
  }

  try {
    queryObject = {
      category,
      subcategory,
      facetFields: fieldsToUse,
      dynamicFilters,
    };

    updateGlobalQueryObject('query-params', queryObject);

    return;
  } catch (err) {
    console.error('%c[CategoryData] Error fetching category data', 'color:red;background-color:aliceblue', err);
    window.location.href = get404PageUrl();
  }
};

const resetCategoryData = () => {
  sessionStorage.removeItem('filter-attribs');
  sessionStorage.removeItem('query-params');
};

/**
 * Updates the title's textContent based on the Subcategory from the product data.
 * @param {HTMLElement} title - The title element to update.
 * @param {string} category - The fallback category name.
 * @param {Array} categoryData - The product data array to retrieve the Subcategory from.
 */
const updateTitleWithSubcategory = (title, category, subcategory) => {
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
  const metaSubcategory = getCategory();
  if (!metaSubcategory) {
    console.log('No category provided — assuming this is the category template');
    return;
  }
  setCanonicalUrl(metaSubcategory);
  updateMetadata(metaSubcategory);
  const main = doc.querySelector('main');
  const breadcrumbBlock = main.querySelector('.breadcrumb-container .breadcrumb');
  const titleWrapper = createElement('div', { classes: 'title-wrapper' });
  const title = createElement('h1', { classes: 'part-category-title' });

  titleWrapper.appendChild(title);

  const section = [...main.children].filter((child) => !['breadcrumb-container', 'search-container'].some((el) => child.classList.contains(el)))[0];
  section.classList.add('part-category');
  section.prepend(titleWrapper);

  resetCategoryData();

  const allCategories = await fetchCategories();
  const categoryObject = getCategoryObject(allCategories, metaSubcategory);

  const { category, subcategory } = categoryObject;

  const sanitizedUrl = new URL(window.location.href);
  const filtersFromUrl = urlToObject(sanitizedUrl.href);

  const completeQueryObject = { ...filtersFromUrl, ...categoryObject };

  await initializeCategoryQuery(completeQueryObject);
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

      // If category is present, add it before the final category
      if (category) {
        const mainSlug = category.toLowerCase().replace(/\s/g, '-');
        const mainLink = createElement('a', {
          classes: 'breadcrumb-link',
          props: { href: getLocaleContextedUrl(`/part-category/${mainSlug}`) },
        });
        mainLink.textContent = category;

        const mainItem = createElement('li', {
          classes: ['breadcrumb-item', `breadcrumb-item-${index}`],
        });
        mainItem.appendChild(mainLink);
        breadcrumbList.appendChild(mainItem);
        index += 1;
      }

      // Add final subcategory (the one from the URL)
      const finalLink = createElement('a', {
        classes: 'breadcrumb-link active-link',
        props: { href: getLocaleContextedUrl(`/part-category/${subcategory}`) },
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
