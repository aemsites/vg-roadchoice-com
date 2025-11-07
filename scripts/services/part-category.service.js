import { isDevHost } from '../common.js';

/* Cases that throw an error if the category is wrong or missing that goes to 404 page:
 * 1. "/part-category/" => 404 if is index path
 * 2. "/part-category/?" => 404 if is index path width query string or wrong query parameter
 * 3. "/part-category/?category" => 404 if is an empty category without "=" sign
 * 4. "/part-category/?category=" => 404 if is an empty category with "=" sign
 * 5. "/part-category/?category=asdf" => 404 if is a wrong category
 */
/**
 * Extracts the category name from the URL path. Debug mode enables work in local with old format URL
 *
 * Returns `null` if the path points to a clean-URL template page (e.g., a category landing page),
 * typically represented by `/part-category/`, `/en-ca/part-category/`, etc.
 *
 * Added a debug mode in order to enable work on local environment.
 * To test for example: http://localhost:3000/part-category/?category=jacks
 *
 * @returns {string|null} The category name from the URL path, or `null` if the path points to a landing page.
 */
export const getCategory = () => {
  if (isDevHost()) {
    const url = new URL(window.location.href);
    const urlParams = new URLSearchParams(url.search);

    return urlParams.get('category') || null;
  } else {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const segment = decodeURIComponent(parts[parts.length - 1] || '').trim();

    if (!segment || ['landing', 'landing.docx'].includes(segment.toLowerCase())) {
      return null;
    }
    return segment;
  }
};

/**
 * Finds the main category key and the exactly matched subcategory key.
 * * @param {Array<Object>} dataArray The array of category objects.
 * @param {string} subcategoryName The subcategory key string to search for (e.g., "Antennas").
 * @returns {{category: string, subcategory: string} | null} An object, or null if not found.
 */
export const getCategoryObject = (dataArray, rawSubcategoryName) => {
  const searchKey = rawSubcategoryName.toLowerCase().replaceAll('-', ' ');
  let matchingSubcategory = null;

  const foundObject = dataArray.find((categoryObj) => {
    if (categoryObj.subcategories && categoryObj.subcategories.length > 0) {
      const isMatch = categoryObj.subcategories.some((subCat) => {
        const subCatSearchKey = subCat.key.toLowerCase().replaceAll('-', ' ');

        if (subCatSearchKey === searchKey) {
          matchingSubcategory = subCat;
          return true;
        }
        return false;
      });
      return isMatch;
    }
    return false;
  });

  if (foundObject && matchingSubcategory) {
    return {
      category: foundObject.key,
      subcategory: matchingSubcategory.key,
    };
  }

  return null;
};

/**
 * Transforms an array of facet objects into a single object where:
 * - The field_name becomes the key.
 * - The value is an array of objects, each containing the facet's key and its doc_count.
 *
 * @param {Array<Object>} facetArray - The input array of facet objects (e.g., from an API response).
 * @returns {Object} The transformed object with the format: { "field_name": [{ key: string, doc_count: number }, ...] }.
 */
export const transformFacets = (facetArray) => {
  return facetArray.reduce((accumulator, currentItem) => {
    const { field_name, facets } = currentItem;

    const keysArray = facets.map((facet) => ({
      key: facet.key,
      doc_count: facet.doc_count,
    }));

    accumulator[field_name] = keysArray;

    return accumulator;
  }, {});
};
