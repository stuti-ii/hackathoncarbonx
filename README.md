
# 🌱 CarbonX

## Turning Invisible Digital Emissions into Visible Climate Action

 #Overview
CarbonX is a digital sustainability platform that helps users understand, monitor, and reduce their **digital carbon footprint**.
Every online activity—whether it is watching videos, using AI tools, browsing websites, or interacting with social media—consumes energy through servers, networks, and data centers.
CarbonX tracks digital usage patterns, estimates associated carbon emissions, and provides actionable recommendations that help users adopt more sustainable digital habits.

# Problem Statement
Modern users spend hours online every day.
However, most people are unaware that digital activities contribute to carbon emissions through energy-intensive infrastructure such as:
* Data Centers
* Cloud Storage Systems
* AI Computing Resources
* Streaming Platforms
* Social Media Networks

While people can track fitness, finances, and electricity usage, there is currently limited visibility into the environmental impact of digital behavior.

# Challenges
* Lack of awareness of digital emissions
* No personalized sustainability insights
* No tracking mechanism for digital carbon footprint
* Difficulty understanding which platforms generate the highest impact

# Solution
CarbonX provides a complete digital sustainability ecosystem that:
1. Tracks digital activity through a Chrome Extension
2. Calculates estimated energy consumption
3. Estimates carbon emissions
4. Generates sustainability insights
5. Provides personalized recommendations
6. Encourages behavior change through gamification
The goal is to transform awareness into action and help users make environmentally responsible digital choices.

# System Architecture

User Activity
↓
Chrome Extension
↓
Django REST API
↓
PostgreSQL Database
↓
Carbon Calculation Engine
↓
Analytics Dashboard
↓
Recommendations & Insights

# Tech Stack

## Frontend

* React.js
* Tailwind CSS
* Recharts

## Backend

* Django
* Django REST Framework
* JWT Authentication

# Database
* Sqlite

# Browser Tracking

* Chrome Extension
* Chrome Storage API
* Chrome Tabs API
* Chrome Idle API

# Authentication
* JWT Tokens
* Refresh Tokens

# Core Features
Users can:
* Register Accounts
* Securely Login
* Access Protected Resources
* Maintain Sessions Using JWT Authentication

# API Endpoints
POST /api/register/

POST /api/login/

POST /api/token/


# Activity Tracking
CarbonX tracks user activity through a Chrome Extension.

The extension records:
* Platform Name
* Usage Duration
* Session Information
* Activity Timestamp
* 
 Example

{
"platform": "youtube.com",
"duration": 540
}

# Dashboard Summary
The Dashboard provides an overview of user sustainability metrics.

# Metrics
* Total Carbon Emissions
* Energy Consumed
* AI Usage Duration
* Eco Score

# Endpoint
GET /api/dashboard-summary/

# Carbon Breakdown
Displays platform-wise carbon emissions.
Users can identify which websites or platforms contribute most to their digital footprint.

# Endpoint
GET /api/carbon-breakdown/

# Example Response

[
{
"platform": "youtube",
"carbon": 23.5
},
{
"platform": "chatgpt",
"carbon": 15.2
}
]

# Carbon Trends
Tracks emissions over time.
Provides historical analysis to help users understand sustainability progress.

# Endpoint
GET /api/carbon-trends/

# Benefits
* Weekly Emission Analysis
* Behavior Tracking
* Sustainability Monitoring

# Eco Score
Eco Score converts complex sustainability metrics into a simple score between 0 and 100.

# Rating Categories
| Score    | Rating            |
| -------- | ----------------- |
| 85+      | Excellent         |
| 70–84    | Good              |
| Below 70 | Needs Improvement |

# Endpoint
GET /api/eco-score/

---

# Personalized Recommendations

CarbonX provides sustainability recommendations based on digital behavior.
# Examples
* Reduce AI Usage
* Lower Streaming Quality
* Disable Autoplay
* Compress Images Before Uploading
* Remove Unused Cloud Files

# Endpoint
GET /api/recommendations/


When a user starts a tracking session:

* Session ID is generated
* Active tab is detected
* Tracking begins

## Activity Monitoring

The extension monitors:

* Tab Changes
* Website Navigation
* User Idle State
* Active Browsing Duration

## Idle Detection

If a user becomes inactive for 60 seconds:

* Tracking pauses
* Timer stops

When activity resumes:

* Tracking automatically continues

This improves tracking accuracy and prevents false activity records.

## Stop Session

When the user ends the session:

1. Current activity is finalized
2. Activities are stored locally
3. Data is sent securely to backend APIs
4. Dashboard metrics are update

# Security Features
CarbonX prioritizes user privacy and security.

# Implemented Measures
* JWT Authentication
* Refresh Token Mechanism
* Protected API Endpoints
* User-Specific Data Isolation
* Secure Activity Submission

Users can only access their own activity records.

# Future Enhancements

## AI Sustainability Coach

Provide personalized carbon reduction strategies.

## Mobile Application

Enable tracking and sustainability insights across devices.

## Carbon Credit Marketplace

Allow users to offset estimated emissions through verified carbon projects.

## NGO Collaboration

Partner with environmental organizations and climate initiatives.

## Smart Sustainability Reports

Generate detailed environmental impact reports automatically.


# Impact

CarbonX contributes toward:

### Sustainable Development Goals (SDGs)

✅ SDG 13 – Climate Action

✅ SDG 12 – Responsible Consumption and Production

✅ SDG 9 – Industry, Innovation and Infrastructure

✅ SDG 11 – Sustainable Cities and Communities

---

# Vision

Our vision is to make digital sustainability as common as fitness tracking.

By helping users understand the environmental impact of their online behavior, CarbonX empowers individuals and organizations to make smarter, greener digital choices.

**CarbonX – Measure. Understand. Reduce.**
