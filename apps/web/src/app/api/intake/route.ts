import { NextResponse } from 'next/server';

// Mock AI extraction logic
function extractProfile(story: string) {
  // TODO: Replace with real AI service call
  return {
    lifeEvent: 'Example event',
    urgency: 'High',
    emotionalState: 'Distressed',
    preferences: ['virtual', 'female mentor'],
    goals: ['find support', 'learn coping skills'],
    whatImGoingThrough: 'AI summary of story',
    whatINeedHelpWith: 'AI extracted needs/goals',
    whatKindOfMentor: 'AI inferred mentor preferences',
    rawStory: story,
    tags: ['anxiety', 'career', 'support'],
  };
}

export async function POST(req: Request) {
  const { story } = await req.json();
  // Simulate AI extraction
  const profile = extractProfile(story);
  return NextResponse.json(profile);
}
