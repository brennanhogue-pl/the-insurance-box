# The Insurance Box - Premium Insurance Website

A beautiful, professional insurance website built to showcase the capabilities of Claude Code. This website demonstrates modern web design principles and premium development practices.

## Features

### Design & UI/UX
- **Premium Design**: Agency-quality design worth $10,000-$15,000
- **Modern Layout**: Clean, professional layout with beautiful typography
- **Responsive Design**: Fully responsive across all devices
- **Color Palette**: Professional blue/teal color scheme for trust and reliability
- **Typography**: Inter font family for modern, readable text

### Interactive Elements
- **Smooth Scrolling**: Seamless navigation between sections
- **Mobile Navigation**: Hamburger menu with smooth animations
- **Form Validation**: Real-time form validation with error handling
- **Button Interactions**: Ripple effects and hover animations
- **Scroll Animations**: Elements animate in as you scroll
- **Active Navigation**: Navigation highlights current section

### Sections
1. **Hero Section**: Compelling headline with floating insurance cards animation
2. **Services Section**: Four main insurance types with detailed features
3. **About Section**: Why choose us with testimonial
4. **CTA Section**: Call-to-action with phone number
5. **Contact Section**: Contact information and quote request form
6. **Footer**: Complete footer with links and social media

### Technical Features
- **Modern HTML5**: Semantic markup structure
- **CSS3**: Custom properties, flexbox, grid, animations
- **Vanilla JavaScript**: No dependencies, pure JavaScript interactions
- **Performance Optimized**: Throttled scroll events, preloaded resources
- **Accessibility**: Semantic HTML and keyboard navigation support

## File Structure

```
├── index.html          # Main HTML file
├── styles.css          # CSS styling and animations
├── script.js           # JavaScript interactions
└── README.md          # This file
```

## Usage

For static preview, open `index.html` in a browser.

For Marketplace API integration and local server:

1. Install Node 18+ and npm
2. Install dependencies and create env file
   ```bash
   npm install
   cp .env.example .env  # fill in Marketplace variables
   ```
3. Run the server
   ```bash
   npm run dev
   # open http://localhost:3000/health-insurance.html
   ```

### Marketplace API integration

Two modes:

- Deep links (default): send users to `https://www.healthcare.gov/` to browse/enroll.
- Live plans (optional): backend proxy calls your Marketplace vendor API and the Health page renders plans in real time.

Environment variables (see `.env.example`):

- `MARKETPLACE_BASE_URL` (e.g., `https://api.vendor.com/v1`)
- `MARKETPLACE_API_KEY` (your token)
- `MARKETPLACE_AUTH_HEADER` (default `Authorization`)
- `MARKETPLACE_AUTH_SCHEME` (e.g., `Bearer`)
- `MARKETPLACE_X_API_KEY` (optional)
- `MARKETPLACE_TIMEOUT_MS` (default `10000`)
- `MARKETPLACE_YEAR` (defaults to current year)

Frontend calls `GET /api/marketplace/plans?zip=XXXXX&state=XX&householdSize=N&income=NNN`.
Backend (`server.js`) calls the CMS Marketplace API (`/counties/by/zip` then `POST /plans/search`) and returns a normalized array with fields like `planId`, `planName`, `issuerName`, `metalLevel`, `monthlyPremium`, `deductible`, `outOfPocketMax`, `networkType`.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Demo Features

- **Quote Request Form**: Functional form with validation
- **Responsive Design**: Test on different screen sizes
- **Smooth Animations**: Scroll through sections to see animations
- **Mobile Menu**: Test hamburger menu on mobile devices

---

**Built with Claude Code** - Demonstrating the power of AI-assisted web development.