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
  if (window.location.host.includes('localhost')) {
    const url = new URL(window.location.href);
    const urlParams = new URLSearchParams(url.search);

    // console.log(urlParams.get('facetFields').split('|'));
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
  // Use a base URL for context
  const base = 'https://search.example.com/results?';

  // 1. Process facetFields (using '|' as an internal separator)
  if (obj.facetFields && obj.facetFields.length > 0) {
    const ffValue = obj.facetFields.map(encodeURIComponent).join('|');
    params.push(`facetFields=${ffValue}`);
  }

  // 2. Process dynamicFilters
  if (obj.dynamicFilters && obj.dynamicFilters.length > 0) {
    obj.dynamicFilters.forEach((filter) => {
      const fieldName = filter.fieldName;
      const filterValues = filter.filterValue;

      if (fieldName && filterValues && filterValues.length > 0) {
        // Key format: df_[Encoded FieldName]
        const key = `df_${encodeURIComponent(fieldName)}`;
        // Value format: Comma-separated list of encoded filter values
        const value = filterValues.map(encodeURIComponent).join(',');
        params.push(`${key}=${value}`);
      }
    });
  }

  return base + params.join('&');
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
    return { facetFields: [], dynamicFilters: [] };
  }

  const searchParams = urlObject.searchParams;
  const result = {
    facetFields: [],
    dynamicFilters: [],
  };

  // 1. Process facetFields
  const ffString = searchParams.get('facetFields');
  if (ffString) {
    // Split by '|' and decode each part
    result.facetFields = ffString.split('|').map(decodeURIComponent);
  }

  // 2. Process dynamicFilters (parameters starting with 'df_')
  // Using a standard loop over searchParams.entries() to handle all keys
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith('df_')) {
      // Extract the encoded field name after 'df_'
      const encodedFieldName = key.substring(3);
      // Decode to get the original field name (respecting capitalization/symbols)
      const fieldName = decodeURIComponent(encodedFieldName);

      // Split the value by ',' and decode each filter value
      const filterValue = value.split(',').map(decodeURIComponent);

      // Add the reconstructed filter object to the array
      result.dynamicFilters.push({
        fieldName: fieldName,
        filterValue: filterValue,
      });
    }
  }

  return result;
};

// function updateURL(newFilters) {
//   const newQueryString = createQueryString(newFilters);

//   // Construct the new URL path
//   const newUrl = `${window.location.pathname}?${newQueryString}`;

//   // Update the browser URL without reloading the page
//   window.history.replaceState(null, '', newUrl);
// }

/**
 * Replaces an object in Session Storage entirely.
 * @param {string} key - The key to store the data under.
 * @param {object} newObject - The entire object to save.
 */
export const updateGlobalQueryObject = (key, newObject) => {
  try {
    const jsonString = JSON.stringify(newObject);
    sessionStorage.setItem(key, jsonString);

    const event = new CustomEvent('QueryUpdated', { detail: newObject });
    document.dispatchEvent(event);
  } catch (error) {
    console.error('Error saving to sessionStorage:', error);
  }
};
