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
      const { userId, name } = req.body;
      const docRef = await favouritesCollection.add({ userId, name });
      return res.status(200).json({ _id: docRef.id, userId, name });
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
