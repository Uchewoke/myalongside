# Post-Conversation Utility Implementation Guide

## Overview

The Post-Conversation Utility transforms mentorship chats into momentum by providing AI-powered insights and action tracking. After each conversation ends, users receive:

- **Conversation Summaries** - Personalized summaries highlighting key discussion points
- **Action Plan Generation** - AI-identified actionable items with priority and due dates
- **Reflection Prompts** - Thoughtful questions for deeper self-reflection
- **Check-in Reminders** - Automated follow-up messages at 3 days, 1 week, and 2 weeks
- **Progress Snapshots** - Cumulative tracking of mentorship progress over time

## Architecture

### Database Models

New Prisma models have been added:

- `ConversationSummary` - Stores summaries for both seeker and mentor
- `ActionItem` - Tracks action items with status and due dates
- `ReflectionPrompt` - Stores reflection questions and responses
- `CheckInReminder` - Scheduled reminder notifications
- `ProgressSnapshot` - Progress tracking metrics

### Backend Services

#### AI Service Extensions
- `generateConversationSummary()` - Creates summaries from conversation history
- `generateActionPlan()` - Identifies and structures action items
- `generateReflectionPrompts()` - Generates reflection questions

#### Reminder Service
- `processDueReminders()` - Sends scheduled reminders
- `getPendingReminders()` - Retrieves pending reminders for a user
- `snoozeReminder()` - Reschedules a reminder
- `dismissReminder()` - Marks reminder as skipped
- `getReminderStats()` - Gets reminder statistics

### API Endpoints

All endpoints require authentication and return 403 if user is not part of the conversation.

#### Post-Conversation Endpoints
- `POST /api/post-conversation/end-conversation` - Trigger post-conversation analysis
- `GET /api/post-conversation/:conversationId/summary` - Get conversation summary
- `GET /api/post-conversation/:conversationId/action-plan` - Get action items
- `PUT /api/post-conversation/:conversationId/action-item/:actionItemId/status` - Update action item
- `GET /api/post-conversation/:conversationId/reflection-prompts` - Get reflection questions
- `POST /api/post-conversation/:conversationId/reflection-response` - Submit reflection response
- `GET /api/post-conversation/:conversationId/progress-snapshot` - Get progress snapshot
- `GET /api/post-conversation/:conversationId/reminders` - Get check-in reminders

#### Admin Endpoints
- `POST /api/admin/reminders/process` - Process due reminders (requires `x-admin-service-token`)
- `GET /api/admin/reminders/stats` - Get reminder statistics

### Frontend Components

#### PostConversationModal
Main modal component with 4 tabs:

1. **Summary Tab** - Displays personalized summary and key themes
2. **Action Plan Tab** - Shows action items with status tracking
3. **Reflection Tab** - Displays reflection prompts with response form
4. **Progress Tab** - Shows engagement score and progress metrics

## Setup Instructions

### Step 1: Run Database Migration

```bash
cd backend
npm run prisma:migrate:dev
# Name the migration: "add_post_conversation_features"
```

This creates all new tables and relationships.

### Step 2: Ensure Environment Variables

Verify your `.env` file has AI credentials (same as for first-contact features):

```env
# Azure OpenAI
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/

# OR OpenAI
OPENAI_API_KEY=your-key

# For check-in reminders
ADMIN_SERVICE_TOKEN=your-secret-token-for-cron-jobs
```

### Step 3: Set Up Reminder Processing

Choose one approach:

#### Option A: In-Process Cron (Development)

Install node-cron:
```bash
cd backend
npm install node-cron
npm install --save-dev @types/node-cron
```

Add to `backend/src/index.ts`:

```typescript
import cron from "node-cron";
import { ReminderService } from "./services/reminder.service";

// Process reminders every 15 minutes
cron.schedule("*/15 * * * *", async () => {
  try {
    await ReminderService.processDueReminders();
  } catch (error) {
    console.error("Reminder processing failed:", error);
  }
});
```

#### Option B: External Cron Service (Production)

Set up a periodic call to your endpoint using services like:
- **Heroku Scheduler** - `curl https://your-api.com/api/admin/reminders/process -H "x-admin-service-token: your-token"`
- **AWS EventBridge + Lambda** - Invoke endpoint with proper headers
- **Google Cloud Scheduler** - Schedule HTTP POST requests
- **cron-job.org** - Free online cron service

Example cron-job.org setup:
- URL: `https://your-api.com/api/admin/reminders/process`
- Method: POST
- Headers: `x-admin-service-token: your-token`
- Frequency: Every 15 minutes

### Step 4: Implement Notification Service

The `ReminderService` has placeholder implementations for sending notifications. Implement one:

#### Email Notifications
Modify `ReminderService.sendReminder()` to call your email service:

```typescript
await emailService.send({
  to: reminder.recipient.email,
  subject: "Time to check in on your progress",
  template: "check-in-reminder",
  data: {
    recipientName: reminder.recipient.name,
    message: reminder.message,
    conversationLink: `${process.env.WEB_URL}/chat/${reminder.conversation.id}`,
    actionPlanLink: `${process.env.WEB_URL}/progress/${reminder.conversation.id}`,
  },
});
```

#### Push Notifications
Or call your push notification service:

```typescript
await notificationService.sendPushNotification({
  userId: reminder.recipientId,
  title: "Check in on your mentorship",
  body: reminder.message,
  data: {
    type: "check-in-reminder",
    conversationId: reminder.conversationId,
  },
});
```

## Usage Flow

### For Users

1. **During Chat** - Click the "End Conversation" button (LogOut icon) in the chat header
2. **View Analysis** - Modal opens with personalized insights:
   - Read conversation summary
   - Review generated action items
   - Answer reflection prompts
   - Check progress metrics
3. **Track Progress** - Action items can be marked as pending, in-progress, or completed
4. **Receive Reminders** - Get check-in notifications at scheduled times
5. **Ongoing Progress** - Progress snapshots accumulate over time

### For Mentors

- Same flow as seekers
- Different summary highlights mentor's supportive role
- Different reflection prompts focused on mentoring effectiveness

## Testing

### Manual Testing

1. **Test End-to-End Flow**
   ```bash
   # Start backend
   cd backend && npm run dev
   
   # Start web app
   cd apps/web && npm run dev
   ```

2. **Test Post-Conversation Analysis**
   - Open a chat conversation
   - Click the end conversation button
   - Verify all tabs load with data
   - Update action item status
   - Submit reflection responses

3. **Test Reminders**
   - Create a test conversation and end it
   - Check `check_in_reminders` table for created reminders
   - Call `/api/admin/reminders/process` with proper token
   - Verify reminders are marked as sent

### API Testing with cURL

```bash
# End conversation and generate analysis
curl -X POST http://localhost:4000/api/post-conversation/end-conversation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"conversationId": "conv_123"}'

# Get conversation summary
curl http://localhost:4000/api/post-conversation/conv_123/summary \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get action plan
curl http://localhost:4000/api/post-conversation/conv_123/action-plan \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update action item status
curl -X PUT http://localhost:4000/api/post-conversation/conv_123/action-item/item_456/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"status": "IN_PROGRESS"}'

# Process due reminders (admin only)
curl -X POST http://localhost:4000/api/admin/reminders/process \
  -H "x-admin-service-token: YOUR_ADMIN_TOKEN"
```

## Customization

### Adjust Reminder Timing

Edit `scheduleCheckInReminders()` in `backend/src/controllers/post-conversation.controller.ts`:

```typescript
const reminders = [
  { type: ReminderType.CHECK_IN_3_DAYS, daysOffset: 3 },
  { type: ReminderType.CHECK_IN_1_WEEK, daysOffset: 7 },
  { type: ReminderType.CHECK_IN_2_WEEKS, daysOffset: 14 },
];
```

### Customize AI Prompts

Edit system prompts in `AIService` methods:
- `generateConversationSummary()`
- `generateActionPlan()`
- `generateReflectionPrompts()`

### Modify Modal Styling

Edit `PostConversationModal.tsx` in `apps/web/src/components/`

### Add Additional Tabs

Extend the modal with new tabs like:
- **Resources** - Suggested articles or tools
- **Mentor Tips** - Personalized advice
- **Next Steps** - Curated next conversation topics

## Monitoring & Maintenance

### Key Metrics to Monitor

- Reminder delivery success rate
- Average action items per conversation
- Reflection prompt response rate
- Progress snapshot completion rate
- Engagement score trends

### Database Maintenance

Periodically clean up old data:

```sql
-- Archive old summaries (older than 1 year)
DELETE FROM "ConversationSummary" 
WHERE "createdAt" < NOW() - INTERVAL '1 year';

-- Clean up skipped reminders
DELETE FROM "CheckInReminder" 
WHERE status = 'SKIPPED' 
AND "scheduledFor" < NOW() - INTERVAL '30 days';
```

## Troubleshooting

### Issue: Reminders not sending

1. Verify `ADMIN_SERVICE_TOKEN` is set correctly
2. Check cron job logs
3. Verify reminders exist in database with `SELECT * FROM "CheckInReminder" WHERE status = 'SCHEDULED';`
4. Verify notification service implementation

### Issue: AI summaries are generic

1. Check conversation history is being passed correctly
2. Verify API key and model are working for other AI features
3. Try regenerating with more detailed prompt

### Issue: Action items not showing

1. Verify conversation exists in database
2. Check `ActionItem` records in database
3. Verify user is part of conversation

## Performance Optimization

### Database Indexes

The schema includes indexes for common queries:
- `ConversationSummary` on conversationId
- `ActionItem` on conversationId and status
- `ReflectionPrompt` on conversationId
- `CheckInReminder` on scheduledFor and recipientId

### Batch Processing Reminders

For production, use a job queue instead of cron to handle reminder batching:

```typescript
// With Bull queue
const reminderQueue = new Queue('reminders', redisConnection);

reminderQueue.process(async (job) => {
  return ReminderService.processDueReminders();
});

// Schedule job every 15 minutes
reminderQueue.add({}, { repeat: { cron: '*/15 * * * *' } });
```

## Next Steps

1. **Implement Notification Service** - Set up email or push notifications
2. **Add Progress Analytics** - Dashboard showing trends over time
3. **Mentor Training Content** - Resources for mentors to maximize effectiveness
4. **Seeker Goal Tracking** - Link action items to personal goals
5. **Team Analytics** - Admin dashboard for program metrics

## Support

For questions or issues, refer to:
- AI Service documentation in `AI_FIRST_CONTACT_SETUP.md`
- Database schema in `backend/prisma/schema.prisma`
- API route definitions in `backend/src/routes/post-conversation.routes.ts`
