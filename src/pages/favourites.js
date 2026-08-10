// Favourites.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import "../weatherIcon";
import FavouriteCard from "./favouriteCard";

function Favourites() {
  const [favourites, setFavourites] = useState([]);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      axios
        .get(`/favourites?userId=${currentUser.uid}`)
        .then((result) => {
          const sortedFavourites = result.data.sort((a, b) => {
            return a.name.localeCompare(b.name);
          });
          setFavourites(sortedFavourites);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }, [currentUser]);

  const handleCityClick = (city) => {
    navigate(`/home?city=${city}`);
  };

  const handleRemove = async (id, name) => {
    try {
      await axios.delete(`/favourites?id=${id}`);
      setFavourites((prev) => prev.filter((favourite) => favourite._id !== id));
      toast.error(`Removed '${name}' from favourites`);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 text-white">
      <h1 className="mb-6 text-2xl font-bold">My Favourite Cities</h1>

      {!currentUser ? (
        <p className="text-white/70">
          <Link to="/login" className="text-sky-300 hover:text-sky-200">
            Log in
          </Link>{" "}
          to save and view favourite cities.
        </p>
      ) : favourites.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favourites.map((favourite) => (
            <FavouriteCard
              key={favourite._id}
              city={favourite}
              onClick={() => handleCityClick(favourite.name)}
              onRemove={() => handleRemove(favourite._id, favourite.name)}
            />
          ))}
        </div>
      ) : (
        <p className="text-white/70">
          No favourite cities yet - heart one from the home page.
        </p>
      )}
    </div>
  );
}

export default Favourites;
