import { subcategorySearch, fetchCategories } from '../../blocks/search/graphql-api.js';
import {
  createElement,
  getLongJSONData,
  DEFAULT_LIMIT,
  getLocaleContextedUrl,
  getJsonFromUrl,
  setOrCreateMetadata,
  getTextLabel,
} from '../../scripts/common.js';
import { decorateLinks } from '../../scripts/scripts.js';
import { getCategory, getCategoryObject } from '../../scripts/services/category.service.js';

const categoryMaster = getLocaleContextedUrl('/product-data/rc-attribute-master-file.json');
const amount = 12;
let mainCategory;
let filterAttribs;
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
 * Transforms an array of facet objects into a single object where:
 * - The field_name becomes the key.
 * - The value is an array of all 'key' values from the 'facets' array.
 *
 * @param {Array<Object>} facetArray - The input array of facet objects.
 * @returns {Object} The transformed object.
 */
const transformFacets = (facetArray) => {
  // Use the reduce method to iterate over the array and build a single object (the accumulator).
  return facetArray.reduce((accumulator, currentItem) => {
    // Use destructuring to easily extract the field name and facets array.
    const { field_name, facets } = currentItem;

    // Map the inner 'facets' array to an array of just the 'key' strings.
    const keysArray = facets.map((facet) => facet.key);

    // Assign the new property to the accumulator object using the field_name as the key.
    accumulator[field_name] = keysArray;

    // Return the updated object for the next iteration.
    return accumulator;
  }, {}); // Initialize the accumulator as an empty object.
};

/**
 * Loads product data for the given category and updates internal state and sessionStorage.
 * If the data file does not exist or contains no products, the state is reset and an empty array is returned.
 *
 * @param {string} cat - The category name.
 * @returns {Promise<Array>} The list of products in the category, or an empty array if not found.
 * @emits {Event} CategoryDataLoaded - When the category data is successfully loaded.
 */
export const getItemsAndFacets = async (filters, subcategory) => {
  const rawCategoryList = await fetchCategories();

  const categoryQueryObject = await getCategoryObject(rawCategoryList, subcategory);
  categoryQueryObject.facetFields = filters;

  try {
    const rawData = await subcategorySearch(categoryQueryObject);
    const { items, facets } = rawData;
    const products = items.map((item) => item.metadata);
    const filters = transformFacets(facets);

    if (!Array.isArray(products) || products.length === 0) {
      console.warn(`[CategoryData] No product data found or empty array returned for category: "${subcategory}"`);
      json.data = [];
      json.limit = 0;
      json.total = 0;
      return [];
    }

    json.data = products;
    json.limit = 20;
    json.total = products.length;

    mainCategory = categoryQueryObject.category;

    if (!mainCategory) {
      console.warn(`[CategoryData] mainCategory is missing for: "${subcategory}"`);
    }

    window.categoryData = json.data;
    sessionStorage.setItem('amount', amount);

    const event = new Event('CategoryDataLoaded');
    document.dispatchEvent(event);

    return {
      products,
      filters: facets,
    };
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

    filterAttribs = filtersJson
      .filter((el) => el.Subcategory.toLowerCase().replace(/ /g, '-') === cat.toLowerCase() && el.Filter === '')
      .map((el) => el.Attributes);
    const event = new Event('FilterAttribsLoaded');
    sessionStorage.setItem('filter-attribs', JSON.stringify(filterAttribs));
    document.dispatchEvent(event);
  } catch (err) {
    console.log('%cError fetching filter attributes', 'color:red;background-color:aliceblue', err);
    window.location.href = get404PageUrl();
  }
  return filterAttribs;
};

const resetCategoryData = () => {
  sessionStorage.removeItem('category-data');
  sessionStorage.removeItem('filter-attribs');
  sessionStorage.removeItem('amount');
};

// /**
//  * Updates the title's textContent based on the Subcategory from the product data.
//  * @param {HTMLElement} title - The title element to update.
//  * @param {string} category - The fallback category name.
//  * @param {Array} categoryData - The product data array to retrieve the Subcategory from.
//  */
// const updateTitle = (titleElmt) => {
//   titleElmt.textContent = subcategory || mainCategory;
//   if (!subcategory) {
//     console.log(
//       subcategory === null ? 'No product data found, using fallback category' : 'No subcategory found in product data, using fallback category',
//     );
//   }
// };

/**
 * Fetches and formats the subcategory data to build the subtitle.
 * @returns {Object} The subcategory data as single object.
 * @throws {Error} If the subcategory data is not found.
 */
// const getSubtitleData = async (cat) => {
//   try {
//     const url = getLocaleContextedUrl('/part-category/subcategory-text.json');
//     const response = await getJsonFromUrl(url);
//     const { data } = response;
//     const result = data?.find((obj) => obj.subcategory === cat);
//     if (result) {
//       for (const key in result) {
//         if (result[key] === '') {
//           result[key] = null;
//         }
//       }
//     }
//     return result;
//   } catch (err) {
//     console.log('%cError fetching subcategories', err);
//   }
// };

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
  const subcategory = await getCategory();

  if (!subcategory) {
    console.log('No category provided — assuming this is the category template');
    return;
  }
  setCanonicalUrl(subcategory);
  updateMetadata(subcategory);
  const main = doc.querySelector('main');
  const breadcrumbBlock = main.querySelector('.breadcrumb-container .breadcrumb');
  const titleWrapper = createElement('div', { classes: 'title-wrapper' });
  const title = createElement('h1', { classes: 'part-category-title' });
  title.textContent = subcategory;

  titleWrapper.appendChild(title);

  // const subtitleObject = await getSubtitleData(subcategory);
  // if (subtitleObject?.text) {
  //   const { text, linkText, linkUrl } = subtitleObject;
  //   const subtitle = document.createRange().createContextualFragment(`
  //     <p class='part-category-subtitle'>
  //       ${text}
  //       ${linkText?.length > 0 ? `<a href='${linkUrl}'>${linkText}</a>` : ''}
  //     </p>
  //   `);
  //   titleWrapper.appendChild(subtitle);
  //   decorateLinks(titleWrapper);
  // }

  const section = [...main.children].filter((child) => !['breadcrumb-container', 'search-container'].some((el) => child.classList.contains(el)))[0];
  section.classList.add('part-category');
  section.prepend(titleWrapper);

  const activeFilters = await getFilterAttrib(subcategory);

  const productsAndFilters = await getItemsAndFacets(activeFilters, subcategory);
  console.log(productsAndFilters);
  // updateTitle(title);

  resetCategoryData();

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
