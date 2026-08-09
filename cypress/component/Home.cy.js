import React from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../src/contexts/AuthContext";
import Home from "../../src/pages/home";

describe("Testing the Weather Application", () => {
  beforeEach(() => {
    cy.intercept("GET", "/weather?lat=*", { fixture: "weather.json" }).as(
      "getWeather"
    );
    cy.intercept("GET", "/forecast?lat=*", { fixture: "forecast.json" }).as(
      "getForecast"
    );

    // Mount the Home component to render it
    cy.mount(
      <AuthProvider>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </AuthProvider>
    );
  });

  it("Should display the Home page and fetch weather data", () => {
    // Check if the Home page loads
    cy.get('[data-cy="main-div"]').should("exist");
  });

  it("Should fetch wetaher data from respective API's", () => {
    // Wait for the API call to complete
    cy.wait("@getWeather").its("response.statusCode").should("eq", 200);
    cy.wait("@getForecast").its("response.statusCode").should("eq", 200);

    // Verify elements that would be populated by API data
    cy.get(".humidity-value").should("contain.text", "60%");
  });
});
