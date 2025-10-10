import {
    createOptimizedPicture,
    buildBlock,
    decorateBlock,
    loadBlock,
  } from '../../scripts/aem.js';

  import ffetch from '../../scripts/ffetch.js';
  import {
    div,
    h3,
    a,
    p,
  } from '../../scripts/dom-helpers.js';
  import loadswiper from '../../scripts/delayed.js';
  import { applyFadeUpAnimation } from '../../scripts/utils.js';
  
  class News {
    // eslint-disable-next-line max-len
    constructor(newsTitle, newsCategory, newsImage, newsPath, newsDescription, newsDate, articleColor) {
      this.newsTitle = newsTitle;
      this.newsCategory = newsCategory;
      this.newsImage = newsImage;
      this.newsPath = newsPath;
      this.newsDescription = newsDescription;
      this.newsDate = newsDate;
      this.articleColor = articleColor;
    }
  }
  
  const blockType = 'cards';
  
  // Result parsers parse the query results into a format that can be used by the block builder for
  // the specific block types
  const resultParsers = {
    // Parse results into a cards block
    cards: (results) => {
      const blockContents = [];
  
      results.forEach((result) => {
        const cardContainer = div();
  
        // Apply color class based on article-color metadata
        if (result.articleColor === 'brown') {
          cardContainer.classList.add('color-brown');
        } else {
          cardContainer.classList.add('color-default');
        }
  
        // Create the wrapper anchor tag
        const cardLink = a({ href: result.newsPath });
  
        // Create image container
        const imageContainer = div({ class: 'image-container' });
  
        if (result.newsImage && result.newsImage.length > 0) {
          const cardImage = createOptimizedPicture(result.newsImage);
          cardImage.classList.add('lazy', 'slide_img');
          imageContainer.append(cardImage);
        }
  
        cardLink.append(imageContainer);
  
        // Create category/categories directly (no wrapper)
        if (result.newsCategory && result.newsCategory.length > 0) {
          // Split by comma, trim, and create a div for each category
          result.newsCategory.split(',').map((cat) => cat.trim()).forEach((cat) => {
            if (cat) {
              const categoryDiv = div({ class: 'listing-cat' });
              categoryDiv.textContent = cat;
              cardLink.append(categoryDiv);
            }
          });
        } else {
          // If no category, append an empty category div for consistency
          const categoryDiv = div({ class: 'listing-cat' });
          categoryDiv.textContent = '';
          cardLink.append(categoryDiv);
        }
  
        // Create date
        const date = div({ class: 'listing-date' });
        date.textContent = result.newsDate || '';
        // Add the date to the card link (separately from categories)
        cardLink.append(date);
  
        // Create title
        const title = h3();
        title.textContent = result.newsTitle || '';
        cardLink.append(title);
  
        // Create description
        const description = p();
        description.textContent = result.newsDescription || '';
        cardLink.append(description);
  
        cardContainer.append(cardLink);
        blockContents.push([cardContainer]);
      });
      return blockContents;
    },
  };
  
    async function getSliderdata() {
    let rawSlider = [];

    // Helper function to safely fetch with ffetch
    const safeFetch = async (path) => {
      try {
        const result = await ffetch(path)
          .chunks(1000)
          .all();
        return result;
      } catch (error) {
        return null;
      }
    };

    // Fetch data from the slider index
    const result = await safeFetch('/lorem-index.json');
    if (result && Array.isArray(result) && result.length > 0) {
      rawSlider = result;
    } else {
      rawSlider = []; // Ensure it's an empty array
    }
  
    // Sort slider by date in descending order (latest first)
    const sortedSlider = rawSlider.sort((sliderA, sliderB) => {
      // Parse date format "dd.mm.yyyy"
      const parseDate = (dateStr) => {
        if (!dateStr) return new Date(0);
        const [day, month, year] = dateStr.split('.');
        return new Date(year, month - 1, day);
      };

      const dateA = parseDate(sliderA.date);
      const dateB = parseDate(sliderB.date);

      return dateB - dateA; // Descending order (latest first)
    });
    return sortedSlider;
  }
  
  const loadresults = async (getSlider) => {
    const sliderResults = [];
    getSlider.forEach((sliderItem) => {
      // eslint-disable-next-line max-len
      const sliderResult = new News(sliderItem.title, sliderItem.category, sliderItem.image, sliderItem.path, sliderItem.description, sliderItem.date, sliderItem['article-color'] || sliderItem.articleColor);
      sliderResults.push(sliderResult);
    });
    return resultParsers[blockType](sliderResults);
  };
  
  export default async function decorate(block) {
    const sliderData = await getSliderdata();
    const blockContents = await loadresults(sliderData);
    const builtBlock = buildBlock(blockType, blockContents);
  
    // Keep parentDiv for decorateBlock to work properly
    const parentDiv = div(builtBlock);
  
    applyFadeUpAnimation(builtBlock, parentDiv);
  
    decorateBlock(builtBlock);
    await loadBlock(builtBlock);
  
    // Work with existing UL/LI structure for Swiper
    // Add Swiper classes to existing elements
    const cardsBlock = parentDiv.querySelector('.cards');
    if (cardsBlock) {
      cardsBlock.classList.add('swiper', 'slider-swiper');
    }
  
    // Find the ul and add swiper-wrapper class
    const ul = parentDiv.querySelector('ul');
    if (ul) {
      ul.classList.add('swiper-wrapper');
  
      // Add swiper-slide class to each li and apply color classes
      Array.from(ul.children).forEach((li) => {
        if (li.tagName === 'LI') {
          li.classList.add('swiper-slide');
  
          // Apply color class based on the div inside the li
          const colorBrownDiv = li.querySelector('.color-brown');
          const colorDefaultDiv = li.querySelector('.color-default');
  
          if (colorBrownDiv) {
            li.classList.add('color-brown');
          } else if (colorDefaultDiv) {
            li.classList.add('color-default');
          }
        }
      });
    }
  
    // Add navigation buttons to the cards block
    if (cardsBlock) {
      const prevButton = div({ class: 'swiper-button-prev' });
      const nextButton = div({ class: 'swiper-button-next' });
      cardsBlock.appendChild(prevButton);
      cardsBlock.appendChild(nextButton);
    }
  
    block.append(parentDiv);
  
    // Initialize Swiper
    loadswiper().then((Swiper) => {
      try {
        // Function to update slide opacity based on visibility
        const updateSlideOpacity = (swiperInstance) => {
          const { slides, activeIndex, params } = swiperInstance;
          const { slidesPerView } = params;
  
          // Calculate how many slides are currently visible
          let currentSlidesPerView = 1;
          if (typeof slidesPerView === 'number') {
            currentSlidesPerView = slidesPerView;
          } else if (swiperInstance.currentBreakpoint) {
            currentSlidesPerView = swiperInstance.passedParams.slidesPerView;
          }
  
          slides.forEach((slide, index) => {
            // A slide is considered visible if it's within the active range
            const isVisible = index >= activeIndex && index < activeIndex + currentSlidesPerView;
  
            if (isVisible) {
              slide.style.opacity = '1';
              slide.classList.add('swiper-slide-visible');
            } else {
              slide.style.opacity = '0.2';
              slide.classList.remove('swiper-slide-visible');
            }
          });
        };
  
        // eslint-disable-next-line no-unused-vars
        const swiper = new Swiper('.slider-swiper', {
          slidesPerView: 1,
          spaceBetween: 30,
          loop: false,
          navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
          },
          breakpoints: {
            600: { slidesPerView: 2 },
            900: { slidesPerView: 3 },
            1200: { slidesPerView: 4 },
          },
          on: {
            init() {
              updateSlideOpacity(this);
            },
            slideChange() {
              updateSlideOpacity(this);
            },
            breakpoint() {
              // Update opacity when breakpoint changes (screen resize)
              setTimeout(() => updateSlideOpacity(this), 100);
            },
          },
        });
      } catch {
        // Error creating Swiper instance
      }
    }).catch(() => {
      // Error loading Swiper from CDN
    });
  }
  