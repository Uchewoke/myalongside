# Mentor Copilot Implementation Guide

## Overview
The Mentor Copilot is a comprehensive AI-powered feature designed to raise mentor quality and consistency by providing real-time guidance across five key areas: empathy drafting, suggested follow-up questions, resource recommendations, boundary-safe language suggestions, and session recap support.

## Architecture

### Backend Structure

#### AI Service (`backend/src/services/ai.service.ts`)
New methods added to the AIService class:

1. **generateEmpathyDrafting()**
   - Generates 3 empathy-focused response drafts
   - Each draft includes:
     - Full suggested response
     - Array of empathy elements used (validation, normalization, etc.)
     - Emotional tone description
   - Uses low temperature (0.7) for consistency

2. **generateFollowUpQuestions()**
   - Generates 3-4 contextual follow-up questions
   - Each question includes its purpose (e.g., "clarify feelings", "explore options")
   - Respects emotional pacing while deepening conversation
   - Uses medium temperature (0.6)

3. **generateResourceRecommendations()**
   - Recommends 3-5 resources based on conversation context
   - Resource types: article, exercise, tool, book, video
   - Each includes relevance indicator (HIGH/MEDIUM)
   - Uses conservative temperature (0.5)

4. **checkBoundaryLanguage()**
   - Reviews draft messages for boundary safety
   - Detects: over-promising, enmeshment, inappropriate sharing, rescuing behavior
   - Provides:
     - isSafe boolean flag
     - Array of specific concerns
     - Specific suggested replacements with reasons
     - Overall feedback summary
   - Uses very low temperature (0.3) for precision

#### Controller Methods (`backend/src/controllers/ai.controller.ts`)
New endpoints with comprehensive validation:

- `generateEmpathyDrafting()` - POST /api/ai/mentor-copilot/empathy-drafting
- `generateFollowUpQuestions()` - POST /api/ai/mentor-copilot/follow-up-questions
- `generateResourceRecommendations()` - POST /api/ai/mentor-copilot/resource-recommendations
- `checkBoundaryLanguage()` - POST /api/ai/mentor-copilot/boundary-check

All endpoints include:
- Authentication verification (require mentor access)
- Conversation context fetching
- Error handling with fallback responses
- Zod validation schemas

#### Routes (`backend/src/routes/ai.routes.ts`)
New route group for Mentor Copilot endpoints:
```
POST /api/ai/mentor-copilot/empathy-drafting
POST /api/ai/mentor-copilot/follow-up-questions
POST /api/ai/mentor-copilot/resource-recommendations
POST /api/ai/mentor-copilot/boundary-check
```

### Frontend Components

#### 1. EmpathyDrafting Component (`apps/web/src/components/EmpathyDrafting.tsx`)
**Purpose:** Provides empathy-focused response suggestions with emotional guidance

**Features:**
- Expandable/collapsible interface
- Displays 3 draft responses with empathy elements
- Shows emotional tone for each draft
- Copy-to-clipboard functionality
- "Use this draft" button to populate input field
- Regenerate button for alternative suggestions
- Loading and error states

**Color Scheme:** Amber (warm, supportive)

#### 2. FollowUpQuestions Component (`apps/web/src/components/FollowUpQuestions.tsx`)
**Purpose:** Suggests contextual questions to deepen conversation

**Features:**
- Expandable/collapsible interface
- Displays 3-4 questions with their purpose
- Copy-to-clipboard functionality
- "Use this question" button
- Regenerate button
- Loading and error states

**Color Scheme:** Blue (inquisitive, thoughtful)

#### 3. BoundaryLanguageChecker Component (`apps/web/src/components/BoundaryLanguageChecker.tsx`)
**Purpose:** Real-time boundary safety review of draft messages

**Features:**
- Displays safety status (safe/concerns detected)
- Lists specific concerns found
- Shows suggested improvements with reasons
- Expandable suggestions with details
- "Apply suggestion" button to update draft
- Recheck button after modifications
- Status indicator: checkmark for safe, alert for concerns

**Color Scheme:** Emerald (protective, supportive)

#### 4. ResourceRecommendations Component (`apps/web/src/components/ResourceRecommendations.tsx`)
**Purpose:** Suggests relevant resources to support the seeker

**Features:**
- Expandable/collapsible interface
- Displays resources with emoji icons
- Resource types: article, exercise, tool, book, video
- Relevance badges (Highly relevant)
- Description text
- External link to resources
- Regenerate button
- Loading and error states

**Color Scheme:** Purple (knowledge, growth)

#### 5. MentorCopilotPanel Component (`apps/web/src/components/MentorCopilotPanel.tsx`)
**Purpose:** Unified panel integrating all copilot features

**Features:**
- Slide-in panel on right side
- Organized 4-step workflow:
  1. Response Guidance (Empathy Drafting)
  2. Deepen the Conversation (Follow-up Questions)
  3. Offer Resources (Resource Recommendations)
  4. Verify Boundaries (Boundary Language Checker)
- Draft message preview with live updates
- Clear draft button
- Close button with X icon
- Informational banner

**Layout:** Fixed right sidebar (full height on mobile, 384px on desktop)

#### Integration with Chat Interface (`apps/web/src/app/chat/[id]/page.tsx`)

**Changes Made:**
1. Added MentorCopilotPanel import
2. Added `isMentorCopilotOpen` state management
3. Added Sparkles button in chat header to toggle copilot
4. Integrated MentorCopilotPanel component with:
   - Current conversation ID
   - Latest seeker message
   - Life event context
   - Discussion topics from recent messages
   - Message selection callback

## API Endpoint Reference

### Empathy Drafting
```
POST /api/ai/mentor-copilot/empathy-drafting
Authorization: Bearer <token>

Request Body:
{
  "conversationId": "conv-123",
  "messageContent": "I'm feeling really overwhelmed right now..."
}

Response:
{
  "draftResponses": [
    {
      "response": "I hear you, and...",
      "empathyElements": ["validation", "normalization"],
      "tone": "warm and understanding"
    },
    ...
  ]
}
```

### Follow-up Questions
```
POST /api/ai/mentor-copilot/follow-up-questions
Authorization: Bearer <token>

Request Body:
{
  "conversationId": "conv-123",
  "messageContent": "I'm struggling with work-life balance"
}

Response:
{
  "questions": [
    {
      "question": "Can you tell me more about...",
      "purpose": "deepen understanding"
    },
    ...
  ]
}
```

### Resource Recommendations
```
POST /api/ai/mentor-copilot/resource-recommendations
Authorization: Bearer <token>

Request Body:
{
  "conversationId": "conv-123",
  "lifeEvent": "Career Transition",
  "discussionTopics": ["confidence", "networking"],
  "seekerChallenges": ["impostor syndrome", "time management"]
}

Response:
{
  "resources": [
    {
      "title": "Building Confidence in New Roles",
      "type": "article",
      "description": "A guide to...",
      "relevance": "HIGH",
      "url": "https://..."
    },
    ...
  ]
}
```

### Boundary Language Check
```
POST /api/ai/mentor-copilot/boundary-check
Authorization: Bearer <token>

Request Body:
{
  "conversationId": "conv-123",
  "draftMessage": "I'm always available for you, call anytime..."
}

Response:
{
  "isSafe": false,
  "concerns": ["Suggests unlimited availability", "May create dependence"],
  "suggestions": [
    {
      "original": "I'm always available for you",
      "suggested": "I'm here to support you during our scheduled sessions",
      "reason": "Establishes healthy boundaries around availability"
    }
  ],
  "overallFeedback": "Consider adjusting to reflect realistic availability..."
}
```

## Data Models

### Interface Definitions

```typescript
interface EmpathyDraftingResult {
  draftResponses: Array<{
    response: string;
    empathyElements: string[];
    tone: string;
  }>;
}

interface FollowUpQuestionsResult {
  questions: Array<{
    question: string;
    purpose: string;
  }>;
}

interface ResourceRecommendationResult {
  resources: Array<{
    title: string;
    type: "article" | "exercise" | "tool" | "book" | "video";
    description: string;
    relevance: "HIGH" | "MEDIUM";
    url?: string;
  }>;
}

interface BoundaryLanguageCheckResult {
  isSafe: boolean;
  concerns: string[];
  suggestions: Array<{
    original: string;
    suggested: string;
    reason: string;
  }>;
  overallFeedback: string;
}
```

## Usage Workflow

### For Mentors

1. **Start Copilot**
   - Click Sparkles icon in chat header
   - Panel slides in from right side

2. **Draft Response with Empathy**
   - Click "Draft with empathy guidance"
   - Review 3 empathy-focused options
   - Select one to populate input field
   - Or use copy button to review offline

3. **Deepen Conversation**
   - Click "Suggest follow-up questions"
   - Review contextual questions
   - Select question to add to draft
   - Combine with earlier response

4. **Verify Boundaries**
   - As you draft, boundary checker runs automatically
   - Review any concerns
   - Apply suggested improvements
   - Recheck after modifications

5. **Find Resources**
   - Click "Suggest helpful resources"
   - Review curated resources
   - Share links with seeker
   - Can be combined with message

6. **Send Message**
   - Review draft in preview section
   - Send via input field as normal
   - Copilot remains available for next message

## Quality Assurance

### Testing Checklist

- [ ] Empathy drafts validate emotional awareness and warmth
- [ ] Follow-up questions respect pacing and psychological safety
- [ ] Boundary suggestions catch common boundary violations
- [ ] Resources are relevant and accessible
- [ ] All components handle loading/error states gracefully
- [ ] Copy-to-clipboard works across all components
- [ ] Panel closes properly and doesn't interfere with chat
- [ ] Mobile experience is smooth (reduced width, scrollable)
- [ ] AI responses respect conversation context
- [ ] Rate limiting prevents abuse of endpoints

### Performance Considerations

- AI endpoints have ~2-5 second latency (typical for GPT-4o-mini)
- Panel state managed locally (no persistence needed)
- All API calls are debounced to prevent duplicate requests
- Conversation context limited to last 10 messages
- Resources limited to 5 recommendations

## Configuration

### Environment Variables
```
AI_MODEL=gpt-4o-mini  # or gpt-4o for higher quality
AZURE_OPENAI_API_KEY=<key>
AZURE_OPENAI_ENDPOINT=<endpoint>
# OR
OPENAI_API_KEY=<key>
```

### Temperature Settings (for consistency)
- Empathy Drafting: 0.7 (creative, warm)
- Follow-up Questions: 0.6 (balanced)
- Resources: 0.5 (focused)
- Boundary Check: 0.3 (precise)

## Error Handling

All endpoints include fallback responses:

**Empathy Drafting Fallback:**
```json
{
  "response": "Thank you for sharing that with me. What you're experiencing is really significant, and I appreciate your honesty.",
  "empathyElements": ["validation", "acknowledgment"],
  "tone": "warm and understanding"
}
```

**Boundary Check Fallback:**
```json
{
  "isSafe": true,
  "concerns": [],
  "suggestions": [],
  "overallFeedback": "This message appears to maintain healthy boundaries."
}
```

## Monitoring & Metrics

### Recommended Metrics to Track
- Copilot panel activation rate
- Suggestion acceptance rate by type
- Boundary issues detected and accepted
- Resource recommendation CTR
- Time saved per conversation
- Mentor feedback/satisfaction

### Error Logging
- Log all API failures with request/response
- Track parsing errors in AI output
- Monitor rate limiting hits
- Alert on unusual response patterns

## Future Enhancements

1. **Personalization**
   - Learn mentor's communication style
   - Adjust suggestions based on preferences
   - Track mentor-specific effectiveness

2. **Analytics Dashboard**
   - View mentor copilot usage patterns
   - Track quality improvements over time
   - Identify coaching opportunities

3. **Batch Operations**
   - Generate resources for multiple mentors
   - Bulk boundary checking
   - Team-wide coaching

4. **Integration Opportunities**
   - Slack/Teams notifications for resources
   - Calendar integration for session reminders
   - CRM data enrichment

5. **Advanced Safety**
   - Real-time crisis detection
   - Multi-language support
   - Accessibility improvements

## Troubleshooting

### Issue: Copilot panel not appearing
**Solution:** Check browser console for JavaScript errors; verify MentorCopilotPanel component import

### Issue: AI suggestions not generating
**Solution:** 
- Check API key is set
- Verify conversation has valid context
- Check network tab for failed requests
- Review error message in component

### Issue: Boundary checker too strict/lenient
**Solution:** Adjust temperature in ai.service.ts (currently 0.3)

### Issue: Resources not relevant
**Solution:** Provide more detailed discussion topics and seeker challenges

## Support & Feedback
For issues or improvements, contact the Mentor Copilot team.
