import { createElement } from '../../scripts/common.js';

const blockName = 'carousel';
const ACTIVE_SLIDE_CLASS = `${blockName}-slide-active`;
const ACTIVE_CONTROL_STEP_CLASS = `${blockName}-controls-pagination-step-active`;
const SLIDE_CHANGE_TIME = 6000;

const buildSlide = (slideTemplate) => {
  const slideEl = createElement('li', { classes: `${blockName}-slide` });
  slideEl.innerHTML = slideTemplate.innerHTML;
  slideEl.children[0].classList.add(`${blockName}-slide-content-wrapper`);

  const backgroundImg = slideEl.querySelector('picture');

  // unwrap the picture tag to be direct child of the slide
  if (backgroundImg && backgroundImg.parentElement.tagName === 'P') {
    backgroundImg.parentElement.replaceWith(backgroundImg);
    backgroundImg.classList.add(`${blockName}-slide-background`);
  }

  // moving background image as the first child of the slide
  if (backgroundImg) {
    backgroundImg.closest(`.${blockName}-slide`).prepend(backgroundImg);
  }

  const heading = slideEl.querySelector('h2, h3, h4, h5, h6');

  if (heading) {
    heading.classList.add(`${blockName}-heading`);
  }

  slideTemplate.replaceWith(slideEl);
};

const renderSlidesControls = (carouselEl, onSelect) => {
  const slidesCount = carouselEl.querySelectorAll(`.${blockName}-slide`).length;
  const slidesCountrolsEl = createElement('div', { classes: `${blockName}-controls` });

  const slidesControls = Array(slidesCount).fill(0);
  slidesControls.forEach((_el, index) => {
    const paginationStep = createElement('div', { classes: `${blockName}-controls-pagination-step` });
    paginationStep.addEventListener('click', () => {
      onSelect(index);
    });
    slidesCountrolsEl.append(paginationStep);
  });

  carouselEl.append(slidesCountrolsEl);
};

const renderArrows = (carouseEl, onSelect, carouselState) => {
  const arrowsControl = `
    <button class="${blockName}-arrows-left" aria-label="slide left"></button>
    <button class="${blockName}-arrows-right" aria-label="slide right"></button>
  `;

  const arrowsControlEl = createElement('div', { classes: `${blockName}-arrows-controls` });
  arrowsControlEl.innerHTML = arrowsControl;

  const leftArrow = arrowsControlEl.querySelector(`.${blockName}-arrows-left`);
  const rightArrow = arrowsControlEl.querySelector(`.${blockName}-arrows-right`);

  leftArrow.addEventListener('click', () => {
    const activeIndex = carouselState.activeSlideIndex;
    onSelect(activeIndex ? activeIndex - 1 : carouselState.slideNumber - 1);
  });

  rightArrow.addEventListener('click', () => {
    const activeIndex = carouselState.activeSlideIndex;
    onSelect(activeIndex < carouselState.slideNumber - 1 ? activeIndex + 1 : 0);
  });

  carouseEl.append(arrowsControlEl);
};

const autoSlideChange = (carouseEl, onChange, carouselState) => {
  let intervalId;

  const runAutoChange = () => {
    intervalId = setInterval(() => {
      const { activeSlideIndex, slideNumber } = carouselState;

      onChange(activeSlideIndex < slideNumber - 1 ? activeSlideIndex + 1 : 0);
    }, SLIDE_CHANGE_TIME);
  };

  carouseEl.addEventListener('mouseover', () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  carouseEl.addEventListener('mouseout', () => {
    runAutoChange();
  });

  runAutoChange();
};

const onScroll = (carousel, onChange, carouselState) => {
  const list = carousel.querySelector(`ul.${blockName}-slide-list`);
  let pauseTimeout = null;

  const disableScrollingForTime = (el, time = 50) => {
    const prevStyle = el.style.overflow;

    el.style.overflow = 'hidden';

    pauseTimeout = setTimeout(() => {
      el.style.overflow = prevStyle;
      pauseTimeout = null;
    }, time);
  };

  list.addEventListener('scroll', () => {
    const { activeSlideIndex, slideNumber } = carouselState;

    if (pauseTimeout) {
      return;
    }

    const listWidth = list.getBoundingClientRect().width;
    const actualItemStartPosition = listWidth * activeSlideIndex;

    if (actualItemStartPosition < list.scrollLeft) {
      const newIndex = activeSlideIndex < slideNumber - 1 ? activeSlideIndex + 1 : 0;

      if (activeSlideIndex !== newIndex) {
        onChange(newIndex);
      }

      disableScrollingForTime(list);

      return;
    }

    if (actualItemStartPosition > list.scrollLeft) {
      const newIndex = activeSlideIndex ? activeSlideIndex - 1 : slideNumber - 1;

      if (activeSlideIndex !== newIndex) {
        onChange(newIndex);
      }

      disableScrollingForTime(list);
    }
  });
};

export default function decorate(block) {
  const carouselEl = createElement('ul', { classes: `${blockName}-slide-list` });
  carouselEl.innerHTML = block.innerHTML;
  block.innerHTML = '';
  block.append(carouselEl);

  const slides = block.querySelectorAll(':scope > ul > div');
  [...slides].forEach(buildSlide);

  const carouselState = {
    activeSlideIndex: 0,
    slideNumber: [...slides].length,
    locked: false,
  };

  const setActiveSlideIndex = (newIndex) => {
    const slidesList = block.querySelectorAll(`.${blockName}-slide`);
    const paginationSteps = [...block.querySelectorAll(`.${blockName}-controls-pagination-step`)];

    [...slidesList].forEach((slide, index) => {
      const action = index === newIndex ? 'add' : 'remove';
      slide.classList[action](ACTIVE_SLIDE_CLASS);

      if (paginationSteps.length) {
        paginationSteps[index].classList[action](ACTIVE_CONTROL_STEP_CLASS);
      }
    });

    const ul = block.querySelector(`ul.${blockName}-slide-list`);
    const left = ul.getBoundingClientRect().width * newIndex;

    ul.scrollTo({ top: 0, left, behavior: 'instant' });

    carouselState.activeSlideIndex = newIndex;
  };

  window.addEventListener('resize', () => {
    const ul = block.querySelector(`ul.${blockName}-slide-list`);
    const left = ul.getBoundingClientRect().width * carouselState.activeSlideIndex;

    ul.scrollTo({ top: 0, left, behavior: 'instant' });
  });

  if (carouselState.slideNumber > 1) {
    renderArrows(block, setActiveSlideIndex, carouselState);
  }
  if (carouselState.slideNumber > 1) {
    renderSlidesControls(block, setActiveSlideIndex);
  }
  setActiveSlideIndex(0);
  if (carouselState.slideNumber > 1) {
    autoSlideChange(block, setActiveSlideIndex, carouselState);
  }
  onScroll(block, setActiveSlideIndex, carouselState);
}
