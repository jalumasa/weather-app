// Favourites.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "../weatherIcon";
import FavouriteCard from "./favouriteCard";

function Favourites() {
  const [favourites, setFavourites] = useState([]);
  const { currentUser } = useAuth();
  const navigate = useNavigate(); 

  useEffect(() => {
    if (currentUser) {
      axios
        .get(`/favourites/${currentUser.uid}`)
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

  // Define the handleCityClick function
  const handleCityClick = (city) => {
    navigate(`/home?city=${city}`); // Redirect to home with the city query parameter
  };

  return (
    <div className="favourites-container">
      {favourites.length ? (
        favourites.map((favourite, index) => (
          <FavouriteCard
            key={index}
            city={favourite}
            onClick={() => handleCityClick(favourite.name)}
          />
        ))
      ) : (
        <div>
          <p>Empty</p>
        </div>
      )}
    </div>
  );
}

export default Favourites;
