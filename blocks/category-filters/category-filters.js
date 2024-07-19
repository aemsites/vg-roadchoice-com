import { createElement, getTextLabel } from '../../scripts/common.js';

const blockName = 'category-filters';
let products = window.categoryData;
let filters = JSON.parse(sessionStorage.getItem('filter-attribs'));
let isDecorated = false;
const titleText = getTextLabel('category_filters_title');
const clearText = getTextLabel('category_filters_clear_button');
const applyText = getTextLabel('category_filters_apply_button');

const renderBlock = async (block) => {
  const filterTitle = createElement('h3', { classes: `${blockName}-title` });
  filterTitle.textContent = titleText;
  const filterForm = createElement('form', { classes: `${blockName}-form`, props: { id: `${blockName}-form` } });
  const buttonsWrapper = createElement('div', { classes: `${blockName}-buttons-wrapper` });
  const clearFilterBtn = createElement('button', {
    classes: ['clear-filter-btn', 'filter-btn', 'secondary'],
    props: {
      type: 'submit',
      form: `${blockName}-form`,
      disabled: 'disabled',
      id: 'clear-filter-btn',
    },
  });
  clearFilterBtn.textContent = clearText;
  const applyFilterBtn = createElement('button', {
    classes: ['apply-filter-btn', 'filter-btn', 'primary'],
    props: {
      type: 'submit',
      form: `${blockName}-form`,
      disabled: 'disabled',
      id: 'apply-filter-btn',
    },
  });
  applyFilterBtn.textContent = applyText;
  const filterList = createElement('ul', { classes: `${blockName}-list` });

  // filter the data to add extra filters to every attribute
  filters.forEach((attribute) => {
    const filterItem = createElement('li', { classes: `${blockName}-item` });
    const titleWrapper = createElement('div', { classes: `${blockName}-title-wrapper` });
    const filterAttrib = createElement('h6', { classes: `${blockName}-item-title` });
    filterAttrib.textContent = attribute;
    const plusBtn = createElement('span', { classes: ['plus-btn', 'fa', 'fa-plus'] });
    const filterOptionsWrapper = createElement('ul', {
      classes: [`${blockName}-options-wrapper`, 'hidden'],
    });
    const set = new Set();
    products.forEach((product) => {
      if (product[attribute] !== '') set.add(product[attribute]);
    });
    if (set.size <= 0) return;
    [...set].sort().forEach((el) => {
      const filterOption = createElement('li', { classes: `${blockName}-option` });
      const inputId = `${attribute ? attribute.replace(' ', '_') : null}<&>${el ? el.replace(' ', '_') : null}`;
      const filterInput = createElement('input', {
        classes: `${blockName}-input`,
        props: {
          type: 'checkbox',
          'data-filter-title': attribute,
          value: el,
          id: inputId,
        },
      });
      const filterLabel = createElement('label', {
        classes: `${blockName}-label`,
        props: {
          for: inputId,
        },
      });
      filterLabel.textContent = el;
      filterOption.append(filterInput, filterLabel);
      filterOptionsWrapper.appendChild(filterOption);
    });
    titleWrapper.append(filterAttrib, plusBtn);
    filterItem.append(titleWrapper, filterOptionsWrapper);
    filterList.appendChild(filterItem);
  });

  filterList.onclick = (e) => {
    const elements = [`${blockName}-title-wrapper`, `${blockName}-title`, 'plus-btn'];
    if (elements.some((el) => e.target.classList.contains(el))) {
      const element = e.target.classList.contains(`${blockName}-title-wrapper`)
        ? e.target
        : e.target.parentElement;
      element.classList.toggle('active');
      element.nextElementSibling.classList.toggle('hidden');
    }
    if (e.target.classList.contains(`${blockName}-input`)) {
      /* enable/disable the Apply button
       * depending on if there is at least one checked input of the whole list */
      const parentFilterList = e.target.closest(`.${blockName}-list`);
      const filterInputs = parentFilterList.querySelectorAll(`.${blockName}-input`);
      const checkedInputs = [...filterInputs].filter((el) => el.checked);
      const isChecked = checkedInputs.length > 0;
      const targetBtnsWrapper = parentFilterList.previousElementSibling;
      targetBtnsWrapper.querySelector('.apply-filter-btn').disabled = !isChecked;
    }
  };

  filterForm.onsubmit = (e) => {
    e.preventDefault();
    const { submitter: { id } } = e;
    const isApply = id === 'apply-filter-btn';
    if (isApply) {
      const checkedInputs = [...filterList.querySelectorAll(`.${blockName}-input:checked`)];
      const filteredAttrib = [];
      filterForm.querySelector('.clear-filter-btn').disabled = false;
      // [{ title, values: [value1, value2, ...] }]
      checkedInputs.forEach((el) => {
        const title = el.dataset.filterTitle;
        const { value } = el;
        const obj = filteredAttrib.find((attrib) => attrib.title === title);
        if (obj) {
          obj.values.push(value);
        } else {
          filteredAttrib.push({ title, values: [value] });
        }
      });
      const filteredProducts = new Set();
      products.forEach((product) => {
        const isFiltered = filteredAttrib.every((attrib) => attrib
          .values.includes(product[attrib.title]));
        if (isFiltered) filteredProducts.add(product);
      });
      const event = new CustomEvent('FilteredProducts', { detail: { filteredProducts } });
      document.dispatchEvent(event);
    } else {
      filterForm.reset();
      filterForm.querySelector('.clear-filter-btn').disabled = true;
      filterForm.querySelector('.apply-filter-btn').disabled = true;
      const event = new CustomEvent('FilteredProducts', { detail: { filteredProducts: products } });
      document.dispatchEvent(event);
      // close active title filters
      const activeTitles = [...filterList.querySelectorAll(`.${blockName}-title-wrapper.active`)];
      activeTitles.forEach((el) => {
        el.classList.remove('active');
        el.nextElementSibling.classList.add('hidden');
      });
    }
  };

  buttonsWrapper.append(clearFilterBtn, applyFilterBtn);
  filterForm.append(buttonsWrapper, filterList);
  block.append(filterTitle, filterForm);
};

const isRenderedCheck = (block) => {
  if (filters && products && !isDecorated) {
    isDecorated = true;
    renderBlock(block);
  }
};

export default async function decorate(block) {
  isRenderedCheck(block);
  if (isDecorated) return;
  ['FilterAttribsLoaded', 'CategoryDataLoaded'].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      filters = JSON.parse(sessionStorage.getItem(`${blockName}-attribs`));
      products = window.categoryData;
      isRenderedCheck(block);
    });
  });
}
