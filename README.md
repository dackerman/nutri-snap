# NutriTrack AI

NutriTrack AI is a mobile-first nutrition tracking application that leverages AI to simplify meal logging and provide detailed nutritional insights. The app uses image recognition and natural language processing to automatically analyze food and generate accurate nutritional information.

## Features

### Core Functionality
- **Email-based Authentication**: Secure user accounts with personalized meal tracking
- **AI-Powered Food Analysis**: Upload photos or describe your meals to get automatic nutritional estimates
- **Multiple Images**: Upload multiple images per meal for more accurate analysis
- **Smart Image Generation**: AI generates food images when no photos are provided
- **Real-time Updates**: WebSocket integration for instant feedback as meals are analyzed
- **Timezone Handling**: Properly works with Eastern Time for accurate daily tracking

### User Experience
- **Mobile-First Interface**: Responsive design optimized for smartphones
- **Daily Summary View**: Track calories, carbs, fat, and protein intake at a glance
- **Animated Interactions**: Smooth, engaging animations throughout the application
- **Detailed Meal Information**: Track food name, brand, quantity, and nutritional values

### Smart Meal Editing
- **Edit Any Meal**: Modify meal details and images at any time
- **Smart Regeneration**: When editing AI-generated content:
  - If description changes on AI-generated images, new images are automatically created
  - If images change, nutritional analysis is automatically updated
  - If user provides an image, it replaces AI-generated ones

## Technology Stack

### Frontend
- React with TypeScript for type safety
- Wouter for lightweight routing
- TanStack Query (React Query) for server state management
- Framer Motion for smooth animations
- Tailwind CSS with shadcn/ui components for beautiful UI
- React Hook Form for form handling and validation

### Backend
- Node.js with Express for API endpoints
- PostgreSQL database with Drizzle ORM
- WebSockets for real-time updates
- Passport.js for authentication

### AI Integration
- OpenAI's GPT-4o for food recognition and nutritional analysis
- DALL-E 3 for generating photorealistic food images

## Getting Started

### Prerequisites
- Node.js (v16+)
- PostgreSQL database
- OpenAI API key

### Environment Setup
The application requires these environment variables:
```
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
OPENAI_API_KEY=your_openai_api_key
```

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up the database: `npm run db:push`
4. Start the development server: `npm run dev`

## API Endpoints

### Authentication
- `POST /api/register` - Create a new user account
- `POST /api/login` - Log in to an existing account
- `POST /api/logout` - Log out the current user
- `GET /api/user` - Get the current user's information

### Meal Management
- `GET /api/meals` - Get meals for the current day
- `GET /api/meals/:id` - Get a specific meal by ID
- `POST /api/meals` - Create a new meal (supports multipart/form-data for images)
- `PATCH /api/meals/:id` - Update an existing meal
- `DELETE /api/meals/:id` - Delete a meal

### Nutritional Summary
- `GET /api/summary` - Get nutritional summary for the current day

## WebSocket Communications

The application uses WebSockets for real-time updates:
- Connect to `/ws` endpoint
- Receive `meal_updated` events with the meal ID when analysis is complete

## Development Approach

### AI-First Design
The application was designed to leverage AI from the ground up:
- Asynchronous meal creation allows immediate feedback while analysis happens in the background
- User-provided data is enhanced with AI-detected nutritional information
- Flexible input methods (images, text descriptions) accommodate different user preferences

### Mobile Optimization
- Touch-friendly interface with appropriate spacing
- Optimized card layouts for small screens
- Bottom-sheet modals for adding and editing meals

## Key Implementation Details

### UserProvidedImage Tracking
The system tracks whether images are user-provided or AI-generated to enable smart regeneration during edits.

### Multiple Image Handling
Multiple images are stored as a JSON-encoded array in the database for efficient retrieval.

### Timezone Handling
The system uses wide date ranges when querying to ensure correct data retrieval across timezone boundaries.

### Food Recognition Process
1. User uploads images or provides description
2. System immediately creates a meal entry with placeholder values
3. Background process analyzes the food and updates the database
4. WebSocket notification informs the client that analysis is complete
5. Client refreshes to show updated nutritional data

## License
MIT