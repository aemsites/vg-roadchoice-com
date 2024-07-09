import {
  createElement,
  getLongJSONData,
  defaultLimit,
} from '../../scripts/scripts.js';

const categoryMaster = '/product-data/rc-attribute-master-file.json';
const amount = 12;
const url = new URL(window.location.href);
const urlParams = new URLSearchParams(url.search);
let category;
let mainCategory;
const json = {
  data: [],
  limit: 0,
  offset: 0,
  total: 0,
};

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
const getCategory = async () => urlParams.get('category') || null;

/**
 * Updates the sessionStorage with the category data and the amount of products to show.
 * @param {string} cat The category name.
 * @returns {void}
 * @throws {Error} If the category data is not found.
 * @emits {Event} _CategoryDataLoaded_ When the category data is loaded.
*/
const getCategoryData = async (cat) => {
  try {
    const products = await getLongJSONData({
      url: `/product-data/rc-${cat.replace(/[^\w]/g, '-')}.json`,
      limit: defaultLimit,
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
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('%cError fetching category data', 'color:red;background-color:aliceblue', err);
    window.location.href = '/404.html';
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
      limit: defaultLimit,
    });

    if (!filtersJson) throw new Error('Failed to fetch filter data');

    const filterAttribs = filtersJson.filter((el) => el.Subcategory.toLowerCase() === cat.toLowerCase().replaceAll('-', ' ') && el.Filter === '').map((el) => el.Attributes);

    const event = new Event('FilterAttribsLoaded');
    sessionStorage.setItem('filter-attribs', JSON.stringify(filterAttribs));
    document.dispatchEvent(event);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('%cError fetching filter attributes', 'color:red;background-color:aliceblue', err);
    window.location.href = '/404.html';
  }
};

const resetCategoryData = () => {
  sessionStorage.removeItem('category-data');
  sessionStorage.removeItem('filter-attribs');
  sessionStorage.removeItem('amount');
};

export default async function decorate(doc) {
  category = await getCategory();
  if (!category) {
    window.location.href = '/404.html';
    return;
  }
  const main = doc.querySelector('main');
  const breadcrumbBlock = main.querySelector('.breadcrumb-container .breadcrumb');
  const titleWrapper = createElement('div', { classes: 'title-wrapper' });
  const title = createElement('h1', { classes: 'part-category-title', textContent: category.replaceAll('-', ' ') });
  const section = [...main.children]
    .filter((child) => !['breadcrumb-container', 'search-container']
      .some((el) => child.classList.contains(el)))[0];
  section.classList.add('part-category');
  titleWrapper.appendChild(title);
  section.prepend(titleWrapper);
  resetCategoryData();
  await getCategoryData(category);
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
        textContent: category.replaceAll('-', ' '),
        props: { href: `${url.origin}/part-category/?category=${category}` },
      });
      const breadcrumbItem = createElement('li', {
        classes: ['breadcrumb-item', `breadcrumb-item-${length}`],
      });

      if (!mainCategory) {
        lastElLink.href = url.origin;
      } else {
        mainCategory = mainCategory.toLowerCase();
        lastElLink.href += `${mainCategory.replace(/\s/g, '-')}`;
        lastElLink.textContent = mainCategory;
      }
      breadcrumbItem.appendChild(link);
      breadcrumbList.appendChild(breadcrumbItem);

      observer.disconnect();
    }
  });
  observer.observe(breadcrumbBlock, { attributes: true, attributeFilter: ['data-block-status'] });
}
