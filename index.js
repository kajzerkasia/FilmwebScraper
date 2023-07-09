const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const scrapeFilmweb = async (browser, vodService) => {
    const page = await browser.newPage();
    const url = vodService.url;

    await page.goto(url);
    await page.waitForSelector('.rankingType');

    const moviesOnService = await page.$$eval('.rankingType', elements => {
        return elements.slice(0, 10).map(element => {
            const titleElement = element.querySelector('.rankingType__title a');
            const title = titleElement ? titleElement.textContent.trim() : '';

            const ratingElement = element.querySelector('.rankingType__rate--value');
            const rating = ratingElement ? ratingElement.textContent.trim().replace('.', ',') : '';

            return {title, rating};
        });
    });

    await page.close();
    return moviesOnService.map(movie => ({...movie, vodService: vodService.name}));
};

const deduplicateMoviesAsync = async movies => {
    const deduplicatedMovies = {};

    movies.forEach(movie => {
        const {title, rating, vodService} = movie;
        const lowercaseTitle = title.toLowerCase();

        if (deduplicatedMovies[lowercaseTitle]) {
            if (rating > deduplicatedMovies[lowercaseTitle].rating) {
                deduplicatedMovies[lowercaseTitle].rating = rating;
                deduplicatedMovies[lowercaseTitle].vodService = vodService;
            }
        } else {
            deduplicatedMovies[lowercaseTitle] = {title, rating, vodService};
        }
    });

    return Object.values(deduplicatedMovies);
};

const sortMoviesByRating = movies => movies.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));

const scrapeAndSaveData = async () => {
    const browser = await puppeteer.launch({headless: 'new'});
    const currentYear = new Date().getFullYear();

    const vodServices = [
        {name: 'Netflix', url: `https://www.filmweb.pl/ranking/vod/netflix/film/${currentYear}`},
        {name: 'HBO Max', url: `https://www.filmweb.pl/ranking/vod/hbo_max/film/${currentYear}`},
        {name: 'Canal+', url: `https://www.filmweb.pl/ranking/vod/canal_plus/film/${currentYear}`},
        {name: 'Disney', url: `https://www.filmweb.pl/ranking/vod/disney/film/${currentYear}`}
    ];

    const scrapePromises = vodServices.map(vodService => scrapeFilmweb(browser, vodService));
    const moviesByService = await Promise.all(scrapePromises);
    const movies = moviesByService.flat();

    await browser.close();

    const deduplicatedMovies = await deduplicateMoviesAsync(movies);
    const sortedMovies = sortMoviesByRating(deduplicatedMovies);
    const topMovies = sortedMovies.slice(0, 40);

    const csvWriter = createCsvWriter({
        path: 'movies.csv',
        header: [
            {id: 'title', title: 'Title'},
            {id: 'vodService', title: 'VOD service name'},
            {id: 'rating', title: 'Rating'}
        ],
        fieldDelimiter: ';',
        recordDelimiter: '\n',
        encoding: 'utf8',
        append: false,
        alwaysQuote: true,
    });
    await csvWriter.writeRecords(topMovies);
};

scrapeAndSaveData()
    .then(() => {
        console.log('The data was saved to the movies.csv file.');
    })
    .catch((error) => {
        console.error('An error occurred when trying to save data to the movies.csv file.', error);
    });