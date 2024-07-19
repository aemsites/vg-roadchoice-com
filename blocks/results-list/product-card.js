import { getTextLabel, createElement } from '../../scripts/common.js';
import { createOptimizedPicture } from '../../scripts/lib-franklin.js';

const blockName = 'product-card';
const partNumberText = getTextLabel('part_number');

const getProperties = (prod, st) => {
  const cardContent = {};
  const maxChars = 48;
  const { Description } = prod;
  const cardName = {
    // TODO check for name, we don't have it now in the excel file
    cross: Description && Description.length > maxChars
      ? `${Description.substring(0, maxChars)} ...` : Description,
    parts: prod['Part Name'],
  };

  cardContent.imgUrl = prod.imgUrl;
  cardContent.name = cardName[st];
  cardContent.category = prod['Part Category'] || prod.Subcategory;
  cardContent.partNumber = prod['Base Part Number'];
  cardContent.hasImage = prod.hasImage;
  return cardContent;
};

const optimizePicture = (imgUrl) => createOptimizedPicture(
  imgUrl,
  'product image',
  false,
  [{ width: '200' }],
  true,
);

const productCard = (product, searchType) => {
  const object = getProperties(product, searchType);

  const {
    category,
    name,
    partNumber,
    hasImage,
    imgUrl,
  } = object;

  const item = createElement('li', { classes: blockName });

  const linkUrl = `/parts?category=${
    category.replace(/[^\w]/g, '-').toLowerCase()
  }&sku=${partNumber}`;
  const imageLink = createElement('a', { classes: 'image-link', props: { href: linkUrl } });

  const productImageUrl = imgUrl;
  const placeholderImageUrl = '/media/images/000-rc-placeholder-image.png';
  const imageUrl = hasImage ? productImageUrl : placeholderImageUrl;
  const placeholderPicture = optimizePicture(placeholderImageUrl);
  const picture = optimizePicture(imageUrl);
  picture.classList.add('image');
  placeholderPicture.classList.add('image', 'hidden');
  picture.querySelector('img').setAttribute('onerror', `
    this.parentElement.classList.add("hidden");
    this.parentElement.previousElementSibling.classList.remove("hidden");
    `);
  imageLink.append(placeholderPicture, picture);

  const titleLink = createElement('a', { classes: 'title-link', props: { href: linkUrl } });
  const title = createElement('h6', { classes: 'title' });
  title.textContent = name;
  titleLink.appendChild(title);

  const partLabel = createElement('span', { classes: 'part-number' });
  const text = createElement('p', { classes: 'part-label' });
  text.textContent = `${partNumberText}:`;
  const number = createElement('a', { classes: 'part-link', props: { href: linkUrl } });
  number.textContent = partNumber;
  partLabel.append(text, number);

  item.append(imageLink, titleLink, partLabel);

  return item;
};

export default productCard;
