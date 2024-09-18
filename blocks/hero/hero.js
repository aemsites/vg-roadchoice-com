import {
  getImageURLs,
  createResponsivePicture,
  variantsClassesToBEM,
} from '../../scripts/common.js';
import {
  isVideoLink,
  createVideo,
} from '../../scripts/video-helper.js';

const variantClasses = ['text-left', 'text-right', 'text-black'];
const blockName = 'hero';

export default async function decorate(block) {
  variantsClassesToBEM(block.classList, variantClasses, blockName);

  const images = [...block.querySelectorAll('p > picture')];
  const imageURLs = getImageURLs(images);
  const imageData = imageURLs.map((src) => ({ src, breakpoints: [] }));

  const link = block.querySelector('a');
  const isVideo = link ? isVideoLink(link) : false;
  if (isVideo) {
    createVideo(block, link.getAttribute('href'), `${blockName}__video`, {
      muted: true,
      autoplay: true,
      loop: true,
      playsinline: true,
    });
    link.remove();
  }

  if (imageData.length === 1) {
    imageData[0].breakpoints = [
      { media: '(min-width: 600px)', width: 600 },
      { media: '(min-width: 1200px)', width: 1200 },
      { media: '(min-width: 1440px)', width: 1440 },
      { media: '(min-width: 1920px)', width: 1920 },
      { width: 750 },
    ];
  }

  if (imageData.length > 1) {
    imageData[0].breakpoints = [
      { media: '(min-width: 600px)', width: 600 },
      { width: 750 },
    ];

    imageData[1].breakpoints = [
      { media: '(min-width: 1200px)', width: 1200 },
      { media: '(min-width: 1440px)', width: 1440 },
      { media: '(min-width: 1920px)', width: 1920 },
    ];
  }

  const altText = [...block.querySelectorAll('p > picture img.alt')];
  const newPicture = createResponsivePicture(imageData, true, altText, `${blockName}__image`);
  images.forEach((image) => image.parentNode.remove());

  if (images.length !== 0) {
    block.prepend(newPicture);
  } else if (!isVideo) {
    block.classList.add(`${blockName}--no-image`);
  }

  const contentWrapper = block.querySelector(':scope > div');
  contentWrapper.classList.add(`${blockName}__content-wrapper`);

  const content = block.querySelector(':scope > div > div');
  content.classList.add(`${blockName}__content`);

  const h1 = content.querySelector('h1');
  h1.classList.add(`${blockName}__heading`);
  const nextEl = h1.nextElementSibling;
  if (nextEl && !nextEl.querySelector('a')) nextEl.classList.add(`${blockName}__subtitle`);

  const button = content.querySelector('a');
  const allTexts = content.querySelectorAll('p');

  if (!button && (allTexts.length > 0)) {
    content.classList.add('with-text');
    allTexts.forEach((p) => p.classList.add(`${blockName}__text`));
  }

  const ctaButtons = content.querySelectorAll('.button-container > a');
  [...ctaButtons].forEach((b) => {
    b.parentElement.classList.add(`${blockName}__cta-wrapper`);
  });

  block.parentElement.classList.add('full-width');
}
