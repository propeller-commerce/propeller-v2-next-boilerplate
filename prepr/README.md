# Prepr CMS -- Seed Project

Provisions Prepr CMS content models and initial content for the Next.js e-commerce boilerplate.

## Prerequisites

- A [Prepr](https://prepr.io/) account with an environment created
- **GraphQL Access Token** -- for querying content from the Next.js app
- **Management Access Token** -- for the seed script to create content models

### Where to get tokens

| Token | Location |
|---|---|
| GraphQL | Prepr dashboard > Settings > Access tokens > GraphQL Production or Preview |
| Management | Prepr dashboard > Settings > Access tokens > Management |

## Setup

1. Install dependencies:

```bash
cd prepr && npm install
```

2. Copy the example environment file and fill in your Management token:

```bash
cp .env.example .env
```

Edit `.env` and set `PREPR_MANAGEMENT_TOKEN` to your Management access token.

3. Run the seed script:

```bash
npm run seed
```

This creates all content models listed below in your Prepr environment.

## Connect to Next.js App

In the root `.env.local` file, set the following variables:

```
CMS_PROVIDER=prepr
PREPR_ACCESS_TOKEN=<your-graphql-access-token>
```

Then restart the Next.js dev server (`npm run dev`).

## Content Models

### Singleton

| Model | Description |
|---|---|
| Global | Site name, logo, header/footer settings, navigation links |

### Collections

| Model | Description |
|---|---|
| Page | CMS-managed pages built with drag-and-drop block components |
| Article | Blog posts |
| Author | Blog post authors |
| Category | Blog categories |
| CategoryBanner | Product category banners linked by Propeller `categoryId` |

### Stack Components

These are reusable content blocks used within Pages and other collection items:

| Component | Description |
|---|---|
| HeroBanner | Full-width hero section with heading, text, and call-to-action |
| RichText | Free-form rich text content block |
| Media | Image or video embed |
| Quote | Blockquote with attribution |
| ValueProps | Grid of value propositions (icon, title, description) |
| CallToAction | Promotional banner with button |
| ProductCarousel | Carousel of products fetched from Propeller by IDs or category |
| ContactForm | Configurable contact form |
| Slider | Generic image/content slider |
| ProductSlider | Slider of products driven by CMS configuration |
| NavLink | Navigation link used in header/footer menus |
| FooterColumn | Grouped set of links and text for footer layout |
