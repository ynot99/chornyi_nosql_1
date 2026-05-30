/**
 * mongosh "ВАШ_URI" --file queries/part3_aggregations.js
 */

// Підключення до бази spotify
db = db.getSiblingDB("spotify");

// Завдання 1. Топ-10 виконавців за середньою популярністю

/**
 * Знайдіть виконавців, у яких є хоча б 5 треків.
 * Для кожного виконавця порахуйте середню популярність його треків.
 * Потім відсортуйте за спаданням та виберіть топ-10 виконавців.
 * Вивід повинен включати ім’я виконавця та його середню популярність.
 */

const top10 = db.tracks.aggregate([
  {
    $unwind: "$artists"
  },
  {
    $group: {
      _id: "$artists",
      trackCount: { $sum: 1 },
      avg_popularity: { $avg: "$popularity" }
    }
  },
  {
    $match: {
      trackCount: { $gte: 5 }
    }
  },
  {
    $sort: {
      // Спочатку за популярністю, потім за кількістю
      avg_popularity: -1,
      trackCount: -1,
    }
  },
  { $limit: 10 },
  {
    $project: {
      _id: 0,
      artist: "$_id",
      avg_popularity: {
        $round: ["$avg_popularity", 2]
      }
    }
  }
]);

console.log(top10.toArray());

// Завдання 2. Розподіл треків за настроєм

/**
 * Кожному треку присвойте настрій на основі двох полів: valence (позитивність) та energy:
 * - високий valence + висока energy → happy
 * - низький valence + висока energy → angry
 * - високий valence + низька energy → calm
 * - низький valence + низька energy → sad
 *
 * Порахуйте, скільки треків потрапило до кожної категорії, та виведіть таблицю з настроєм і кількістю треків.
 */

const mood = db.tracks.aggregate([
  {
    $project: {
      mood: {
        $switch: {
          branches: [
            {
              case: {
                $and: [
                  { $gte: ["$audio_features.valence", 0.5] },
                  { $gte: ["$audio_features.energy", 0.5] },
                ]
              },
              then: "happy",
            },
            {
              case: {
                $and: [
                  { $lt: ["$audio_features.valence", 0.5] },
                  { $gte: ["$audio_features.energy", 0.5] },
                ]
              },
              then: "angry",
            },
            {
              case: {
                $and: [
                  { $gte: ["$audio_features.valence", 0.5] },
                  { $lt: ["$audio_features.energy", 0.5] },
                ]
              },
              then: "calm",
            },
            {
              case: {
                $and: [
                  { $lt: ["$audio_features.valence", 0.5] },
                  { $lt: ["$audio_features.energy", 0.5] },
                ]
              },
              then: "sad",
            },
          ],
          default: "unknown",
        }
      }
    }
  },
  {
    $group: {
      _id: "$mood",
      count: { $sum: 1 }
    }
  }
]);

console.log(mood.toArray());

// Завдання 3. Найбільш «танцювальний» жанр

/**
 * Визначте, який музичний жанр найкраще підходить для танців.
 * Для цього згрупуйте треки за жанрами та обчисліть середні значення танцювальності (danceability),
 * енергії (energy) та позитивності (valence).
 *
 * Відфільтруйте жанри, в яких налічується менше 100 треків,
 * щоб забезпечити статистичну надійність. У результаті виведіть:
 * - назву жанру
 * - середню танцювальність (avg_danceability)
 * - середню енергію (avg_energy)
 * - середню позитивність (avg_valence)
 * - кількість треків у жанрі
 */

const danceabilityTracks = db.tracks.aggregate([
  {
    $group: {
      _id: "$track_genre",
      count: { $sum: 1 },
      avg_danceability: { $avg: "$audio_features.danceability" },
      avg_energy: { $avg: "$audio_features.energy" },
      avg_valence: { $avg: "$audio_features.valence" },
    }
  },
  {
    $match: {
      // Завдання каже "Відфільтруйте жанри, в яких налічується менше 100 треків",
      // але на поточній базі на кожен жанр існує рівно 1000 треків, та $lt дасть 0 результатів
      count: { $gte: 100 }
    }
  },
  {
    $project: {
      _id: 0,
      track_genre: "$_id",
      avg_danceability: { $round: ["$avg_danceability", 2] },
      avg_energy: { $round: ["$avg_energy", 2] },
      avg_valence: { $round: ["$avg_valence", 2] },
      count: 1,
    }
  },
  // Не по завданню, але потрібно, щоб не перевантажувати вивід
  {
    $limit: 5
  }
]);

console.log(danceabilityTracks.toArray());
