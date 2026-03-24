import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const criteria = [
  { id: 1, name: 'Academic Excellence', maxScore: 5, weight: 25, automatedByLLM: true },
  { id: 2, name: 'Research Experience', maxScore: 5, weight: 20, automatedByLLM: true },
  { id: 3, name: 'Leadership & Impact', maxScore: 5, weight: 20, automatedByLLM: true },
  { id: 4, name: 'Essay Quality', maxScore: 5, weight: 15, automatedByLLM: true },
  { id: 5, name: 'Recommendation Strength', maxScore: 5, weight: 15, automatedByLLM: true },
  { id: 6, name: 'Interview Performance', maxScore: 5, weight: 5, automatedByLLM: false },
];

export function RubricsSettings() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Rubrics & Criteria</h1>
        <p className="text-gray-600">Configure evaluation criteria and scoring weights</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>2025 Scholarship Cycle Rubric</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Define the criteria used for evaluating applicants</p>
            </div>
            <Button className="gap-2 bg-[#2563EB] hover:bg-[#1E3A8A]">
              <Plus className="w-4 h-4" />
              Add Criterion
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Criterion ID</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Name</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Max Score</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Weight (%)</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Automated by LLM</th>
                    <th className="text-left py-3 px-4 text-sm text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((criterion) => (
                    <tr key={criterion.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <Badge variant="outline">CR-{criterion.id.toString().padStart(3, '0')}</Badge>
                      </td>
                      <td className="py-4 px-4">{criterion.name}</td>
                      <td className="py-4 px-4">{criterion.maxScore}</td>
                      <td className="py-4 px-4">{criterion.weight}%</td>
                      <td className="py-4 px-4">
                        <Switch checked={criterion.automatedByLLM} />
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-[#2563EB] rounded-full flex items-center justify-center text-white text-xs flex-shrink-0 mt-0.5">
                  i
                </div>
                <div>
                  <p className="text-sm">
                    <strong>Total Weight:</strong> {criteria.reduce((sum, c) => sum + c.weight, 0)}%
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Criteria marked as "Automated by LLM" will be evaluated automatically when applications are submitted. 
                    Human reviewers can still override or supplement these scores.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scoring Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-600 mb-2">LLM Weight</p>
                <p className="text-2xl">40%</p>
                <p className="text-xs text-gray-500 mt-1">Weight of AI evaluation in final score</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Reviewer Weight</p>
                <p className="text-2xl">60%</p>
                <p className="text-xs text-gray-500 mt-1">Combined weight of human reviews</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Min. Reviewers</p>
                <p className="text-2xl">2</p>
                <p className="text-xs text-gray-500 mt-1">Required reviewers per application</p>
              </div>
            </div>
            
            <div className="mt-6">
              <Button variant="outline">Edit Scoring Weights</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
