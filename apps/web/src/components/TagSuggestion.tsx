import React from 'react';

interface TagSuggestionProps {
  tags: string[];
  onSelect: (tags: string[]) => void;
}

export const TagSuggestion: React.FC<TagSuggestionProps> = ({ tags, onSelect }) => {
  const [selected, setSelected] = React.useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setSelected(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  React.useEffect(() => {
    onSelect(selected);
  }, [selected, onSelect]);

  return (
    <div className="my-4">
      <h3 className="font-semibold mb-2">Suggested Tags</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <button
            key={tag}
            type="button"
            className={`px-3 py-1 rounded border ${selected.includes(tag) ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
};
