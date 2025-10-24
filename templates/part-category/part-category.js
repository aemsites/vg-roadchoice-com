import { subcategorySearch } from '../../blocks/search/graphql-api.js';
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

/* Cases that throw an error if the category is wrong or missing that goes to 404 page:
 * 1. "/part-category/" => 404 if is index path
 * 2. "/part-category/?" => 404 if is index path width query string or wrong query parameter
 * 3. "/part-category/?category" => 404 if is an empty category without "=" sign
 * 4. "/part-category/?category=" => 404 if is an empty category with "=" sign
 * 5. "/part-category/?category=asdf" => 404 if is a wrong category
 */

/**
 * Extracts the category name from the URL path.
 *
 * Returns `null` if the path points to a clean-URL template page (e.g., a category landing page),
 * typically represented by `/part-category/`, `/en-ca/part-category/`, etc.
 *
 * @returns {string|null} The category name from the URL path, or `null` if the path points to a landing page.
 */
const getCategory = () => {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const segment = decodeURIComponent(parts[parts.length - 1] || '').trim();

  if (!segment || ['landing', 'landing.docx'].includes(segment.toLowerCase())) {
    return null;
  }

  return segment;
};

/**
 * Loads product data for the given category and updates internal state and sessionStorage.
 * If the data file does not exist or contains no products, the state is reset and an empty array is returned.
 *
 * @param {string} cat - The category name.
 * @returns {Promise<Array>} The list of products in the category, or an empty array if not found.
 * @emits {Event} CategoryDataLoaded - When the category data is successfully loaded.
 */
const getCategoryData = async (cat) => {
  try {
    const productDataUrl = getLocaleContextedUrl(`/product-data/rc-${cat.replace(/[^\w]/g, '-')}.json`);
    console.log('url', productDataUrl); // -> this returns '/product-data/rc-jacks.json'
    console.log(cat); // -> this returns 'jacks'
    // const products = await getLongJSONData({
    //   url: productDataUrl,
    //   limit: DEFAULT_LIMIT,
    // });
    const rawData = await subcategorySearch({ category: 'Tools', subcategory: 'Jacks' });
    const products = rawData.map((item) => item.metadata);

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

    mainCategory = json.data[0]?.Category;

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
    window.location.href = get404PageUrl();
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

    // console.warn(filtersJson); this is all +10000 filters
    if (!filtersJson) throw new Error('Failed to fetch filter data');

    const filterAttribs = filtersJson
      .filter((el) => el.Subcategory.toLowerCase().replace(/ /g, '-') === cat.toLowerCase() && el.Filter === '')
      .map((el) => el.Attributes);
    console.log(filterAttribs); // this is the list of active filters to display
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
 * Fetches and formats the subcategory data to build the subtitle.
 * @returns {Object} The subcategory data as single object.
 * @throws {Error} If the subcategory data is not found.
 */
const getSubtitleData = async (cat) => {
  try {
    const url = getLocaleContextedUrl('/part-category/subcategory-text.json');
    const response = await getJsonFromUrl(url);
    const { data } = response;
    const result = data?.find((obj) => obj.subcategory === cat);
    if (result) {
      for (const key in result) {
        if (result[key] === '') {
          result[key] = null;
        }
      }
    }
    return result;
  } catch (err) {
    console.log('%cError fetching subcategories', err);
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

  const subtitleObject = await getSubtitleData(category);
  if (subtitleObject?.text) {
    const { text, linkText, linkUrl } = subtitleObject;
    const subtitle = document.createRange().createContextualFragment(`
      <p class='part-category-subtitle'>
        ${text}
        ${linkText?.length > 0 ? `<a href='${linkUrl}'>${linkText}</a>` : ''}
      </p>
    `);
    titleWrapper.appendChild(subtitle);
    decorateLinks(titleWrapper);
  }

  const section = [...main.children].filter((child) => !['breadcrumb-container', 'search-container'].some((el) => child.classList.contains(el)))[0];
  section.classList.add('part-category');
  section.prepend(titleWrapper);

  resetCategoryData();
  const categoryData = await getCategoryData(category);
  updateTitleWithSubcategory(title, category, categoryData);
  getFilterAttrib(category);

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
        console.log('category', mainSlug);

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
      console.log('subcategory', category);
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
