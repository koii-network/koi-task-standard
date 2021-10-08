const cheerio = require("cheerio");

const parseAndSaveAllSelctor = async ($, selector, contentType) => {
  let totalContent = [];
  $(selector).each((index, element) => {
    if (index < 500) {
      // add limitation 500 nodes
      let content = "";
      if (selector === "img") {
        content = $(element).attr("src");
      } else if (selector === "a") {
        content = $(element).attr("href");
      } else {
        content = $(element).text().trim();
      }
      let ids = $(element).attr("id");
      let classNames = $(element).attr("class");
      let subSelectorsArr = [];
      let subSelector = "";
      try {
        while ($(element)[0] && $(element)[0].name && !ids && !classNames) {
          subSelectorsArr.push($(element)[0].name);
          element = $(element).parent();
          ids = $(element).attr("id");
          classNames = $(element).attr("class");
        }
      } catch (e) {
        console.log(e);
        return;
      }
      for (let i = subSelectorsArr.length - 1; i >= 0; i--) {
        subSelector += `>${subSelectorsArr[i]}`;
      }
    }
  });
  return totalContent;
};

const getPayload = async (html) => {

}
export { 
  parseAndSaveAllSelctor,
  getPayload
};
