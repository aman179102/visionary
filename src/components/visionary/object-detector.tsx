"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { Camera, Upload, Play, StopCircle, Loader2, X, Scan } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type Prediction = cocoSsd.DetectedObject;

export function ObjectDetector() {
  const { toast } = useToast();
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
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

  const drawBoundingBoxes = useCallback((detectedObjects: Prediction[]) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let source: HTMLVideoElement | HTMLImageElement | null = null;
    if (activeTab === 'webcam' && videoRef.current) {
      source = videoRef.current;
    } else if (activeTab === 'upload' && imageRef.current) {
      source = imageRef.current;
    }

    if (!source) return;

    const naturalWidth = (source instanceof HTMLVideoElement) ? source.videoWidth : source.naturalWidth;
    const naturalHeight = (source instanceof HTMLVideoElement) ? source.videoHeight : source.naturalHeight;

    canvas.width = source.clientWidth;
    canvas.height = source.clientHeight;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / naturalWidth;
    const scaleY = canvas.height / naturalHeight;

    detectedObjects.forEach((object) => {
      const [x, y, width, height] = object.bbox;
      const scaledX = x * scaleX;
      const scaledY = y * scaleY;
      const scaledWidth = width * scaleX;
      const scaledHeight = height * scaleY;
      
      // Bounding box
      ctx.strokeStyle = "hsl(var(--primary))";
      ctx.lineWidth = 2;
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

      // Label background
      ctx.fillStyle = "hsl(var(--primary))";
      const text = `${object.class} (${(object.score * 100).toFixed(1)}%)`;
      const textWidth = ctx.measureText(text).width;
      ctx.fillRect(scaledX, scaledY, textWidth + 8, 20);

      // Label text
      ctx.fillStyle = "hsl(var(--primary-foreground))";
      ctx.font = "12px 'Inter', sans-serif";
      ctx.fillText(text, scaledX + 4, scaledY + 14);
    });
  }, [activeTab]);

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
        const loadedModel = await cocoSsd.load();
        setModel(loadedModel);
      } catch (error) {
        console.error("Failed to load model:", error);
        toast({
          variant: "destructive",
          title: "Model Error",
          description: "Failed to load the COCO-SSD model. Please refresh the page.",
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
        const detectedObjects = await model.detect(videoRef.current);
        setPredictions(detectedObjects);
        drawBoundingBoxes(detectedObjects);
        animationFrameId.current = requestAnimationFrame(detectLoop);
      } catch(e) {
        console.error("Error in detection loop:", e)
      }
    }
  }, [model, drawBoundingBoxes]);

  const startWebcam = useCallback(async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setUploadedImageUrl(null);
      setPredictions([]);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
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
        const detectedObjects = await model.detect(imageRef.current);
        setPredictions(detectedObjects);
        drawBoundingBoxes(detectedObjects);
      } catch (error) {
        console.error("Error detecting objects in image:", error);
        toast({
          variant: "destructive",
          title: "Detection Error",
          description: "Could not detect objects in the uploaded image.",
        });
      }
    }
  }, [model, toast, drawBoundingBoxes]);

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
        <p className="text-lg font-semibold">Loading Object Detection Model...</p>
        <p className="text-sm text-muted-foreground">This may take a moment.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">COCO-SSD Object Detection</CardTitle>
            <CardDescription className="text-lg text-muted-foreground pt-2">
              Detects 80 common objects in images or a live webcam stream.
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
                <canvas ref={canvasRef} className="absolute top-0 left-0 z-10 w-full h-full" />
                <TabsContent value="webcam" className="w-full h-full mt-0">
                  <div className="relative w-full h-full">
                    <video ref={videoRef} className="w-full h-full object-contain" muted playsInline />
                    {!isWebcamActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                        <Camera className="w-16 h-16 text-white/50 mb-4" />
                        <p className="text-white">Webcam is off</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="upload" className="w-full h-full mt-0">
                  {uploadedImageUrl ? (
                    <div className="relative w-full h-full">
                      <Image
                        ref={imageRef}
                        src={uploadedImageUrl}
                        alt="Uploaded for object detection"
                        onLoad={detectUploadedImage}
                        fill
                        style={{ objectFit: 'contain' }}
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
                      <p>Upload an image to detect objects</p>
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
              <div className="space-y-2">
                {predictions.map((prediction, index) => (
                  <div key={`${prediction.class}-${index}`} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                    <span className="font-semibold capitalize text-secondary-foreground">{prediction.class}</span>
                    <Badge variant="outline">
                      {`${(prediction.score * 100).toFixed(1)}%`}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
                <Alert>
                  <AlertTitle>Awaiting Detection</AlertTitle>
                  <AlertDescription>
                    {activeTab === 'webcam' ? 'Start the webcam to detect objects in real-time.' : 'Upload an image to see the detected objects.'}
                  </AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
