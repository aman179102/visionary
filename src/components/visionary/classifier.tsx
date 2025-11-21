"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import { Camera, Upload, Play, StopCircle, Loader2, X } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PredictionList, type Prediction } from "./prediction-list";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function Classifier() {
  const { toast } = useToast();
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("webcam");

  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameId = useRef<number>();

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
  }, []);

  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoadingModel(true);
        await tf.ready();
        const loadedModel = await mobilenet.load();
        setModel(loadedModel);
      } catch (error) {
        console.error("Failed to load model:", error);
        toast({
          variant: "destructive",
          title: "Model Error",
          description: "Failed to load the Visionary AI model. Please refresh the page.",
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

  const classifyLoop = useCallback(async () => {
    if (
      model &&
      videoRef.current &&
      videoRef.current.readyState === 4 
    ) {
      try {
        const predictions = await model.classify(videoRef.current);
        setPredictions(predictions);
        animationFrameId.current = requestAnimationFrame(classifyLoop);
      } catch(e) {
        console.error("Error in classification loop:", e)
      }
    }
  }, [model]);

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
      animationFrameId.current = requestAnimationFrame(classifyLoop);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
  }, [isWebcamActive, classifyLoop]);
  
  const toggleWebcam = () => {
    if (isWebcamActive) {
      stopWebcam();
      setPredictions([]);
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
    }
  };

  const classifyUploadedImage = useCallback(async () => {
    if (model && imageRef.current) {
      try {
        const predictions = await model.classify(imageRef.current);
        setPredictions(predictions);
      } catch (error) {
        console.error("Error classifying image:", error);
        toast({
          variant: "destructive",
          title: "Classification Error",
          description: "Could not classify the uploaded image.",
        });
      }
    }
  }, [model, toast]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPredictions([]);
    if (value === "webcam" && isWebcamActive) {
      // do nothing if webcam is already active
    } else {
      stopWebcam();
    }
    if (value === "upload") {
      setUploadedImageUrl(null);
    }
  };

  if (isLoadingModel) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-primary">
        <Loader2 className="h-16 w-16 animate-spin" />
        <p className="text-lg font-semibold">Loading Visionary AI Model...</p>
        <p className="text-sm text-muted-foreground">Please wait a moment.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="webcam">Live Webcam</TabsTrigger>
            <TabsTrigger value="upload">Upload Image</TabsTrigger>
          </TabsList>
          <Card className="mt-4">
            <CardContent className="p-4">
              <div className="aspect-video w-full bg-card-foreground/5 rounded-md flex items-center justify-center overflow-hidden">
                <TabsContent value="webcam" className="w-full h-full mt-0">
                  <div className="relative w-full h-full">
                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
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
                        alt="Uploaded image for classification"
                        onLoad={classifyUploadedImage}
                        fill
                        style={{ objectFit: 'contain' }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-background/50 hover:bg-background/80 rounded-full h-8 w-8"
                        onClick={() => {
                          setUploadedImageUrl(null);
                          setPredictions([]);
                        }}
                      >
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Upload className="w-16 h-16 mb-4" />
                      <p>Upload an image to classify</p>
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
                <span className="ml-2">{isWebcamActive ? 'Stop Classification' : 'Start Webcam'}</span>
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
        <Card className="sticky top-8">
          <CardHeader>
            <CardTitle className="text-primary">Classification Results</CardTitle>
          </CardHeader>
          <CardContent>
            {predictions.length > 0 ? (
              <PredictionList predictions={predictions} />
            ) : (
                <Alert>
                  <AlertTitle>Awaiting Analysis</AlertTitle>
                  <AlertDescription>
                    {activeTab === 'webcam' ? 'Start the webcam or ensure it has a clear view.' : 'Upload an image to see the classification results.'}
                  </AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
