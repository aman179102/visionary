import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function FaceLandmarksDetectionPage() {
  return (
    <div className="flex items-center justify-center">
      <Card className="w-full max-w-xl text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">Face Landmarks Detection</CardTitle>
          <CardDescription className="text-lg text-muted-foreground pt-2">
            Facial Feature Tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-foreground">
            This page will demonstrate detecting facial landmarks in real-time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
