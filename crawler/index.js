const { crawlOliveBestList } = require('./sites/oliveyoung/oliveyoung_link.crawler');

(async () => {
  const data = await crawlOliveBestList();
  console.log(data);
})();