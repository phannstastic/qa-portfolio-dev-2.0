@projects
Feature: Projects Showcase and Admin CMS Management
  As a visitor or administrator
  I want to view, search, and manage portfolio projects
  So that testing frameworks and accomplishments are clearly showcased

  Background:
    Given the portfolio application is running at "http://localhost:3001"

  Scenario: Visitor searches and filters projects on public portfolio
    Given I navigate to the public portfolio homepage at "/"
    When I scroll to the projects section
    And I enter "Selenium" into the project search input
    Then only projects matching "Selenium" should be displayed in the list
    When I click the category filter button "API Testing"
    Then only projects in the "API Testing" category should be displayed

  Scenario: Visitor opens project detail modal
    Given I navigate to the public portfolio homepage at "/"
    When I click on the project card for "Elysia API Test Automation Framework"
    Then a modal dialog should open displaying detailed project information
    And the modal should contain tech stack badges and GitHub repository links
    When I click the modal close button
    Then the modal dialog should be closed

  Scenario: Admin creates a new portfolio project
    Given I am authenticated as an administrator on "/admin#projects"
    When I click the "+ Add Project" button
    Then the project modal should be displayed
    When I fill in project title "Mobile App Automated Testing Suite"
    And I fill in project category "Mobile Testing"
    And I fill in project tech stack "Appium, WebdriverIO, TypeScript"
    And I fill in project description "Automated end-to-end regression testing suite for iOS and Android platforms."
    And I click "Save Project"
    Then a success toast "Project created successfully" should appear
    And the new project "Mobile App Automated Testing Suite" should appear in the projects table

  Scenario: Admin deletes a project with explicit confirmation
    Given I am authenticated as an administrator on "/admin#projects"
    When I locate the project "Mobile App Automated Testing Suite" in the table
    And I click the delete button for that project
    Then a confirmation dialog should appear asking "Are you sure you want to delete"
    When I click the "Confirm Delete" button
    Then a success toast "Project deleted successfully" should appear
    And the project should no longer appear in the projects table
