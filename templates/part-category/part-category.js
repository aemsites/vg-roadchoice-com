import { createElement, getLongJSONData, DEFAULT_LIMIT, getLocaleContextedUrl, getJsonFromUrl } from '../../scripts/common.js';
import { decorateLinks } from '../../scripts/scripts.js';

const url = new URL(window.location.href);
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
 * Returns the category name from the URL query string, or _null_ if it is not present.
 * @returns {string|null} The category name or _null_.
 */
const getCategory = () => {
  const urlParams = new URLSearchParams(url.search);

  return urlParams.get('category') || null;
};

/**
 * Updates the sessionStorage with the category data and the amount of products to show.
 * @param {string} cat The category name.
 * @returns {void}
 * @throws {Error} If the category data is not found.
 * @emits {Event} _CategoryDataLoaded_ When the category data is loaded.
 */
const getCategoryData = async (cat) => {
  try {
    const productDataUrl = getLocaleContextedUrl(`/product-data/rc-${cat.replace(/[^\w]/g, '-')}.json`);
    const products = await getLongJSONData({
      url: productDataUrl,
      limit: DEFAULT_LIMIT,
    });
    json.data = products;
    json.limit = 20;
    json.total = products.length;
    if (!json) throw new Error(`No data found in "${cat}" category file`);
    const event = new Event('CategoryDataLoaded');
    mainCategory = json.data[0].Category;
    window.categoryData = json.data;
    sessionStorage.setItem('amount', amount);
    document.dispatchEvent(event);
    return products;
  } catch (err) {
    console.log('%cError fetching category data', 'color:red;background-color:aliceblue', err);
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

export default async function decorate(doc) {
  category = getCategory();
  if (!category) {
    window.location.href = get404PageUrl();
    return;
  }
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

  // update breadcrumb adding the category dynamically
  const observer = new MutationObserver((mutations) => {
    const { target } = mutations[0];
    if (target.dataset.blockStatus === 'loaded') {
      const breadcrumbList = target.querySelector('.breadcrumb-list');
      const lastElLink = breadcrumbList.lastElementChild.firstElementChild;
      const { length } = breadcrumbList.children;
      const { className } = lastElLink;
      const link = createElement('a', {
        classes: className,
        props: { href: `${url.origin}/part-category/?category=${category}` },
      });
      link.textContent = title.textContent;
      const breadcrumbItem = createElement('li', {
        classes: ['breadcrumb-item', `breadcrumb-item-${length}`],
      });

      if (mainCategory) {
        mainCategory = mainCategory.toLowerCase();
        lastElLink.href += `${mainCategory.replace(/\s/g, '-')}`;
        lastElLink.textContent = mainCategory;
      } else {
        lastElLink.href = url.origin;
      }
      breadcrumbItem.appendChild(link);
      breadcrumbList.appendChild(breadcrumbItem);

      observer.disconnect();
    }
  });
  observer.observe(breadcrumbBlock, { attributes: true, attributeFilter: ['data-block-status'] });
}
