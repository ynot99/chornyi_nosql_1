/**
 * mongosh "ВАШ_URI" --file queries/part2_queries.js
 */

// Підключення до бази spotify
db = db.getSiblingDB("spotify");

// Завдання 1. Треки для вечірки

/**
 * Знайдіть треки, що підходять для вечірки.
 * Такі треки повинні мати високий danceability (вище 0.7) та високу енергію (також вище 0.7),
 * а тривалість — від 3 до 5 хвилин (180000–300000 мс).
 */

const partyTracks = db.tracks.find({
  "audio_features.danceability": { $gt: 0.7 },
  "audio_features.energy": { $gt: 0.7 },
  "audio_features.duration_sec": { $gt: 180, $lt: 300 },
});

// Завдання 2. Виконавці, у яких усі треки популярні

/**
 * Вважатимемо артиста популярним, якщо у нього є мінімум 3 треки і при цьому
 * мінімальна популярність цих треків становить 60% або вище.
 *
 * Знайдіть топ-20 таких артистів і виведіть для кожного ім’я артиста кількість треків,
 * мінімальну та середню популярність з точністю до одного знака після коми.
 */

const artistsWithPopularTracks = db.tracks.aggregate([
  {
    $unwind: "$artists",
  },
  {
    $group: {
      _id: "$artists",
      trackCount: { $sum: 1 },
      minPopularity: { $min: "$popularity" },
      avgPopularity: { $avg: "$popularity" },
    },
  },
  {
    $match: {
      trackCount: { $gte: 3 },
      minPopularity: { $gte: 60 },
    },
  },
  // Sort top artists by minPopularity and then by avgPopularity
  {
    $sort: {
      minPopularity: -1,
      avgPopularity: -1,
    },
  },
  // And then the best 20 artists
  {
    $limit: 20,
  },
  {
    $project: {
      _id: 0,
      artist: "$_id",
      trackCount: 1,
      minPopularity: { $round: ["$minPopularity", 1] },
      avgPopularity: { $round: ["$avgPopularity", 1] },
    },
  },
]);

// Завдання 3. Нетипові треки

/**
 * Визначте треки з незвично високим темпом для їхнього жанру за наступним алгоритмом:
 * спочатку розрахуйте середнє значення tempo за допомогою функції $avg та стандартне
 * відхилення за допомогою $stdDevPop по кожному жанру, потім виберіть треки, у яких tempo
 * перевищує середнє плюс два стандартні відхилення
 * (tempo треку > mean жанру + 2 * stdDev жанру).
 *
 * У результаті для кожного жанру додайте поля:
 * "avg_tempo" — середній темп,
 * "genre" — назва жанру,
 * "outlier_threshold" — значення порогу для нетипових треків,
 * і "outlier_tracks" — масив об’єктів з інформацією про треки, наприклад:
 * ```
    "avg_tempo": 119,
    "genre": "acoustic",
    "outlier_threshold": 178.5,
    "outlier_tracks": [
      {
        "_id": {"$oid": "69cf9875842453a5f5536f70"},
        "track_name": "The Legend of Olog-hai, Pt. 1",
        "popularity": 31,
        "artists": ["The Bridge City Sinners"],
        "audio_features": {
          "tempo": 182.379
        }
      }
    ]
    ```
 */

const highTempoTracks = db.tracks.aggregate([
  {
    // Групуємо треки за жанром
    $group: {
      _id: "$track_genre",
      avg_tempo: { $avg: "$audio_features.tempo" },
      stdDev_tempo: { $stdDevPop: "$audio_features.tempo" },
    },
  },
  {
    // Проектуємо, додаємо genre, avg_tempo, outlier_threshold (avg + 2 * stdDev)
    $project: {
      // Виключаємо id з результату
      _id: 0,
      genre: "$_id",
      avg_tempo: 1,
      outlier_threshold: {
        $add: ["$avg_tempo", { $multiply: [2, "$stdDev_tempo"] }],
      },
    },
  },
  {
    // Використовуємо $lookup для вибірки треків, які відповідають критеріям
    $lookup: {
      from: "tracks",
      // Необхідно створити змінні, бо напряму доступу до полів з попереднього етапу не має
      let: { genreVar: "$genre", thresholdVar: "$outlier_threshold" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$track_genre", "$$genreVar"] },
                { $gt: ["$audio_features.tempo", "$$thresholdVar"] },
              ],
            },
          },
        },
        {
          $project: {
            _id: 1,
            track_name: 1,
            popularity: 1,
            artists: 1,
            "audio_features.tempo": 1,
          },
        },
      ],
      as: "outlier_tracks",
    },
  },
]);

// Завдання 4: Треки для фонової роботи

/**
 * Знайдіть треки, які підходять для фонового прослуховування під час роботи:
 * тихі (loudness < -10), з низькою мовленнєвою складовою (speechiness < 0,1),
 * переважно інструментальні (instrumentalness > 0,5) і не містять explicit-контенту.
 */

const backgroundTracks = db.tracks.find({
  "audio_features.loudness": { $lt: -10 },
  "audio_features.speechiness": { $lt: 0.1 },
  "audio_features.instrumentalness": { $gt: 0.5 },
  "explicit": false
});
