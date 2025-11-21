import { Progress } from "@/components/ui/progress";

export interface Prediction {
  className: string;
  probability: number;
}

interface PredictionListProps {
  predictions: Prediction[];
}

export function PredictionList({ predictions }: PredictionListProps) {
  if (!predictions || predictions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>No predictions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {predictions.map((prediction, index) => (
        <div key={index} className="w-full">
          <div className="flex justify-between items-center mb-1 text-sm">
            <span className="font-medium text-foreground capitalize">
              {prediction.className.split(',')[0]}
            </span>
            <span className="font-mono text-accent">
              {(prediction.probability * 100).toFixed(2)}%
            </span>
          </div>
          <Progress
            value={prediction.probability * 100}
            className="h-2"
            indicatorClassName="bg-accent"
          />
        </div>
      ))}
    </div>
  );
}
