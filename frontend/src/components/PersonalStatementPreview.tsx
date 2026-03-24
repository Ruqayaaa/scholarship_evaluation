interface PersonalStatementPreviewProps {
  statement: {
    academicBackground: string;
    careerGoals: string;
    motivation: string;
    impact: string;
  };
}

export function PersonalStatementPreview({ statement }: PersonalStatementPreviewProps) {
  const sections = [
    { title: 'Academic Background', content: statement.academicBackground },
    { title: 'Career Goals & Aspirations', content: statement.careerGoals },
    { title: 'Motivation for Applying', content: statement.motivation },
    { title: 'Impact & Community Contribution', content: statement.impact }
  ];

  const hasContent = Object.values(statement).some((content) => content.trim() !== '');

  return (
    <div className="prose max-w-none">
      {!hasContent ? (
        <div className="text-center py-12 text-gray-500">
          <p>Start filling out the sections above to preview your personal statement.</p>
          <p className="mt-2">Scholar AI will format and combine your responses automatically.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-[#1E3A8A] m-0">
              <strong>Preview Mode:</strong> This is how Scholar AI will process your personal statement. The final version may be further refined during evaluation.
            </p>
          </div>

          {sections.map((section, index) => (
            section.content.trim() && (
              <div key={index} className="mb-6">
                <h4 className="text-gray-900 mb-3">{section.title}</h4>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {section.content}
                </p>
              </div>
            )
          ))}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-gray-500 text-center">
              Combined length: {Object.values(statement).join(' ').split(/\s+/).filter(Boolean).length} words
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
