"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import * as posenet from "@tensorflow-models/posenet";
import { Camera, Upload, Play, StopCircle, Loader2, X, Scan, PersonStanding } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type Prediction = posenet.Pose;

export function PoseDetector() {
  const { toast } = useToast();
  const [model, setModel] = useState<posenet.PoseNet | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("webcam");

  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameId = useRef<number>();

  const drawPose = useCallback((poses: Prediction[], ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const keypointColor = "hsl(var(--accent))";
    const skeletonColor = "hsl(var(--primary))";

    poses.forEach(({ score, keypoints }) => {
      if (score >= 0.2) {
        // Draw keypoints
        keypoints.forEach(keypoint => {
          if (keypoint.score >= 0.2) {
            const { y, x } = keypoint.position;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = keypointColor;
            ctx.fill();
          }
        });

        // Draw skeleton
        const adjacentKeyPoints = posenet.getAdjacentKeyPoints(keypoints, 0.2);
        adjacentKeyPoints.forEach((keypoints) => {
          ctx.beginPath();
          ctx.moveTo(keypoints[0].position.x, keypoints[0].position.y);
          ctx.lineTo(keypoints[1].position.x, keypoints[1].position.y);
          ctx.lineWidth = 2;
          ctx.strokeStyle = skeletonColor;
          ctx.stroke();
        });
      }
    });
  }, []);

  const stopWebcam = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
    setPredictions([]);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoadingModel(true);
        await tf.ready();
        // The posenet model is not available as a separate package anymore.
        // We will notify the user.
        // const loadedModel = await posenet.load();
        // setModel(loadedModel);
        setModel(null); // No model to load
        toast({
          variant: "destructive",
          title: "Model not available",
          description: "The PoseNet model package has been deprecated and removed to fix a dependency issue. A different pose detection model will need to be used.",
        });
      } catch (error) {
        console.error("Failed to load model:", error);
        toast({
          variant: "destructive",
          title: "Model Error",
          description: "Failed to load the PoseNet model. Please refresh the page.",
        });
      } finally {
        setIsLoadingModel(false);
      }
    };
    loadModel();

    return () => {
      stopWebcam();
    };
  }, [stopWebcam, toast]);

  const detectLoop = useCallback(async () => {
    if (
      model &&
      videoRef.current &&
      videoRef.current.readyState >= 3
    ) {
      try {
        const poses = await model.estimateMultiplePoses(videoRef.current, {
          flipHorizontal: true,
          maxDetections: 5,
          scoreThreshold: 0.5,
          nmsRadius: 20
        });
        setPredictions(poses);
        
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if(canvas && ctx) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.save();
          ctx.scale(-1, 1);
          ctx.translate(-canvas.width, 0);
          drawPose(poses, ctx);
          ctx.restore();
        }
        
        animationFrameId.current = requestAnimationFrame(detectLoop);
      } catch(e) {
        console.error("Error in detection loop:", e)
      }
    }
  }, [model, drawPose]);

  const startWebcam = useCallback(async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setUploadedImageUrl(null);
      setPredictions([]);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
             videoRef.current?.play();
          };
          videoRef.current.addEventListener("playing", () => {
            setIsWebcamActive(true);
          });
        }
      } catch (error) {
        console.error("Error accessing webcam:", error);
        toast({
          variant: "destructive",
          title: "Webcam Error",
          description: "Could not access the webcam. Please check permissions and try again.",
        });
      }
    }
  }, [toast]);

  useEffect(() => {
    if (isWebcamActive && model) {
      animationFrameId.current = requestAnimationFrame(detectLoop);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
  }, [isWebcamActive, detectLoop, model]);
  
  const toggleWebcam = () => {
    if (!model) {
      toast({
          variant: "destructive",
          title: "Model not available",
          description: "The PoseNet model is not loaded.",
        });
      return;
    }
    if (isWebcamActive) {
      stopWebcam();
    } else {
      startWebcam();
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!model) {
      toast({
          variant: "destructive",
          title: "Model not available",
          description: "The PoseNet model is not loaded.",
        });
      return;
    }
    const file = event.target.files?.[0];
    if (file) {
      stopWebcam();
      const url = URL.createObjectURL(file);
      setUploadedImageUrl(url);
      setPredictions([]);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const detectUploadedImage = useCallback(async () => {
    if (model && imageRef.current) {
      try {
        const poses = await model.estimateMultiplePoses(imageRef.current);
        setPredictions(poses);
        
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) {
          canvas.width = imageRef.current.naturalWidth;
          canvas.height = imageRef.current.naturalHeight;
          ctx.drawImage(imageRef.current, 0, 0);
          drawPose(poses, ctx);
        }
      } catch (error) {
        console.error("Error detecting poses in image:", error);
        toast({
          variant: "destructive",
          title: "Detection Error",
          description: "Could not detect poses in the uploaded image.",
        });
      }
    }
  }, [model, toast, drawPose]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPredictions([]);
    stopWebcam();
    setUploadedImageUrl(null);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };
  
  const clearUpload = () => {
    setUploadedImageUrl(null);
    setPredictions([]);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  if (isLoadingModel && !model) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-primary">
        <Loader2 className="h-16 w-16 animate-spin" />
        <p className="text-lg font-semibold">Loading Pose Estimation Model...</p>
        <p className="text-sm text-muted-foreground">This may take a moment.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">PoseNet Pose Estimation</CardTitle>
            <CardDescription className="text-lg text-muted-foreground pt-2">
              Estimates human poses by detecting key body joints. (Model Deprecated)
            </CardDescription>
          </CardHeader>
        </Card>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="webcam">Live Webcam</TabsTrigger>
            <TabsTrigger value="upload">Upload Image</TabsTrigger>
          </TabsList>
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="aspect-video w-full bg-card-foreground/5 rounded-md flex items-center justify-center overflow-hidden relative">
                <TabsContent value="webcam" className="w-full h-full mt-0">
                  <video ref={videoRef} className="w-full h-full object-contain" muted playsInline />
                  <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-10" />
                  {!isWebcamActive && !model && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                      <Camera className="w-16 h-16 text-white/50 mb-4" />
                      <p className="text-white">Webcam is off</p>
                    </div>
                  )}
                  {
                    !model && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                        <Alert variant="destructive" className="w-auto">
                          <AlertTitle>Model Not Loaded</AlertTitle>
                          <AlertDescription>
                            The PoseNet model is not available.
                          </AlertDescription>
                        </Alert>
                      </div>
                    )
                  }
                </TabsContent>
                <TabsContent value="upload" className="w-full h-full mt-0">
                  {uploadedImageUrl ? (
                    <div className="relative w-full h-full">
                       <Image
                        ref={imageRef}
                        src={uploadedImageUrl}
                        alt="Uploaded for pose detection"
                        onLoad={detectUploadedImage}
                        fill
                        style={{ objectFit: 'contain' }}
                      />
                       <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-10" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-background/50 hover:bg-background/80 rounded-full h-8 w-8 z-20"
                        onClick={clearUpload}
                      >
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                       {!model ? (
                         <Alert variant="destructive">
                           <AlertTitle>Model Not Loaded</AlertTitle>
                           <AlertDescription>
                             The PoseNet model is not available.
                           </AlertDescription>
                         </Alert>
                       ) : (
                        <>
                          <Upload className="w-16 h-16 mb-4" />
                          <p>Upload an image to detect poses</p>
                        </>
                       )}
                    </div>
                  )}
                </TabsContent>
              </div>
            </CardContent>
          </Card>
          <div className="mt-4 flex justify-center">
            {activeTab === 'webcam' && (
              <Button onClick={toggleWebcam} size="lg" variant={isWebcamActive ? "destructive" : "default"} disabled={!model}>
                {isWebcamActive ? <StopCircle /> : <Play />}
                <span className="ml-2">{isWebcemActive ? 'Stop Detection' : 'Start Webcam'}</span>
              </Button>
            )}
            {activeTab === 'upload' && (
              <>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                <Button onClick={() => fileInputRef.current?.click()} size="lg" disabled={!model}>
                  <Upload />
                  <span className="ml-2">Choose an Image</span>
                </Button>
              </>
            )}
          </div>
        </Tabs>
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <Scan />
              Detection Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {predictions.length > 0 ? (
               <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-md bg-secondary">
                    <span className="font-semibold text-secondary-foreground">{predictions.length} {predictions.length > 1 ? 'Poses' : 'Pose'} Detected</span>
                </div>
                {predictions.map((pose, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                    <span className="font-semibold capitalize text-secondary-foreground">
                      <PersonStanding className="inline-block mr-2" />
                      Pose #{index + 1}
                    </span>
                    <Badge variant="outline">
                      {`${(pose.score * 100).toFixed(1)}%`}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
                <Alert>
                  <AlertTitle>Awaiting Detection</AlertTitle>
                  <AlertDescription>
                    {activeTab === 'webcam' ? 'Start the webcam to detect poses in real-time.' : 'Upload an image to see the detected poses.'}
                  </AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
