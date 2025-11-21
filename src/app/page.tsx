import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-xl text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">Welcome to Visionary</CardTitle>
          <CardDescription className="text-lg text-muted-foreground pt-2">
            Explore the power of real-time computer vision models.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-foreground">
            Select a model from the navigation bar above to get started. Each page demonstrates a different TensorFlow.js model that can run directly in your browser.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
