/**
 * mongosh "ВАШ_URI" --file scripts/02_transform.js
 */

// 1. Створити нову колекцію tracks
// - Використовуйте базу spotify.
db = db.getSiblingDB("spotify");

// - Перед трансформацією видаліть стару колекцію tracks, якщо вона існує.
const collectionName = "tracks";
db.getCollection(collectionName).drop();
db.createCollection(collectionName);

// 2. Проєкція полів
// - Залиште лише потрібні поля для аналізу: track_id, track_name, album_name, explicit, popularity, duration_ms, track_genre та рядок із артистами (artists_raw).
const aggregatedDocs = db.tracks_raw.aggregate([
  {
    $project: {
      track_id: 1,
      track_name: 1,
      album_name: 1,
      explicit: 1,
      popularity: 1,
      duration_ms: 1,
      track_genre: 1,
      artists_raw: 1,

      // Формуємо audio_features заздалегідь для 4го пункту
      audio_features: {
        danceability: "$danceability",
        energy: "$energy",
        loudness: "$loudness",
        speechiness: "$speechiness",
        acousticness: "$acousticness",
        instrumentalness: "$instrumentalness",
        liveness: "$liveness",
        valence: "$valence",
        tempo: "$tempo",
        key: "$key",
        mode: "$mode",
        time_signature: "$time_signature",
        duration_ms: "$duration_ms",
        popularity: "$popularity",
        // duration_sec: "$duration_ms",
        // popularity_tier: "$popularity",
      },
    },
  },
  // MYTODO limit is temporary for testing, remove it later
  { $limit: 5 },
]);

// 3. Перетворення артистів
// - Розбийте рядок артистів по ; та приберіть пробіли навколо кожного імені.
// - Збережіть результат у полі artists як масив.
const artistsDocs = aggregatedDocs.map((doc) => {
  const artistsArray = doc.artists.split(";").map((artist) => artist.trim());
  return { ...doc, artists: artistsArray };
});

// 4. Формування аудіо-характеристик та обчислюваних полів
// - Створіть вкладений об’єкт audio_features, що включає всі аудіофічі: danceability, energy, loudness, speechiness, acousticness, instrumentalness, liveness, valence, tempo, key, mode, time_signature.
// - Додайте поле duration_sec — тривалість треку в секундах (округлена до одного знака).
// - Додайте поле popularity_tier:
// high — популярність ≥ 70, medium — популярність ≥ 40 і < 70, low — популярність < 40
const audioFeaturesDocs = artistsDocs.map((doc) => {
  const af = doc.audio_features;

  const audio_features = {
    danceability: af.danceability,
    energy: af.energy,
    loudness: af.loudness,
    speechiness: af.speechiness,
    acousticness: af.acousticness,
    instrumentalness: af.instrumentalness,
    liveness: af.liveness,
    valence: af.valence,
    tempo: af.tempo,
    key: af.key,
    mode: af.mode,
    time_signature: af.time_signature,
    duration_sec: parseFloat((af.duration_ms / 1000).toFixed(1)),
    popularity_tier:
      af.popularity >= 70 ? "high" : af.popularity >= 40 ? "medium" : "low",
  };
  return { ...doc, audio_features };
});

// 5. Очищення зайвих полів
// - Приберіть вихідні аудіофічі та поле artists_raw.

// 6. Збереження результату
// - Збережіть перетворені документи в колекцію tracks.
db.tracks.insertMany(audioFeaturesDocs.toArray());

// 7. Перевірка результату
// - Виведіть кількість документів у tracks.

// - Виведіть один приклад документа для перевірки структури.
