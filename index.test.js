const puppeteer = require("puppeteer");
const fs = require("fs");

const {
  scrapeFilmweb,
  deduplicateMoviesAsync,
  sortMoviesByRating,
  scrapeAndSaveData,
} = require("./index");

const vodServicesData = [
  {
    name: "Canal+",
    url: "https://www.filmweb.pl/ranking/vod/canal_plus/film/2023",
    expectedVodService: "Canal+",
  },
  {
    name: "Netflix",
    url: "https://www.filmweb.pl/ranking/vod/netflix/film/2023",
    expectedVodService: "Netflix",
  },
  {
    name: "HBO Max",
    url: "https://www.filmweb.pl/ranking/vod/hbo_max/film/2023",
    expectedVodService: "HBO Max",
  },
  {
    name: "Disney",
    url: "https://www.filmweb.pl/ranking/vod/disney/film/2023",
    expectedVodService: "Disney",
  },
];

describe("scrapeFilmweb", () => {
  let browser;

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: "new" });
  });

  afterAll(async () => {
    await browser.close();
  });

  vodServicesData.forEach((vodServiceData) => {
    const { name, url, expectedVodService } = vodServiceData;

    test(`should scrape ${name} movies from Filmweb from 2023`, async () => {
      const vodService = { name, url };
      const movies = await scrapeFilmweb(browser, vodService);

      expect(movies.length).toBeLessThanOrEqual(10);
      expect(movies[0]).toHaveProperty("title");
      expect(movies[0]).toHaveProperty("rating");
      expect(movies[0]).toHaveProperty("vodService", expectedVodService);
    });
  });
});

describe("deduplicateMoviesAsync", () => {
  it("should deduplicate movies based on title and higher rating", async () => {
    const movies = [
      { title: "Movie 1", rating: "8.5", vodService: "Netflix" },
      { title: "Movie 2", rating: "7.9", vodService: "Netflix" },
      { title: "Movie 1", rating: "9.0", vodService: "HBO Max" },
    ];

    const deduplicatedMovies = await deduplicateMoviesAsync(movies);

    expect(deduplicatedMovies).toHaveLength(2);
    expect(deduplicatedMovies[0]).toEqual({
      title: "Movie 1",
      rating: "9.0",
      vodService: "HBO Max",
    });
    expect(deduplicatedMovies[1]).toEqual({
      title: "Movie 2",
      rating: "7.9",
      vodService: "Netflix",
    });
  });

  it("should keep single movie if there are no duplicates", async () => {
    const movies = [
      { title: "Movie 1", rating: "8.5", vodService: "Netflix" },
      { title: "Movie 2", rating: "7.9", vodService: "Netflix" },
      { title: "Movie 3", rating: "9.0", vodService: "HBO Max" },
    ];

    const deduplicatedMovies = await deduplicateMoviesAsync(movies);

    expect(deduplicatedMovies).toHaveLength(3);
    expect(deduplicatedMovies[0]).toEqual({
      title: "Movie 1",
      rating: "8.5",
      vodService: "Netflix",
    });
    expect(deduplicatedMovies[1]).toEqual({
      title: "Movie 2",
      rating: "7.9",
      vodService: "Netflix",
    });
    expect(deduplicatedMovies[2]).toEqual({
      title: "Movie 3",
      rating: "9.0",
      vodService: "HBO Max",
    });
  });
});

describe("sortMoviesByRating", () => {
  it("should sort movies by rating in descending order", () => {
    const movies = [
      { title: "Movie 1", rating: "8.5", vodService: "Netflix" },
      { title: "Movie 2", rating: "7.9", vodService: "Netflix" },
      { title: "Movie 3", rating: "9.0", vodService: "HBO Max" },
    ];

    const sortedMovies = sortMoviesByRating(movies);

    expect(sortedMovies).toHaveLength(3);
    expect(sortedMovies[0]).toEqual({
      title: "Movie 3",
      rating: "9.0",
      vodService: "HBO Max",
    });
    expect(sortedMovies[1]).toEqual({
      title: "Movie 1",
      rating: "8.5",
      vodService: "Netflix",
    });
    expect(sortedMovies[2]).toEqual({
      title: "Movie 2",
      rating: "7.9",
      vodService: "Netflix",
    });
  });
});

describe("scrapeAndSaveData", () => {
  beforeEach(() => {
    if (fs.existsSync("movies.csv")) {
      fs.unlinkSync("movies.csv");
    }
  });

  it("should scrape movies and save data to CSV", async () => {
    await scrapeAndSaveData();

    const csvData = fs.readFileSync("movies.csv", "utf8");
    const lines = csvData.trim().split("\n");

    expect(lines[0]).toBe('"Title";"VOD service name";"Rating"');

    expect(lines.length).toBeGreaterThan(1);

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const fields = line.split(";");
      expect(fields.length).toBe(3);
    }
  });

  it("should complete without errors", async () => {
    await expect(scrapeAndSaveData()).resolves.not.toThrow();
  });
});
