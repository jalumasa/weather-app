import { db } from "../config/db.js";

const favouritesCollection = db.collection("favourites");

const favourites = async (req, res) => {
  const { userId } = req.params;
  try {
    const snapshot = await favouritesCollection.where("userId", "==", userId).get();
    const favourites = snapshot.docs.map((doc) => ({
      _id: doc.id,
      ...doc.data(),
    }));
    res.json(favourites);
  } catch (error) {
    console.error("Error fetching favourites:", error);
    res.status(500).json({ error: error.message });
  }
};

const addFavourite = async (req, res) => {
  const { userId, name } = req.body;
  try {
    const docRef = await favouritesCollection.add({ userId, name });
    res.json({ _id: docRef.id, userId, name });
  } catch (error) {
    console.error("Error adding favourite:", error);
    res.status(500).json({ error: error.message });
  }
};

const deleteFavourite = async (req, res) => {
  const id = req.params.id;
  try {
    await favouritesCollection.doc(id).delete();
    res.json({ _id: id });
  } catch (error) {
    console.error("Error deleting favourite:", error);
    res.status(500).json({ error: error.message });
  }
};

export { favourites, addFavourite, deleteFavourite };
