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
// export const getCategory = () => {
//   const parts = window.location.pathname.split('/').filter(Boolean);
//   const segment = decodeURIComponent(parts[parts.length - 1] || '').trim();

//   if (!segment || ['landing', 'landing.docx'].includes(segment.toLowerCase())) {
//     return null;
//   }

//   return segment;
// };

export const getCategory = () => {
  const url = new URL(window.location.href);
  const urlParams = new URLSearchParams(url.search);

  return urlParams.get('category') || null;
};

/**
 * Finds the main category key and the exactly matched subcategory key.
 * * @param {Array<Object>} dataArray The array of category objects.
 * @param {string} subcategoryName The subcategory key string to search for (e.g., "antennas").
 * @returns {Object | null} An object with keys 'cat' and 'subcat' (the exact case from the data), or null if not found.
 */
export const getCategoryObject = (dataArray, subcategoryName) => {
  const searchKey = subcategoryName.toLowerCase();
  let matchingSubcategory = null;

  const foundObject = dataArray.find((categoryObj) => {
    if (categoryObj.subcategories && categoryObj.subcategories.length > 0) {
      const isMatch = categoryObj.subcategories.some((subCat) => {
        if (subCat.key.toLowerCase() === searchKey) {
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
 * - The value is an array of all 'key' values from the 'facets' array.
 *
 * @param {Array<Object>} facetArray - The input array of facet objects.
 * @returns {Object} The transformed object.
 */
export const transformFacets = (facetArray) => {
  return facetArray.reduce((accumulator, currentItem) => {
    const { field_name, facets } = currentItem;
    const keysArray = facets.map((facet) => facet.key);
    accumulator[field_name] = keysArray;

    return accumulator;
  }, {});
};
