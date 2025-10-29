import { getTextLabel, createElement, getLocaleContextedUrl } from '../../scripts/common.js';
import { createOptimizedPicture } from '../../scripts/aem.js';

const blockName = 'product-card';
const partNumberText = getTextLabel('part_number');

const getProperties = (prod, st) => {
  console.log(prod);
  const cardContent = {};
  const maxChars = 48;
  const { path, part_name, image_url, imgUrl, Description } = prod;
  const name = part_name ? part_name[0] : Description;
  const cardName = {
    cross: name && name.length > maxChars ? `${name.substring(0, maxChars)}...` : name,
    parts: name || prod['Part Name'],
  };

  cardContent.imgUrl = image_url ? image_url[0] : imgUrl || '';
  cardContent.name = cardName[st];
  cardContent.category = prod['part_category'] ? prod['part_category'][0] : prod['Part Category'] || prod.Subcategory;
  cardContent.partNumber = prod['base_part_number'] || prod['Base Part Number'];
  cardContent.hasImage = cardContent.imgUrl?.length > 0 || prod.hasImage;
  cardContent.path = path || '';
  return cardContent;
};

const optimizePicture = (imgUrl) => createOptimizedPicture(imgUrl, 'product image', false, [{ width: '200' }], true);

const productCard = (product, searchType) => {
  const object = getProperties(product, searchType);

  const { category, name, partNumber, hasImage, imgUrl } = object;

  const item = createElement('li', { classes: blockName });
  const safeCategory = category.replace(/[^\w]/g, '-').toLowerCase();
  const safePartNumber = encodeURIComponent(partNumber);
  const linkUrl = getLocaleContextedUrl(`/parts/${safeCategory}/${safePartNumber}/`);

  const imageLink = createElement('a', { classes: 'image-link', props: { href: linkUrl } });

  const productImageUrl = imgUrl;
  const placeholderImageUrl = getLocaleContextedUrl('/media/images/000-rc-placeholder-image.png');
  const imageUrl = hasImage ? productImageUrl : placeholderImageUrl;
  const placeholderPicture = optimizePicture(placeholderImageUrl);
  const picture = optimizePicture(imageUrl);
  picture.classList.add('image');
  placeholderPicture.classList.add('image', 'hidden');
  picture.querySelector('img').setAttribute(
    'onerror',
    `
    this.parentElement.classList.add("hidden");
    this.parentElement.previousElementSibling.classList.remove("hidden");
    `,
  );
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
