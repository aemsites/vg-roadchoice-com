import { createElement, getJsonFromUrl, getTextLabel, getLocaleContextedUrl } from '../../scripts/common.js';

const blockName = 'search';
let isCrossRefActive = true;
let noOthersItems;
const modelsItems = [];
const FILTERS_DATA = getLocaleContextedUrl('/search/search-filters.json');
let crData;
let pnData;
export const amountOfProducts = 12;
let fitInStorage = true;
export const fitAmount = 5000;

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
      <input class="search__input-cr__input shadow" type="search" placeholder="${PLACEHOLDERS.crossReference}" />
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
      <input class="search__input-pn__input shadow" type="search" placeholder="${PLACEHOLDERS.partNumber}" />
      <button class="button search__input-pn__submit shadow search-button" type="submit">
        SEARCH &nbsp;
        <span class="fa fa-search"></span>
      </button>
    </div>
  </div>
  `,
};

function resetModelsFilter(models, disabled = true) {
  models.innerHTML = TEMPLATES.filtersResetOpt;
  models.disabled = disabled;
}

function addSearchByListeners(wrapper, form) {
  wrapper.onclick = (e) => {
    if (e.target.classList.contains('active')) return;
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
  };
}

function populateFilter(select, items) {
  const docRange = document.createRange();
  let htmlFragment = '';
  items.forEach((item) => {
    htmlFragment += `
      <option value="${item.toLowerCase()}">${item}</option>
    `;
  });
  const fragment = docRange.createContextualFragment(htmlFragment);
  select.appendChild(fragment);
}

async function getAndApplyFiltersData(form) {
  const makeSelect = form.querySelector(`.${blockName}__make-filter__select`);
  const modelsSelect = form.querySelector(`.${blockName}__model-filter__select`);
  const makeItems = [];
  const filters = await getJsonFromUrl(FILTERS_DATA);
  const { data } = filters || {};
  if (!data) return;
  data.forEach((item) => {
    const itemModels = item.Models !== 'null' ? item.Models.split(',') : [];
    modelsItems.push({ Make: item.Make, Models: itemModels });
    makeItems.push(item.Make);
  });
  populateFilter(makeSelect, makeItems);
  noOthersItems = makeItems.filter((item) => item !== 'Others');
  makeSelect.onchange = (e) => {
    const isNotNull = e.target.value !== 'null';
    // if is null then disable the models filter
    if (!isNotNull) {
      resetModelsFilter(modelsSelect);
      return;
    }
    // if is not null then enable the select and then is filled by the maker value
    const models = modelsItems.filter((item) => item.Make.toLowerCase() === e.target.value)[0].Models;
    resetModelsFilter(modelsSelect, false);
    populateFilter(modelsSelect, models);
  };
}

export function searchCRPartNumValue(value, data = crData) {
  const partNumberBrands = ['OEM_num'];
  const results = new Set();
  if (value.trim() === '') return [];
  partNumberBrands.forEach((brand) => {
    const tempResults = data.filter((item) => new RegExp(`.*${value.trim()}.*`, 'i').test(item[brand]));
    if (tempResults.length > 0) {
      tempResults.forEach((item) => results.add(item));
    }
  });
  return [...results];
}

function filterResults(results, filter, isMake = true) {
  const itemFilter = isMake ? 'Make' : 'Model';
  return results.filter((item) => {
    const itemValue = item[itemFilter].toLowerCase();
    const filterValue = filter.toLowerCase();
    // if is Model, can have a list of models
    if (!isMake && itemValue.includes(',')) {
      const modelArray = itemValue.split(',').map((s) => s.trim());
      return modelArray.includes(filterValue);
    }
    return itemValue === filterValue;
  });
}

function filterByOthersMake(results) {
  return results.filter((item) => !noOthersItems.includes(item.Make));
}

function filterByBasePartNumber(results) {
  const basePartNumbers = new Set();
  const filteredResults = [];
  results.forEach((item) => {
    if (!basePartNumbers.has(item['Base Part Number'])) {
      basePartNumbers.add(item['Base Part Number']);
      filteredResults.push(item);
    }
  });
  return filteredResults;
}

function filterPNByColumn({ column, data, value, make, model, results }) {
  let tempResults = data.filter((item) => new RegExp(`.*${value.trim()}.*`, 'i').test(item[column]));
  if (make === 'others' && tempResults.length > 0) {
    tempResults = filterByOthersMake(tempResults, make);
  } else if (make !== 'null' && tempResults.length > 0) {
    tempResults = filterResults(tempResults, make);
  }
  if (model !== 'null' && tempResults.length > 0) {
    tempResults = filterResults(tempResults, model, false);
  }
  if (tempResults.length > 0) tempResults = filterByBasePartNumber(tempResults);
  tempResults.forEach((item) => results.add(item));
}

export function searchPartNumValue(value, make, model, data = pnData) {
  // search by part number
  const partNumberBrands = ['Base Part Number', 'Volvo Part Number', 'Mack Part Number'];
  const results = new Set();
  if (value.trim() === '' && make === 'null' && model === 'null') return [];
  partNumberBrands.forEach((brand) => {
    filterPNByColumn({
      column: brand,
      data,
      value,
      make,
      model,
      results,
    });
  });
  // search by Description aka Part Name
  if (results.size === 0) {
    filterPNByColumn({
      column: 'Part Name',
      data,
      value,
      make,
      model,
      results,
    });
  }
  return [...results];
}

function getFieldValue(selector, items) {
  return items.filter((item) => item.classList.contains(selector))[0]?.value;
}

function formListener(form) {
  form.onsubmit = (e) => {
    e.preventDefault();

    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get('cat')) {
      const items = [...form];
      const value = getFieldValue(`${blockName}__input-${isCrossRefActive ? 'cr' : 'pn'}__input`, items);
      const makeFilterValue = getFieldValue(`${blockName}__make-filter__select`, items);
      const modelFilterValue = getFieldValue(`${blockName}__model-filter__select`, items);
      const searchType = isCrossRefActive
        ? 'cross'
        : `parts${makeFilterValue ? `&make=${makeFilterValue}` : ''}${modelFilterValue ? `&model=${modelFilterValue}` : ''}`;
      const offset = 0;
      const url = new URL(window.location.href);
      url.pathname = getLocaleContextedUrl('/search/');
      url.search = `?q=${value}&st=${searchType}&offset=${offset}`;
      window.location.href = url;
      return;
    }

    if (!window.allProducts) return;
    ({ crData, pnData } = window.allProducts);
    const ssData = ['query', 'results', 'amount'];
    const ssDataItems = [];
    const items = [...form];
    const value = getFieldValue(`${blockName}__input-${isCrossRefActive ? 'cr' : 'pn'}__input`, items);
    const makeFilterValue = getFieldValue(`${blockName}__make-filter__select`, items);
    const modelFilterValue = getFieldValue(`${blockName}__model-filter__select`, items);

    if (!crData || !pnData) return;
    ssData.forEach((item) => sessionStorage.removeItem(item));
    if (sessionStorage.getItem('total-results-amount')) sessionStorage.removeItem('total-results-amount');
    const results = isCrossRefActive ? searchCRPartNumValue(value) : searchPartNumValue(value, makeFilterValue, modelFilterValue);

    const url = new URL(window.location.href);
    const searchType = isCrossRefActive ? 'cross' : `parts&make=${makeFilterValue}&model=${modelFilterValue}`;
    const query = {
      searchType,
      value,
    };
    if (!isCrossRefActive) {
      query.make = makeFilterValue;
      query.model = modelFilterValue;
    }
    ssDataItems.push(query, results, amountOfProducts);
    ssData.forEach((item, i) => {
      if (i === 1 && results.length > fitAmount) {
        fitInStorage = false;
        return;
      }
      sessionStorage.setItem(item, JSON.stringify(ssDataItems[i]));
    });
    if (!fitInStorage) sessionStorage.setItem('total-results-amount', results.length);

    url.pathname = getLocaleContextedUrl('/search/');
    url.search = `?q=${value}&st=${searchType}`;
    window.location.href = url;
  };
}

export default function decorate(block) {
  const formWrapper = createElement('div', { classes: `${blockName}-wrapper` });
  const form = createElement('form', { classes: `${blockName}-form` });
  const pnContainer = createElement('div', { classes: [`${blockName}__filters-input__container`, 'hide'] });
  form.innerHTML = TEMPLATES.searchBy + TEMPLATES.inputCR;
  // Part number input and its filters are hidden by default
  pnContainer.innerHTML = TEMPLATES.filters + TEMPLATES.inputPN;
  form.appendChild(pnContainer);
  // add listeners and fill filters with data
  addSearchByListeners(form.querySelector(`.${blockName}__buttons__wrapper`), form);
  getAndApplyFiltersData(form);
  formListener(form);
  // insert templates to form
  formWrapper.appendChild(form);
  block.appendChild(formWrapper);
}
