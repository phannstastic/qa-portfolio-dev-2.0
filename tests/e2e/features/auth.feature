@auth @security
Feature: Admin Authentication and Access Control
  As a portfolio administrator
  I want to securely authenticate via the login portal
  So that only authorized users can access CMS management views

  Background:
    Given the portfolio application is running at "http://localhost:3001"

  Scenario: Admin successfully logs in with valid credentials
    Given I navigate to the login page at "/login"
    When I enter email "admin@qa-portfolio.local" and password "ValidAdminPassword123!"
    And I click the sign in button
    Then I should be redirected to the admin dashboard at "/admin"
    And I should see the dashboard overview with navigation links
    And the session token should be stored securely in sessionStorage

  Scenario: Admin fails to log in with invalid credentials
    Given I navigate to the login page at "/login"
    When I enter email "admin@qa-portfolio.local" and password "WrongPassword!"
    And I click the sign in button
    Then I should remain on the login page at "/login"
    And I should see an error message "Invalid email or password"
    And no session token should be stored in sessionStorage

  Scenario: Unauthenticated visitor attempts direct access to admin dashboard
    Given I have no active admin session
    When I navigate directly to the admin dashboard at "/admin"
    Then I should be automatically redirected to the login page at "/login"
    And the admin dashboard views should not be revealed
