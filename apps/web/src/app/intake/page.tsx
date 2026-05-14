"use client";

import React, { useState } from 'react';
import { TagSuggestion } from '@/components/TagSuggestion';

export default function IntakePage() {
  const [story, setStory] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ story }),
    });
    const data = await res.json();
    setResponse(data);
    setSelectedTags(data.tags || []);
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Tell us your story</h1>
      <form onSubmit={handleSubmit}>
        <textarea
          className="w-full border rounded p-2 mb-4"
          rows={6}
          placeholder="Type or paste your story here..."
          value={story}
          onChange={e => setStory(e.target.value)}
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Submit'}
        </button>
      </form>
      {response && (
        <div className="mt-6 bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">AI Extracted Profile</h2>
          <div className="mb-2">
            <strong>Life Event:</strong> {response.lifeEvent}<br />
            <strong>Urgency:</strong> {response.urgency}<br />
            <strong>Emotional State:</strong> {response.emotionalState}<br />
            <strong>Preferences:</strong> {response.preferences?.join(', ')}<br />
            <strong>Goals:</strong> {response.goals?.join(', ')}
          </div>
          <div className="mb-2">
            <strong>What I’m going through:</strong>
            <div className="italic text-stone-700">{response.whatImGoingThrough}</div>
          </div>
          <div className="mb-2">
            <strong>What I need help with:</strong>
            <div className="italic text-stone-700">{response.whatINeedHelpWith}</div>
          </div>
          <div className="mb-2">
            <strong>What kind of mentor I’m looking for:</strong>
            <div className="italic text-stone-700">{response.whatKindOfMentor}</div>
          </div>
          <TagSuggestion tags={response.tags || []} onSelect={setSelectedTags} />
          <div className="mt-2 text-xs text-gray-500">Selected tags: {selectedTags.join(', ')}</div>
        </div>
      )}
    </div>
  );
}
