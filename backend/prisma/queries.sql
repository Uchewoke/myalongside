-- Useful queries after seeding

-- List all life events
SELECT id, label, emoji, category FROM "LifeEvent" ORDER BY label;

-- Count users by role
SELECT role, COUNT(*) as count FROM "User" GROUP BY role;

-- Find mentors and their availability
SELECT 
  u.id, 
  u.name, 
  u.email, 
  m."isAvailable", 
  m.rating, 
  m."reviewCount"
FROM "User" u
LEFT JOIN "MentorProfile" m ON u.id = m."userId"
WHERE u.role = 'MENTOR';

-- Find seekers and their life events
SELECT 
  u.id, 
  u.name, 
  u.email, 
  le.label as "lifeEvent",
  ule.status
FROM "User" u
JOIN "UserLifeEvent" ule ON u.id = ule."userId"
JOIN "LifeEvent" le ON ule."lifeEventId" = le.id
WHERE u.role = 'SEEKER';

-- View all matches and their status
SELECT 
  m.id,
  u1.name as seeker_name,
  u2.name as mentor_name,
  le.label as life_event,
  m.status,
  m."createdAt"
FROM "Match" m
JOIN "User" u1 ON m."seekerId" = u1.id
JOIN "User" u2 ON m."mentorId" = u2.id
LEFT JOIN "LifeEvent" le ON m."lifeEventId" = le.id;

-- Messages in conversations
SELECT 
  c.id as conversation_id,
  m."createdAt",
  u.name as sender,
  m.content
FROM "Conversation" c
JOIN "Message" m ON c.id = m."conversationId"
JOIN "User" u ON m."senderId" = u.id
ORDER BY m."createdAt" DESC
LIMIT 20;
