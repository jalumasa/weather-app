import express from "express";
const router = express.Router();
import {
  favourites,
  addFavourite,
  deleteFavourite,
} from "../controller/favouritesController.js";
import {
  timeZone,
  weather,
  forecast,
  cityWeather,
  cityForecast,
} from "../controller/apiController.js";

//routes for the API
router.get("/timeZone", timeZone);
router.get("/weather", weather);
router.get("/forecast", forecast);
router.get("/cityweather", cityWeather);
router.get("/cityforecast", cityForecast);

//routes for favouriting and stuff
router.get("/favourites/:userId", favourites);
router.post("/addFavourite", addFavourite);
router.delete("/removeFavourite/:id", deleteFavourite);

export { router as Router };
