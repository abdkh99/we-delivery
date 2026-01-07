"use client";
import Lottie from "lottie-react";
import animationData from "../animations/DeliveryTruck _Loading _Exporting.json";

export default function LoadingAnimation() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Lottie
          animationData={animationData}
          loop={true}
          style={{ width: 350, height: 350 }}
        />
        <p className="mt-4 text-gray-600 text-xl font-semibold">
          جاري التحميل...
        </p>
      </div>
    </div>
  );
}
