import puppeteer from "puppeteer";

const scrapeFilmweb = async () => {

    const browser = await puppeteer.launch({headless: 'new'});
    const page = await browser.newPage();

    const currentYear = new Date().getFullYear();

    const vodServices = [
        {name: 'Netflix', url: `https://www.filmweb.pl/ranking/vod/netflix/film/${currentYear}`},
        {name: 'HBO Max', url: `https://www.filmweb.pl/ranking/vod/hbo_max/film/${currentYear}`},
        {name: 'Canal+', url: `https://www.filmweb.pl/ranking/vod/canal_plus/film/${currentYear}`},
        {name: 'Disney', url: `https://www.filmweb.pl/ranking/vod/disney/film/${currentYear}`}
    ];

    for (const vodService of vodServices) {
        const url = vodService.url;
        await page.goto(url);
        await page.waitForSelector('.rankingType');

    };
};
