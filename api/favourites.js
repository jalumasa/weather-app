import { db } from "./_lib/firebaseAdmin.js";

const favouritesCollection = db.collection("favourites");

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { userId } = req.query;
      const snapshot = await favouritesCollection
        .where("userId", "==", userId)
        .get();
      const favourites = snapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }));
      return res.status(200).json(favourites);
    }

    if (req.method === "POST") {
      /*
        Coordinates are stored alongside the name because the name alone is
        not enough to find the place again. Re-opening a saved location used
        to go through OpenWeatherMap's name lookup, which is ambiguous: a
        location saved in Ashland, Illinois came back as Ashland, Ohio, 654km
        away. The name is kept for the label; lat/lon are what we re-fetch by.

        They're optional so that rows written before this change still load -
        those fall back to the old name lookup (see home.js).
      */
      const { userId, name, lat, lon } = req.body;
      const record = { userId, name };
      if (typeof lat === "number" && typeof lon === "number") {
        record.lat = lat;
        record.lon = lon;
      }
      const docRef = await favouritesCollection.add(record);
      return res.status(200).json({ _id: docRef.id, ...record });
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      await favouritesCollection.doc(id).delete();
      return res.status(200).json({ _id: id });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error handling favourites request:", error);
    res.status(500).json({ error: error.message });
  }
}
