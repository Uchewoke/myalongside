# AI First Contact Setup Guide

## Overview

This guide walks you through setting up the AI-powered first contact features for MyAlongside. The system includes:

- **First-Message Assistant** - Helps seekers draft introductions
- **Mentor Response Assistant** - Suggests warm, thoughtful responses
- **Conversation Starters** - Provides contextual conversation prompts

## Prerequisites

Before starting, ensure you have:
- Node.js 18+ installed
- PostgreSQL database running
- Azure OpenAI or OpenAI account with API access

## Step 1: Install Dependencies

Add the OpenAI SDK to your backend:

```bash
cd backend
npm install openai
```

Or if using yarn:

```bash
cd backend
yarn add openai
```

## Step 2: Update Environment Variables

### Backend Configuration

Create or update `backend/.env` with the following variables:

#### Option A: Azure OpenAI

```env
# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
```

**How to get these values:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Azure OpenAI resource
3. Under "Keys and Endpoint", copy:
   - Key 1 or Key 2 → `AZURE_OPENAI_API_KEY`
   - Endpoint → `AZURE_OPENAI_ENDPOINT`

#### Option B: OpenAI (Standard)

```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
```

**How to get this:**
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key or copy an existing one
3. Paste it as `OPENAI_API_KEY`

## Step 3: Run Database Migration

Create the AI suggestion tracking table:

```bash
# From root directory
npm run prisma:migrate:dev

# Choose a name like "add_ai_suggestions"
```

This creates the `AiSuggestion` table and adds the `SuggestionType` enum.

## Step 4: Verify Backend Setup

Test the AI service connection:

```bash
cd backend
npm run dev
```

Check that the server starts without errors. The following routes should now be available:

- `POST /api/ai/suggestions/intro` - Generate intro messages
- `POST /api/ai/suggestions/response` - Generate response suggestions
- `GET /api/ai/suggestions/starters` - Get conversation starters
- `POST /api/ai/suggestions/:suggestionId/accept` - Track suggestion usage

## Step 5: Start the Development Stack

In separate terminals:

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Web Frontend
cd apps/web
npm run dev

# Terminal 3: Admin (optional)
cd apps/admin
npm run dev
```

## Testing the Features

### Test 1: First-Message Suggestion

1. Navigate to a mentor profile
2. Click the message icon (or "Connect" button)
3. In the chat view, you should see **Conversation Starters** suggestions
4. Try typing an initial message and see the AI suggestions

### Test 2: Mentor Response Suggestion

1. As a mentor, view a conversation with a seeker
2. When the seeker sends a message, click the **Sparkles icon** in the message input area
3. You should see suggestions for warm, supportive responses
4. Click "Use" to populate your response

### Test 3: Conversation Starters

1. In a new conversation, before sending the first message
2. You should see 4 conversation starter suggestions below the input
3. Click any to populate it in the message input

## API Examples

### Generate Intro Suggestion

```bash
curl -X POST http://localhost:4000/api/ai/suggestions/intro \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "mentorId": "m1",
    "initialMessage": "Hi, I think we could connect about life transitions"
  }'
```

**Response:**
```json
{
  "suggestions": [
    "I've been following your work and was really moved by your story...",
    "Your experience resonates deeply with where I am right now...",
    "I'd love to learn from your journey through this..."
  ]
}
```

### Generate Response Suggestion

```bash
curl -X POST http://localhost:4000/api/ai/suggestions/response \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "conversationId": "conv-123",
    "messageContent": "I'm struggling with the uncertainty of starting fresh"
  }'
```

### Get Conversation Starters

```bash
curl -X GET "http://localhost:4000/api/ai/suggestions/starters?lifeEventId=career-change" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

## Troubleshooting

### Error: "AI_API_KEY environment variable is not set"

**Solution:** Ensure you've set either `AZURE_OPENAI_API_KEY` or `OPENAI_API_KEY` in `backend/.env`

### Error: "Failed to generate suggestion"

**Possible causes:**
1. API credentials are incorrect
2. API rate limit reached
3. API key doesn't have permission for the model

**Solution:**
- Check API keys in Azure Portal or OpenAI dashboard
- Wait a few minutes and try again
- Verify your Azure OpenAI resource has access to `gpt-4o-mini` model

### Empty suggestions in UI

**Possible causes:**
1. Backend not running
2. CORS issues
3. Authentication token missing

**Solution:**
- Check browser console for network errors
- Verify backend is running on `localhost:4000`
- Ensure you're authenticated before testing

## Performance Optimization

### Caching Strategy

Currently, conversation starters are fetched on demand. To optimize:

1. **Add Redis caching** for conversation starters by life event ID
2. **Debounce** suggestion requests to prevent rapid-fire API calls
3. **Batch** similar requests in high-traffic scenarios

### Rate Limiting

The backend includes global rate limiting. For AI endpoints specifically:

```typescript
// Add in backend/src/index.ts
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 minute
  max: 10,                   // 10 requests per minute
  skipSuccessfulRequests: true
});

app.use("/api/ai", aiLimiter, aiRoutes);
```

## Production Deployment

### Prerequisites

1. Azure OpenAI resource deployed
2. Environment variables configured in deployment platform
3. Database migrations applied

### Deployment Steps

1. **Set environment variables** in your deployment platform (Vercel, Azure App Service, etc.)
2. **Run migrations** in production database
3. **Deploy backend** with new AI routes
4. **Deploy frontend** with new components
5. **Test in staging** before releasing to production

### Monitoring

Monitor AI suggestion usage with:

```sql
-- Most used suggestions
SELECT type, COUNT(*) as count
FROM "AiSuggestion"
GROUP BY type
ORDER BY count DESC;

-- Suggestion acceptance rate
SELECT 
  type,
  COUNT(*) as total,
  SUM(CASE WHEN accepted = true THEN 1 ELSE 0 END) as accepted,
  ROUND(100.0 * SUM(CASE WHEN accepted = true THEN 1 ELSE 0 END) / COUNT(*), 2) as acceptance_rate
FROM "AiSuggestion"
GROUP BY type;
```

## Next Steps

1. **Customize prompts** in `backend/src/services/ai.service.ts` to match your brand voice
2. **Add feature flags** to A/B test AI features
3. **Set up analytics** to track suggestion usage and impact
4. **Train mentors** on using the AI response assistant
5. **Gather feedback** from users on suggestion quality

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review browser console and backend logs
3. Test API endpoints directly using curl or Postman
4. File an issue with full error context
