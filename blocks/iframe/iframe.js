import { createElement, variantsClassesToBEM } from '../../scripts/common.js';

const blockName = 'iframe';
const variantClasses = ['fullscreen'];

const getFixedHeight = (block) => [...block.classList].find((cls) => /^[0-9]+px$/.test(cls));

const enableFullscreenMode = (block) => {
  const container = block.closest(`.${blockName}-container`);
  if (container) {
    container.classList.add(`${blockName}-container--fullscreen`);
  }
  document.body.classList.add(`${blockName}-fullscreen`);
};

export default async function decorate(block) {
  variantsClassesToBEM(block.classList, variantClasses, blockName);

  const isFullscreen = block.classList.contains(`${blockName}--fullscreen`);
  const src = block.querySelector('a')?.getAttribute('href') || '';

  const iframe = createElement('iframe', {
    props: {
      src,
      loading: 'lazy',
      frameborder: 0,
    },
  });

  const fixedHeight = getFixedHeight(block);
  if (fixedHeight && !isFullscreen) {
    iframe.height = fixedHeight;
  }

  if (isFullscreen) {
    enableFullscreenMode(block);
  }

  block.replaceChildren(iframe);
}
