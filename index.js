const puppeteer = require('puppeteer');

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

    const movies = [];

    for (const vodService of vodServices) {
        const url = vodService.url;
        await page.goto(url);
        await page.waitForSelector('.rankingType');

        const moviesOnService = await page.$$eval('.rankingType', elements => {
            return elements.map(element => {
                const titleElement = element.querySelector('.rankingType__title a');
                const title = titleElement ? titleElement.textContent.trim() : '';

                const ratingElement = element.querySelector('.rankingType__rate--value');
                const rating = ratingElement ? ratingElement.textContent.trim().replace(',', '.') : '';

                return { title, rating };
            });
        });

        movies.push(...moviesOnService.slice(0, 10).map(movie => ({ ...movie, vodService: vodService.name })));

    }

    await browser.close();
    return movies;
};

const deduplicateMovies = movies => {
    const deduplicatedMovies = {};

    movies.forEach(movie => {
        const { title, rating, vodService } = movie;
        const lowercaseTitle = title.toLowerCase();

        if (deduplicatedMovies[lowercaseTitle]) {
            if (rating > deduplicatedMovies[lowercaseTitle].rating) {
                deduplicatedMovies[lowercaseTitle].rating = rating;
                deduplicatedMovies[lowercaseTitle].vodService = vodService;
            }
        } else {
            deduplicatedMovies[lowercaseTitle] = { title, rating, vodService };
        }
    });

    return Object.values(deduplicatedMovies);
};

const sortMoviesByRating = movies => movies.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));