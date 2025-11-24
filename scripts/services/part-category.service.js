const isLocalhost = window.location.host.includes('localhost');

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
  if (isLocalhost) {
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

/**
 * Converts the object into a query string URL.
 *
 * The strategy is:
 * 1. facetFields are joined by a pipe (|) and stored under the 'facetFields' key.
 * 2. dynamicFilters are converted into individual parameters starting with 'df_' + FieldName.
 * The FieldName and all values are URL-encoded to handle special characters (like '&', '(', ' ').
 * @param {Object} obj The input object with facetFields and dynamicFilters.
 * @returns {string} The constructed URL.
 */
export const objectToUrl = (obj) => {
  const params = [];

  const subcategory = getCategory();

  const subcatParam = isLocalhost ? `?category=${subcategory}&` : '?';
  const base = window.location.pathname + subcatParam;

  if (obj.dynamicFilters && obj.dynamicFilters.length > 0) {
    obj.dynamicFilters.forEach((filter) => {
      const fieldName = filter.fieldName;
      const filterValues = filter.filterValue;

      if (fieldName && filterValues && filterValues.length > 0) {
        const key = `df_${encodeURIComponent(fieldName)}`;
        const value = filterValues.map(encodeURIComponent).join(',');
        params.push(`${key}=${value}`);
      }
    });
  }

  let finalUrl = base + params.join('&');

  // Remove & if no filter is selected
  if (obj.dynamicFilters.length === 0) {
    finalUrl = finalUrl.slice(0, -1);
  }

  return finalUrl;
};

/**
 * Reconstructs the original object from a query string URL.
 *
 * This function reverses the encoding strategy used in objectToUrl.
 * It uses URLSearchParams to extract parameters and then rebuilds the structure.
 * @param {string} url The URL containing the encoded object data.
 * @returns {Object} The reconstructed object.
 */
export const urlToObject = (url) => {
  let urlObject;
  try {
    urlObject = new URL(url);
  } catch (e) {
    console.error('Invalid URL provided:', e);
    return { dynamicFilters: [] };
  }

  const searchParams = urlObject.searchParams;
  const result = {
    dynamicFilters: [],
  };

  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith('df_')) {
      const encodedFieldName = key.substring(3);
      const fieldName = decodeURIComponent(encodedFieldName);

      const filterValue = value.split(',').map(decodeURIComponent);

      result.dynamicFilters.push({
        fieldName: fieldName,
        filterValue: filterValue,
      });
    }
  }

  return result;
};

/**
 * Updates the global query object in session storage, the url and triggers an event captured
 * by the product list component
 * @param {string} key - The key to store the data under.
 * @param {object} newObject - The entire object to save.
 */
export const updateGlobalQueryObject = (key, newObject) => {
  try {
    const jsonString = JSON.stringify(newObject);
    sessionStorage.setItem(key, jsonString);

    const event = new CustomEvent('QueryUpdated', { detail: newObject });
    document.dispatchEvent(event);

    const newUrl = objectToUrl(newObject);
    window.history.replaceState(null, '', newUrl);
  } catch (error) {
    console.error('Error updating query object:', error);
  }
};
