"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import * as handpose from "@tensorflow-models/handpose";
import { Camera, Upload, Play, StopCircle, Loader2, X, Scan, Hand } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type Prediction = handpose.HandPose;

// Define connections between landmarks to draw the hand skeleton
const FINGER_LOOKUP = {
  thumb: [0, 1, 2, 3, 4],
  indexFinger: [0, 5, 6, 7, 8],
  middleFinger: [0, 9, 10, 11, 12],
  ringFinger: [0, 13, 14, 15, 16],
  pinky: [0, 17, 18, 19, 20],
};

export function HandDetector() {
  const { toast } = useToast();
  const [model, setModel] = useState<handpose.HandPoseModel | null>(null);
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

  const drawHand = useCallback((detectedHands: Prediction[], ctx: CanvasRenderingContext2D) => {
    // Draw lines between connected landmarks
    ctx.strokeStyle = "hsl(var(--primary))";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    
    for (const hand of detectedHands) {
      const landmarks = hand.landmarks as [number, number, number][];

      // Draw connections
      for (const finger of Object.values(FINGER_LOOKUP)) {
        for (let i = 0; i < finger.length - 1; i++) {
          const start = landmarks[finger[i]];
          const end = landmarks[finger[i + 1]];
          ctx.beginPath();
          ctx.moveTo(start[0], start[1]);
          ctx.lineTo(end[0], end[1]);
          ctx.stroke();
        }
      }

      // Draw landmark dots
      ctx.fillStyle = "hsl(var(--accent))";
      for (const landmark of landmarks) {
        ctx.beginPath();
        ctx.arc(landmark[0], landmark[1], 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
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
        const loadedModel = await handpose.load();
        setModel(loadedModel);
      } catch (error) {
        console.error("Failed to load model:", error);
        toast({
          variant: "destructive",
          title: "Model Error",
          description: "Failed to load the Handpose model. Please refresh the page.",
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
        const detectedHands = await model.estimateHands(videoRef.current);
        
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if(canvas && ctx) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawHand(detectedHands, ctx);
        }
        setPredictions(detectedHands);
        
        animationFrameId.current = requestAnimationFrame(detectLoop);
      } catch(e) {
        console.error("Error in detection loop:", e)
      }
    }
  }, [model, drawHand]);

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
    if (isWebcamActive) {
      animationFrameId.current = requestAnimationFrame(detectLoop);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
  }, [isWebcamActive, detectLoop]);
  
  const toggleWebcam = () => {
    if (isWebcamActive) {
      stopWebcam();
    } else {
      startWebcam();
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
        const detectedHands = await model.estimateHands(imageRef.current);
        setPredictions(detectedHands);
        
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) {
          canvas.width = imageRef.current.naturalWidth;
          canvas.height = imageRef.current.naturalHeight;
          ctx.drawImage(imageRef.current, 0, 0);
          drawHand(detectedHands, ctx);
        }
      } catch (error) {
        console.error("Error detecting hands in image:", error);
        toast({
          variant: "destructive",
          title: "Detection Error",
          description: "Could not detect hands in the uploaded image.",
        });
      }
    }
  }, [model, toast, drawHand]);

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

  if (isLoadingModel) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-primary">
        <Loader2 className="h-16 w-16 animate-spin" />
        <p className="text-lg font-semibold">Loading Hand Tracking Model...</p>
        <p className="text-sm text-muted-foreground">This may take a moment.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">Handpose Detection</CardTitle>
            <CardDescription className="text-lg text-muted-foreground pt-2">
              Detects hands and predicts 21 keypoints in real-time.
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
                <canvas ref={canvasRef} className="absolute top-0 left-0 z-10" />
                <TabsContent value="webcam" className="w-full h-full mt-0">
                  <video ref={videoRef} className="w-full h-full object-contain scale-x-[-1]" muted playsInline />
                  {!isWebcamActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                      <Camera className="w-16 h-16 text-white/50 mb-4" />
                      <p className="text-white">Webcam is off</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="upload" className="w-full h-full mt-0">
                  {uploadedImageUrl ? (
                    <div className="relative w-full h-full">
                       <Image
                        ref={imageRef}
                        src={uploadedImageUrl}
                        alt="Uploaded for hand detection"
                        onLoad={detectUploadedImage}
                        fill
                        style={{ objectFit: 'contain', visibility: 'hidden' }}
                      />
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
                      <Upload className="w-16 h-16 mb-4" />
                      <p>Upload an image to detect hands</p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </CardContent>
          </Card>
          <div className="mt-4 flex justify-center">
            {activeTab === 'webcam' && (
              <Button onClick={toggleWebcam} size="lg" variant={isWebcamActive ? "destructive" : "default"}>
                {isWebcamActive ? <StopCircle /> : <Play />}
                <span className="ml-2">{isWebcamActive ? 'Stop Detection' : 'Start Webcam'}</span>
              </Button>
            )}
            {activeTab === 'upload' && (
              <>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                <Button onClick={() => fileInputRef.current?.click()} size="lg">
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
               <div className="flex items-center justify-center p-4 rounded-md bg-secondary">
                  <Hand className="w-6 h-6 mr-2 text-secondary-foreground"/>
                  <span className="font-semibold text-secondary-foreground">{predictions.length} {predictions.length > 1 ? 'Hands' : 'Hand'} Detected</span>
              </div>
            ) : (
                <Alert>
                  <AlertTitle>Awaiting Detection</AlertTitle>
                  <AlertDescription>
                    {activeTab === 'webcam' ? 'Start the webcam to detect hands in real-time.' : 'Upload an image to see the detected hands.'}
                  </AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
