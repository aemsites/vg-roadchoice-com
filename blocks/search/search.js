import { createElement, getTextLabel, getLocaleContextedUrl, SEARCH_CONFIG } from '../../scripts/common.js';
import { fetchSearchResults, fetchFilterFacets } from '../../scripts/graphql-api.js';
import productCard from '../results-list/product-card.js';
import { noResultsTemplate } from '../../templates/search-results/search-results.js';
import { buildFilter } from '../filters/filters.js';
import { handleArrowKeys, fetchAutoSuggestions, buildSuggestion, applyFuzzySearch } from './autosuggest-helper.js';

export const blockName = 'search';
let isCrossRefActive = true;

const PLACEHOLDERS = {
  crossReference: getTextLabel('cross-reference_number'),
  partNumber: getTextLabel('part_number_or_description'),
  partNumberLabel: getTextLabel('part_number_slash_description'),
};

const TEMPLATES = {
  searchBy: `
  <div class="search__search-by__container">
    <label class="search__search-by__label" name="SearchBy">Search By</label>
    <div class="search__buttons__wrapper">
      <button class="button search__cross-reference__btn shadow active" type="button" name="crossReference">
        Cross-Reference
      </button>
      <button class="button search__part-number__btn shadow" type="button" name="partNumber">
        Part Number
      </button>
    </div>
  </div>
  `,
  filters: `
  <div class="search__filters__container">
    <div class="search__make-filter__wrapper">
      <label class="search__make-filter__label">Make</label>
      <select class="search__make-filter__select shadow">
        <option value="null">Make (All)</option>
      </select>
    </div>
    <div class="search__model-filter__wrapper">
      <label class="search__model-filter__label">Model</label>
      <select class="search__model-filter__select shadow" disabled>
        <option value="null">Model (All)</option>
      </select>
    </div>
  </div>
  `,
  filtersResetOpt: `
    <option value="null">Model (All)</option>
  `,
  inputCR: `
  <div class="search__input-cr__container">
    <label class="search__input-cr__label">Cross-Reference Number</label>
    <div class="search__input-cr__wrapper">
      <div class="search__autosuggest-wrapper">
        <input class="search__input-cr__input shadow" type="search" placeholder="${PLACEHOLDERS.crossReference}"  aria-autocomplete="suggest"/>
      </div>
      <button class="button search__input-cr__submit shadow search-button" type="submit">
        SEARCH &nbsp;
        <span class="fa fa-search"></span>
      </button>
    </div>
  </div>
  `,
  inputPN: `
  <div class="search__input-pn__container">
    <label class="search__input-pn__label">${PLACEHOLDERS.partNumberLabel}</label>
    <div class="search__input-pn__wrapper">
      <div class="search__autosuggest-wrapper">
        <input class="search__input-pn__input shadow" type="search" placeholder="${PLACEHOLDERS.partNumber}" aria-autocomplete="suggest" />
      </div>
      <button class="button search__input-pn__submit shadow search-button" type="submit">
        SEARCH &nbsp;
        <span class="fa fa-search"></span>
      </button>
    </div>
  </div>
  `,
  autosuggestWrapper: `
  <div class="search__autosuggest-container"> 
    <ul role="listbox" class="search__autosuggest-list"></ul>
  </div>
  `,
};

const activeClassName = `${blockName}__autosuggest-item--active`;

function resetModelsFilter(models, disabled = true) {
  models.innerHTML = TEMPLATES.filtersResetOpt;
  models.disabled = disabled;
}

function addSearchByListeners(wrapper, form) {
  wrapper.onclick = (e) => {
    if (e.target.classList.contains('active')) {
      return;
    }
    // swap between search-by buttons
    form.querySelector(`.${blockName}__cross-reference__btn`).classList.toggle('active', !isCrossRefActive);
    form.querySelector(`.${blockName}__part-number__btn`).classList.toggle('active', isCrossRefActive);
    isCrossRefActive = !isCrossRefActive;
    // swap inputs and filters
    form.querySelector(`.${blockName}__filters-input__container`).classList.toggle('hide', isCrossRefActive);
    form.querySelector(`.${blockName}__input-cr__container`).classList.toggle('hide', !isCrossRefActive);
    // remove the value from the not active input
    form.querySelector(`.${blockName}__input-${isCrossRefActive ? 'pn' : 'cr'}__input`).value = '';
    // reset filters
    if (isCrossRefActive) {
      form.querySelector(`.${blockName}__make-filter__select`).selectedIndex = 0;
      resetModelsFilter(form.querySelector(`.${blockName}__model-filter__select`));
    }

    if (e.target.classList.contains(`${blockName}__cross-reference__btn`)) {
      document.querySelector(`.${blockName}__fuzzysearch-results-wrapper`)?.remove();
      document.querySelector(`.${blockName}__no-results-title`)?.remove();
    }
  };
}

function populateFilter(select, items) {
  const docRange = document.createRange();
  let htmlFragment = '';
  const urlParams = new URLSearchParams(window.location.search);
  items.forEach((item) => {
    const itemValue = urlParams.get('cat') ? item.toLowerCase() : item;
    htmlFragment += `
      <option value="${itemValue}">${item}</option>
    `;
  });
  const fragment = docRange.createContextualFragment(htmlFragment);
  select.appendChild(fragment);
}

export const getAndApplySearchResults = async ({ isFirstSet }) => {
  const { MAX_PRODUCTS_PER_QUERY = false } = SEARCH_CONFIG;
  const urlParams = new URLSearchParams(window.location.search);
  const resultsSection = document.querySelector('.results-list__section');
  const resultsList = document.querySelector('.results-list__list');
  const fuzzyTerm = urlParams.get('fuzzyTerm');

  if (fuzzyTerm?.length) {
    const suggestions = await applyFuzzySearch(fuzzyTerm);
    if (!suggestions?.length) {
      const url = new URL(window.location);
      url.searchParams.delete('fuzzyTerm');
      url.searchParams.set('q', fuzzyTerm);
      url.searchParams.set('q', fuzzyTerm === 'null' ? '' : fuzzyTerm);
      window.history.pushState({}, '', url);
      getAndApplySearchResults({ isFirstSet: true });
    }
  } else {
    const queryTerm = urlParams.get('q');
    const query = queryTerm === 'null' ? '' : queryTerm;
    const offsetParam = urlParams.get('offset');
    const make = urlParams.get('make');
    const model = urlParams.get('model');
    const searchType = urlParams.get('st');
    const category = urlParams.get('category');
    const parsedOffset = Number.parseInt(offsetParam, 10);
    const currentPage = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
    const targetOffset = isFirstSet ? currentPage : currentPage + 1;

    const offset = MAX_PRODUCTS_PER_QUERY ? targetOffset * parseInt(MAX_PRODUCTS_PER_QUERY) : 0;
    const searchParams = { query, offset, make, model, searchType, category };
    const loadingElement = showLoader(resultsSection);

    if (!isCrossRefActive) {
      const applyFuzziness = urlParams.get('fuzzyness') ? true : false;
      searchParams.applyFuzziness = applyFuzziness;
    }

    const { results, categories } = await fetchSearchResults(searchParams);
    loadingElement?.remove();

    if (!isFirstSet) {
      updateUrl(targetOffset);
    }
    updateSearchResults(results, searchType, query, make, model, resultsSection, resultsList, targetOffset);
    updateFilters(categories);
  }
};

const updateUrl = (targetOffset) => {
  const newUrl = new URL(window.location);
  const safeOffset = isNaN(targetOffset) ? 0 : targetOffset;
  newUrl.searchParams.set('offset', safeOffset);
  window.history.pushState({ path: newUrl.href }, '', newUrl.href);
};

const showLoader = (resultsSection) => {
  const loadingLabel = getTextLabel('loading_label');
  let loadingElement = document.querySelector('.loading');
  if (!loadingElement) {
    loadingElement = createElement('div', { classes: 'loading' });
    resultsSection?.append(loadingElement);
  }
  loadingElement.textContent = loadingLabel;
  return loadingElement;
};

/**
 * returns the search title text based on the search type
 * @description __cross-reference template text:__ _Search Results for Cross-Reference: [$q]_;
 * @example 'Search Results for Cross-Reference: "123456"';
 * @description part number template text: _Search Results for "[$1]" "[$2]" "[$q]" parts_;
 * @example 'Search Results for "[make]" "[model]" "[part number or description]" parts';
 * @param {string} searchType - the search type
 * @param {string} query - the search query
 * @param {string} make - the make of the product
 * @param {string} model - the model of the product
 * @returns {string} - the search title text
 */
const getSearchTitleText = ({ searchType, query, make, model }) => {
  return getTextLabel(`SEARCH_RESULT:${searchType}_title`)
    .replace('[$1]', make ? `"${make}" ` : '')
    .replace('[$2]', model ? `"${model}" ` : '')
    .replace('[$q]', query ? `"${query}"` : '');
};

const updateSearchResults = (results, searchType, query, make, model, resultsSection, resultsList, targetOffset) => {
  const searchResultsSection = document.querySelector('.search-results-section');
  const titleElement = searchResultsSection?.querySelector('.title');

  if (results?.length > 0) {
    results.forEach((result) => {
      const liElement = productCard(result, searchType);
      resultsList?.appendChild(liElement);
    });
    const titleText = getSearchTitleText({
      searchType,
      query,
      make,
      model,
    });
    if (titleElement) {
      titleElement.textContent = titleText;
    }

    updatePagination(resultsSection, targetOffset, results.length);
  } else {
    showNoResultsMessage(query, searchResultsSection);
  }
};

const updatePagination = (resultsSection, targetOffset, resultsLength) => {
  const { MAX_PRODUCTS_PER_QUERY = false } = SEARCH_CONFIG;
  const buttonTextContent = getTextLabel('pagination_button');
  const resultsCountElement = document.querySelector('.top-results-text');
  const currentAmount = document.querySelectorAll('.product-card').length;
  const displayedTextContent = getTextLabel('pagination_text');
  const newText = displayedTextContent.replace('[$]', currentAmount);
  if (resultsCountElement) {
    resultsCountElement.innerText = newText;
  }

  if (targetOffset === 0) {
    const bottomMoreBtn = createElement('button', { classes: ['more-button', 'bottom-more-button'] });
    bottomMoreBtn.textContent = buttonTextContent;
    resultsSection?.appendChild(bottomMoreBtn);
    bottomMoreBtn.onclick = () => getAndApplySearchResults({ isFirstSet: false });
  }

  if (!MAX_PRODUCTS_PER_QUERY || resultsLength < parseInt(MAX_PRODUCTS_PER_QUERY)) {
    document.querySelectorAll('.more-button').forEach((moreBtn) => moreBtn.remove());
  }
};

export const showNoResultsMessage = (query, searchResultsSection) => {
  const titleElement = searchResultsSection?.querySelector('.title');
  const titleText = getTextLabel('no_results_title').replace('[$]', query ? query : '');
  if (titleElement) {
    titleElement.innerText = titleText;
  }
  const fragment = document.createRange().createContextualFragment(noResultsTemplate);
  searchResultsSection?.classList.add('no-results');
  searchResultsSection?.insertBefore(fragment, document.querySelector('.filters-wrapper'));
};

const updateFilters = (categories) => {
  const filtersWrapper = document.querySelector('.filters-wrapper');
  const filters = buildFilter(categories);
  if (filtersWrapper && filters) {
    filtersWrapper.innerHTML = '';
    filtersWrapper.append(filters);
  }
};

async function getAndApplyFiltersData(form) {
  const makeSelect = form.querySelector(`.${blockName}__make-filter__select`);
  const modelsSelect = form.querySelector(`.${blockName}__model-filter__select`);
  const fetchedMakeFacets = await fetchFilterFacets({ field: 'MAKE' });
  const makeFacets = fetchedMakeFacets.facets.facets;
  const makeItems = makeFacets.map((facet) => facet.key);
  populateFilter(makeSelect, makeItems);
  makeSelect.onchange = async (e) => {
    const isNull = e.target.value === 'null';
    if (isNull) {
      // if is null then disable the models filter
      resetModelsFilter(modelsSelect);
      return;
    }
    // if is not null then enable the select and then is filled by the maker value
    const fetchedModelFacets = await fetchFilterFacets({ field: 'NAME', filter: makeSelect.value });
    const modelFacets = fetchedModelFacets.facets.facets;
    const modelItems = modelFacets.map((facet) => facet.key);
    resetModelsFilter(modelsSelect, false);
    populateFilter(modelsSelect, modelItems);
  };
}

function getFieldValue(selector, items) {
  const field = items.find((item) => item.classList.contains(selector));
  if (field && field.value && field.value !== 'null') {
    return field.value;
  }
  return null;
}

function getMakeFilterValue(items) {
  return getFieldValue(`${blockName}__make-filter__select`, items);
}

function getModelFilterValue(items) {
  return getFieldValue(`${blockName}__model-filter__select`, items);
}

function addFormListener(form) {
  form.onsubmit = async (e) => {
    e.preventDefault();
    const items = [...form];
    const value = getFieldValue(`${blockName}__input-${isCrossRefActive ? 'cr' : 'pn'}__input`, items);
    const wrapper = form.querySelector(`.${blockName}__autosuggest-list`);
    const url = new URL(window.location.href);
    url.pathname = getLocaleContextedUrl('/search/');
    const fuzzyTerm = url.searchParams.get('fuzzyTerm');
    const makeFilterValue = getMakeFilterValue(items);
    const modelFilterValue = getFieldValue(`${blockName}__model-filter__select`, items);

    if (!isCrossRefActive && !wrapper?.children?.length) {
      url.search = `?fuzzyTerm=${value}&st=parts&offset=0${makeFilterValue ? `&make=${makeFilterValue}` : ''}${modelFilterValue ? `&model=${modelFilterValue}` : ''}`;
    } else {
      const searchType = isCrossRefActive
        ? 'cross'
        : `parts${makeFilterValue ? `&make=${makeFilterValue}` : ''}${modelFilterValue ? `&model=${modelFilterValue}` : ''}`;
      const offset = 0;
      url.search = `?q=${value}&st=${searchType}&offset=${offset}`;
      if (fuzzyTerm) {
        url.search = `${url.search}&fuzzyness=${true}`;
      }
    }
    window.location.href = url;
  };
}

function addKeyUpEvent(form) {
  const crInput = form.querySelector(`.${blockName}__input-cr__input`);
  const partInput = form.querySelector(`.${blockName}__input-pn__input`);
  const items = [...form];
  const wrapper = form.querySelector(`.${blockName}__autosuggest-list`);
  let isLoading = false;
  [crInput, partInput].forEach((input) => {
    input.addEventListener('input', async (e) => {
      const searchTerm = e.target.value;
      if (!searchTerm) {
        wrapper.innerHTML = '';
        return;
      }

      if (searchTerm.length < 3 && wrapper.children.length) {
        wrapper.innerHTML = '';
      }

      if (searchTerm.length > 2 && !isLoading) {
        const params = {
          term: searchTerm,
          isCrossRefActive: isCrossRefActive,
        };
        if (!isCrossRefActive) {
          params.make = getMakeFilterValue(items);
          params.model = getModelFilterValue(items);
        }
        const suggestions = await fetchAutoSuggestions(params);
        isLoading = false;
        wrapper.innerHTML = '';
        const listElements = buildSuggestion(suggestions, form);
        wrapper.append(...listElements);
        e.target.after(wrapper);
        wrapper?.classList.add(`${blockName}__autosuggest-list--show`);
      }
    });

    input.addEventListener('keyup', (e) => {
      if (wrapper?.children?.length && ['ArrowUp', 'ArrowDown'].includes(e.key)) {
        handleArrowKeys([...wrapper.children], e, activeClassName);
      }
    });
  });
}

export default function decorate(block) {
  const formWrapper = createElement('div', { classes: `${blockName}-wrapper` });
  const form = createElement('form', { classes: `${blockName}-form` });
  const pnContainer = createElement('div', { classes: [`${blockName}__filters-input__container`, 'hide'] });
  const list = createElement('ul', { classes: `${blockName}__autosuggest-list`, props: { role: 'listbox' } });
  form.innerHTML = TEMPLATES.searchBy + TEMPLATES.inputCR;
  // Part number input and its filters are hidden by default
  pnContainer.innerHTML = TEMPLATES.filters + TEMPLATES.inputPN;
  form.append(pnContainer, list);
  // add listeners and fill filters with data
  addSearchByListeners(form.querySelector(`.${blockName}__buttons__wrapper`), form);
  getAndApplyFiltersData(form);
  addKeyUpEvent(form);
  addFormListener(form);
  // insert templates to form
  formWrapper.appendChild(form);
  block.appendChild(formWrapper);
}
