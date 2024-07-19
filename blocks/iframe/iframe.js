/* eslint-disable no-use-before-define */
import { createElement } from '../../scripts/common.js';

export default async function decorate(block) {
  const link = block.querySelector('a')?.getAttribute('href');
  const iframe = createElement('iframe', { props: { src: link, loading: 'lazy', frameborder: 0 } });
  const fixedHeightClass = [...block.classList].find((el) => /[0-9]+px/.test(el));
  if (fixedHeightClass) {
    iframe.height = fixedHeightClass;
  }

  block.replaceChildren(iframe);
}
