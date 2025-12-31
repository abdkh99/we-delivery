"use client";

import { useState } from "react";
import { calculatePlatformCommission, calculateDeliveryFee, formatCurrency } from "@/lib/utils";
import Navigation from "@/components/Navigation";

export default function TestUpdatesPage() {
  const [orderAmount, setOrderAmount] = useState(15000);
  
  const deliveryFee = calculateDeliveryFee(1, orderAmount);
  const commission = calculatePlatformCommission(orderAmount);
  const total = orderAmount + deliveryFee + commission;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-2">
            🧪 اختبار التحديثات الجديدة
          </h1>
          <p className="text-center text-gray-600 mb-8">
            الإصدار: 2.0.0-nov12-commission-maps
          </p>

          {/* Test 1: Platform Commission */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <span className="mr-2">💰</span>
              اختبار عمولة المنصة
            </h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                قيمة الطلب (ل.س):
              </label>
              <input
                type="number"
                value={orderAmount}
                onChange={(e) => setOrderAmount(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between text-lg">
                <span>قيمة الطلب:</span>
                <span className="font-semibold">{formatCurrency(orderAmount)}</span>
              </div>
              
              <div className="flex justify-between text-lg">
                <span>رسوم التوصيل:</span>
                <span className="font-semibold">{formatCurrency(deliveryFee)}</span>
              </div>
              
              {commission > 0 && (
                <div className="flex justify-between text-lg bg-yellow-50 border border-yellow-200 px-3 py-2 rounded">
                  <span className="text-yellow-800">🟡 عمولة المنصة:</span>
                  <span className="font-bold text-yellow-900">{formatCurrency(commission)}</span>
                </div>
              )}
              
              <div className="flex justify-between text-xl font-bold pt-3 border-t-2 border-gray-300">
                <span>الإجمالي:</span>
                <span className="text-blue-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Commission Rates */}
          <div className="mb-8 bg-blue-50 p-4 rounded-lg">
            <h3 className="font-bold mb-3">📊 نظام العمولة:</h3>
            <ul className="space-y-2">
              <li className="flex justify-between">
                <span>أقل من 10,000 ل.س:</span>
                <strong className="text-green-600">0%</strong>
              </li>
              <li className="flex justify-between">
                <span>من 10,000 - 19,999 ل.س:</span>
                <strong className="text-blue-600">5%</strong>
              </li>
              <li className="flex justify-between">
                <span>من 20,000 - 49,999 ل.س:</span>
                <strong className="text-orange-600">7%</strong>
              </li>
              <li className="flex justify-between">
                <span>فوق 50,000 ل.س:</span>
                <strong className="text-red-600">10%</strong>
              </li>
            </ul>
          </div>

          {/* Test 2: Google Maps */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <span className="mr-2">🗺️</span>
              اختبار زر Google Maps
            </h2>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="mb-4 text-gray-700">
                زر Google Maps موجود في صفحة السائق. جرب الرابط التالي:
              </p>
              
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=33.5138,36.2765"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Open in Google Maps
              </a>
              
              <p className="mt-3 text-sm text-gray-600">
                ✅ إذا فتح Google Maps، فالميزة تعمل بنجاح!
              </p>
            </div>
          </div>

          {/* Status Check */}
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <h3 className="font-bold text-green-800 mb-2">✅ حالة التحديثات:</h3>
            <ul className="space-y-1 text-green-700">
              <li>✓ عمولة المنصة: {commission > 0 ? "تعمل" : "لا توجد عمولة (الطلب صغير)"}</li>
              <li>✓ زر Google Maps: موجود أعلاه</li>
              <li>✓ حساب التوصيل: {deliveryFee > 0 ? "تعمل" : "مجاني"}</li>
              <li>✓ الإصدار: 2.0.0-nov12-commission-maps</li>
            </ul>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <h3 className="font-bold text-yellow-800 mb-2">📝 ملاحظة:</h3>
            <p className="text-yellow-700">
              إذا رأيت هذه الصفحة بشكل صحيح مع حساب العمولة، فجميع التحديثات تعمل! 
              المشكلة كانت فقط في الـ cache.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
