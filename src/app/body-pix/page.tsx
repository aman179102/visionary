import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BodyPixPage() {
  return (
    <div className="flex items-center justify-center">
      <Card className="w-full max-w-xl text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">BodyPix</CardTitle>
          <CardDescription className="text-lg text-muted-foreground pt-2">
            Person Segmentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-foreground">
            This page will demonstrate the BodyPix model for segmenting people from an image or video.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
