import React from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../src/contexts/AuthContext";
import { ThemeProvider } from "../../src/contexts/ThemeContext";
import Home from "../../src/pages/home";

/*
  Component-level cover for the dashboard: with the network stubbed, does the
  page actually render what came back?

  The pure calculations are unit tested in src/lib/weather.test.js - this is
  only here to catch the wiring between a response and the screen, which unit
  tests can't see.

  Home reads both auth and theme from context, so both providers are required;
  omitting ThemeProvider is what left this spec dead for a while.
*/
const mountHome = () =>
  cy.mount(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={["/home?city=New%20York"]}>
          <Home />
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );

describe("Home dashboard", () => {
  beforeEach(() => {
    // axios is configured with a /api/ baseURL, so the stubs have to match
    // that prefix rather than the bare paths.
    cy.intercept("GET", "**/api/cityweather*", { fixture: "weather.json" }).as(
      "current"
    );
    cy.intercept("GET", "**/api/cityforecast*", { fixture: "forecast.json" }).as(
      "forecast"
    );
    // UV comes from a different provider and is allowed to fail; stub it so the
    // test doesn't depend on the network either way.
    cy.intercept("GET", "**/api/uv*", { body: { now: 3.2, max: 7.4 } }).as("uv");
    mountHome();
  });

  it("renders the dashboard shell", () => {
    cy.get('[data-cy="main-div"]').should("exist");
  });

  it("shows the place and conditions from the response", () => {
    cy.wait("@current");
    cy.wait("@forecast");
    cy.contains("New York").should("be.visible");
    cy.contains("23°").should("be.visible");
    cy.contains(/clear sky/i).should("be.visible");
  });

  it("fills the conditions grid, including the separately-fetched UV", () => {
    cy.wait(["@current", "@forecast", "@uv"]);
    cy.contains("Humidity").should("be.visible");
    cy.contains("60").should("be.visible");
    cy.contains("UV index").should("be.visible");
    cy.contains("Pressure").should("be.visible");
    cy.contains("Visibility").should("be.visible");
  });

  it("reports wind in km/h, not the m/s the API sends", () => {
    // 10 m/s is 36 km/h. Showing "10 Km/h" here is the regression.
    cy.wait("@current");
    cy.contains("Wind")
      .parents('[class*="panel"]')
      .first()
      .should("contain.text", "36");
  });

  it("lists a rolling 24 hours rather than only what is left of today", () => {
    cy.wait("@forecast");
    cy.contains("Next 24 hours").should("be.visible");
  });
});
