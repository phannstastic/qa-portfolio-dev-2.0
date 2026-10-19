@contact
Feature: Contact Form Submission and Inquiry Management
  As a visitor or administrator
  I want to submit inquiries and manage received messages
  So that professional testing collaborations can be initiated

  Background:
    Given the portfolio application is running at "http://localhost:3001"

  Scenario: Visitor submits an inquiry message with valid information
    Given I navigate to the public portfolio homepage at "/"
    When I scroll to the contact section
    And I enter my full name "Alex Morgan"
    And I enter my email "alex.morgan@example.com"
    And I enter message "I am interested in hiring your QA automation testing services for our microservice architecture."
    And I click the "Send Message" submit button
    Then a success message "Thank you! Your message has been sent successfully." should appear
    And the contact form fields should be cleared

  Scenario: Visitor submits message shorter than 10 characters
    Given I navigate to the public portfolio homepage at "/"
    When I scroll to the contact section
    And I enter my full name "Alex Morgan"
    And I enter my email "alex.morgan@example.com"
    And I enter message "Too short"
    And I click the "Send Message" submit button
    Then an error message "Message must be between 10 and 500 characters" should appear
    And the form should not be submitted to the server

  Scenario: Visitor submits invalid email format
    Given I navigate to the public portfolio homepage at "/"
    When I scroll to the contact section
    And I enter my full name "Alex Morgan"
    And I enter my email "invalid-email-address"
    And I enter message "This is a valid inquiry message with sufficient character length."
    And I click the "Send Message" submit button
    Then an error message "Please provide a valid email address" should appear
    And the form should not be submitted to the server

  Scenario: Admin filters messages and updates message status
    Given I am authenticated as an administrator on "/admin#contacts"
    When I click the filter button "Unread"
    Then only messages with status "unread" should be displayed
    When I click "View Detail" on the top message
    Then the message detail modal should open
    When I click the "Mark as Read" status button
    Then a success toast "Message marked as read" should appear
    And the message status badge should update to "read"
