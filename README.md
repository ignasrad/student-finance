# Student Finance Application

This is a React application for processing student loan statements. The application allows users to:

- Upload PDF statements from student loan providers
- Process and analyze loan data 
- Generate Excel reports with detailed loan information
- Convert between GBP and EUR using ECB exchange rates

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Key Features

- PDF parsing of student loan statements
- Calculation of loan vs. interest portions
- Currency conversion using ECB exchange rates
- Excel report generation with detailed breakdowns
- Support for multiple statement uploads

## Technical Implementation

The application uses:

- React for the frontend
- TypeScript for type safety
- PDF.js for PDF parsing
- ExcelJS for Excel file generation
- ECB API for exchange rate data

## Project Structure

- `src/models/` - Data models for loan entities
- `src/services/` - Business logic services
- `src/components/` - React components

## Getting Started

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm start` to start the development server
4. Upload PDF statements to generate Excel reports
