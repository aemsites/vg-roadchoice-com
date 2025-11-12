import { createElement, getTextLabel, getLocale } from '../../scripts/common.js';
import { getMetadata } from '../../scripts/aem.js';
import { fetchArticlesAndFacets } from '../search/graphql-api.js';
import { getLimitFromBlock, clearCurrentArticle } from '../../scripts/services/blog.service.js';

const blockName = 'recommendations';
const category = getMetadata('category') || null;
const title = getTextLabel('recommendations_title');
const linkText = getTextLabel('read_more');

const [homeTitle, recommendationsTitle] = title.split('[/]');
const isBlogArticle = document.querySelector('.blog-article');

export const getLimit = (block) => {
  const classes = block.classList;
  let limit;
  classes.forEach((e) => {
    const [name, value] = e.split('-');
    if (name === 'limit') limit = value;
  });
  return limit;
};

export const clearRepeatedArticles = (articles) =>
  articles.filter((e) => {
    const currentArticlePath = window.location.href.split('/').pop();
    const path = e.path.split('/').pop();
    if (path !== currentArticlePath) return e;
    return null;
  });

const formatDate = (date) => {
  const convertedDate = new Date(parseInt(date, 10) * 1000);

  return convertedDate.toLocaleDateString(getLocale(), {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
};

export default async function decorate(block) {
  const queryParams = {
    sort: 'PUBLISH_DATE_DESC',
    limit: getLimitFromBlock(block) + (isBlogArticle ? 1 : 0),
    category,
  };

  const { articles } = await fetchArticlesAndFacets(queryParams);
  const filteredArticles = clearCurrentArticle(articles);
  const recommendationsContent = createElement('div', { classes: `${blockName}-content` });
  const titleSection = createElement('div', { classes: ['title-section'] });

  const titleElement = createElement('h3', { classes: ['title'] });
  titleElement.innerText = isBlogArticle ? recommendationsTitle : homeTitle;

  if (isBlogArticle) {
    titleSection.appendChild(titleElement);
  } else {
    const link = createElement('a', { classes: ['link'] });
    link.append(titleElement);
    titleSection.appendChild(link);
  }

  const recommendationsList = createElement('ul', { classes: `${blockName}-list` });

  filteredArticles.forEach((art) => {
    const article = createElement('li', { classes: ['article'] });
    const articleTitle = createElement('h2', { classes: ['article-title'] });
    const articleTitleLink = createElement('a', { classes: ['article-title-link'], props: { href: art.url } });
    articleTitleLink.innerText = art.title;

    articleTitle.appendChild(articleTitleLink);

    const articleDate = createElement('p', { classes: ['article-date'] });
    articleDate.innerText = formatDate(art.publishDate);

    const articleText = createElement('p', { classes: ['article-text'] });
    articleText.innerText = art.description;

    const strongLink = createElement('strong');
    const articleLink = createElement('a', { classes: ['article-link'], props: { href: art.url } });
    articleLink.innerText = linkText;
    strongLink.appendChild(articleLink);

    article.append(articleTitle, isBlogArticle ? articleDate : '', articleText, strongLink);

    recommendationsList.appendChild(article);
  });
  recommendationsContent.append(titleSection, recommendationsList);

  block.textContent = '';
  if (articles.length && filteredArticles.length) {
    block.appendChild(recommendationsContent);
  }
}
