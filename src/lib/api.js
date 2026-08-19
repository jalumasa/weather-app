import axios from "axios";

/*
  The configured axios instance.

  Every request in the app is relative to the serverless functions under /api,
  so the base URL belongs with the client rather than in App.js. It used to be
  a side effect of importing App: anything rendered without App - a component
  test, a future second entry point - silently sent its requests to the wrong
  path and got HTML back instead of JSON.

  Import this rather than axios directly.
*/
axios.defaults.baseURL = "/api/";

export default axios;
