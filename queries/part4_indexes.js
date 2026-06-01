/**
 * mongosh "ВАШ_URI" --file queries/part4_indexes.js
 */

// Підключення до бази spotify
db = db.getSiblingDB("spotify");

// Завдання 1. Аналіз запиту та індексація

/**
 * Нехай дано наступний запит:
 * db.tracks.find({
 *  track_genre: "pop",
 *  "audio_features.danceability": { $gte: 0.7 }
 * }).sort({ popularity: -1 }).toArray();
 *
 * Це ресурсоємний запит, оскільки він поєднує пошук за точним збігом та діапазонний пошук.
 *
 * Виконайте наступні кроки:
 * - За допомогою explain() проаналізуйте план виконання запиту без індексів.
 * - Створіть відповідний індекс.
 * - Повторно виконайте explain() після створення індексу.
 * - Усі написані скрипти помістіть у файл part4_indexes.js.
 */

// Видаляємо індекс перед стартом, щоб забезпечити чистий COLLSCAN для першого тесту
const task1Index = {
  track_genre: 1, // E (Equality)
  popularity: -1, // S (Sort)
  "audio_features.danceability": 1, // R (Range)
};
try {
  db.tracks.dropIndex(task1Index);
} catch (e) {
  // Ігноруємо помилку, якщо індексу ще не існує
}

function explainQuery(query) {
  const explainRes = query.explain("executionStats");

  console.log({
    totalDocsExamined: explainRes.executionStats.totalDocsExamined,
    totalKeysExamined: explainRes.executionStats.totalKeysExamined,
    executionTimeMillis: explainRes.executionStats.executionTimeMillis,
  });
}

const task1Query = db.tracks.find({
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 },
}).sort({ popularity: -1 });

explainQuery(task1Query);

db.tracks.createIndex(task1Index);

const task1QueryWithIndex = db.tracks.find({
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 },
}).sort({ popularity: -1 });

explainQuery(task1QueryWithIndex)

// Підчищення індекса перед наступним завданням
try {
  db.tracks.dropIndex(task1Index);
} catch (e) {
  // Ігноруємо помилку, якщо індексу ще не існує
}

// Завдання 2. Індекс для інших полів

/**
 * Припустимо, що ви часто шукаєте музику для роботи, використовуючи поля
 * audio_features.instrumentalness, audio_features.speechiness та explicit.
 * Щоб такі запити виконувалися ефективно, створіть складений індекс за цими полями
 * та за допомогою explain() покажіть, що він використовується при виконанні пошуку.
 */

db.tracks.createIndex({
  explicit: 1, // E (Equality)
  "audio_features.instrumentalness": 1, // R (Range)
  "audio_features.speechiness": 1, // R (Range)
});

const task2Query = db.tracks.find({
  "audio_features.instrumentalness": { $gte: 0.5 },
  "audio_features.speechiness": { $lt: 0.1 },
  explicit: false,
});

explainQuery(task2Query);
