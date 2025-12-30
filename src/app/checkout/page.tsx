/**
 * Checkout Page with GPS-Based Address System
 * STRICT: User MUST select GPS location - no manual entry allowed
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AddressManager } from '@/components/AddressManager';
import type { UserAddress } from '@/types/address';
import { ShoppingCart, MapPin, AlertCircle, Loader2, CreditCard, Wallet } from 'lucide-react';

interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  variant_id?: string;
  variant_name?: string;
  flavor_id?: string;
  flavor_name?: string;
  image_url?: string;
}

type CheckoutStep = 'address' | 'payment' | 'review';

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  // State
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'points'>('cash');
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState(0);

  // Load cart items and user data
  useEffect(() => {
    loadCheckoutData();
  }, []);

  const loadCheckoutData = async () => {
    try {
      setIsLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?redirect=/checkout');
        return;
      }

      // Load cart from localStorage
      const cartData = localStorage.getItem('cart');
      if (!cartData) {
        router.push('/cart');
        return;
      }

      const cart = JSON.parse(cartData);
      setCartItems(cart);

      // Load user points
      const { data: userData } = await supabase
        .from('users')
        .select('points')
        .eq('id', user.id)
        .single();

      if (userData) {
        setUserPoints(userData.points || 0);
      }
    } catch (err: any) {
      console.error('Error loading checkout data:', err);
      setError(err.message || 'Failed to load checkout data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.product_price * item.quantity,
      0
    );
    const deliveryFee = 5000; // 5000 SYP
    const total = subtotal + deliveryFee;

    return { subtotal, deliveryFee, total };
  };

  const handleAddressSelected = (address: UserAddress) => {
    setSelectedAddress(address);
  };

  const handleContinueToPayment = () => {
    if (!selectedAddress) {
      alert('Please select a delivery address');
      return;
    }
    setCurrentStep('payment');
  };

  const handleContinueToReview = () => {
    setCurrentStep('review');
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      alert('Please select a delivery address');
      return;
    }

    try {
      setIsPlacingOrder(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { subtotal, deliveryFee, total } = calculateTotals();

      // Check if user has enough points
      if (paymentMethod === 'points' && userPoints < total) {
        throw new Error('Insufficient points');
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_price: total,
          delivery_fee: deliveryFee,
          status: 'pending',
          address_text: `${selectedAddress.street}, ${selectedAddress.neighborhood || ''}, ${selectedAddress.city}`,
          lat: selectedAddress.latitude,
          lng: selectedAddress.longitude,
          notes: selectedAddress.address_details,
          payment_method: paymentMethod,
          points_used: paymentMethod === 'points' ? total : 0,
          cash_amount: paymentMethod === 'cash' ? total : 0,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        qty: item.quantity,
        price_at_order: item.product_price,
        variant_id: item.variant_id,
        flavor_id: item.flavor_id,
        payment_method: paymentMethod,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart
      localStorage.removeItem('cart');

      // Redirect to order confirmation
      router.push(`/orders/${order.id}?success=true`);
    } catch (err: any) {
      console.error('Error placing order:', err);
      setError(err.message || 'Failed to place order');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const { subtotal, deliveryFee, total } = calculateTotals();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some products to your cart first</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <div className="flex items-center gap-4">
            <StepIndicator
              step={1}
              label="Address"
              isActive={currentStep === 'address'}
              isCompleted={currentStep !== 'address'}
            />
            <div className="flex-1 h-0.5 bg-gray-300" />
            <StepIndicator
              step={2}
              label="Payment"
              isActive={currentStep === 'payment'}
              isCompleted={currentStep === 'review'}
            />
            <div className="flex-1 h-0.5 bg-gray-300" />
            <StepIndicator
              step={3}
              label="Review"
              isActive={currentStep === 'review'}
              isCompleted={false}
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          {/* Step 1: Address Selection */}
          {currentStep === 'address' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Select Delivery Address
              </h2>
              <AddressManager
                mode="selection"
                onAddressSelected={handleAddressSelected}
                selectedAddressId={selectedAddress?.id}
              />
              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={handleContinueToPayment}
                  disabled={!selectedAddress}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Payment Method */}
          {currentStep === 'payment' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Payment Method
              </h2>
              <div className="space-y-4 mb-6">
                {/* Cash Payment */}
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`w-full p-4 border-2 rounded-lg transition-all flex items-center gap-4 ${
                    paymentMethod === 'cash'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CreditCard className="w-6 h-6 text-gray-600" />
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900">Cash on Delivery</p>
                    <p className="text-sm text-gray-600">Pay when you receive your order</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    paymentMethod === 'cash'
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`} />
                </button>

                {/* Points Payment */}
                <button
                  onClick={() => setPaymentMethod('points')}
                  disabled={userPoints < total}
                  className={`w-full p-4 border-2 rounded-lg transition-all flex items-center gap-4 ${
                    paymentMethod === 'points'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${userPoints < total ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Wallet className="w-6 h-6 text-gray-600" />
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900">Pay with Points</p>
                    <p className="text-sm text-gray-600">
                      Available: {userPoints.toLocaleString()} points
                      {userPoints < total && (
                        <span className="text-red-600 ml-2">(Insufficient)</span>
                      )}
                    </p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    paymentMethod === 'points'
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`} />
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('address')}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleContinueToReview}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Continue to Review
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Place Order */}
          {currentStep === 'review' && selectedAddress && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Review Your Order
              </h2>

              {/* Delivery Address */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Delivery Address
                </h3>
                <p className="text-sm text-gray-700 mb-1 capitalize">
                  <span className="font-medium">{selectedAddress.label}</span>
                </p>
                <p className="text-sm text-gray-700">
                  {selectedAddress.street}, {selectedAddress.neighborhood}, {selectedAddress.city}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedAddress.address_details}
                </p>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                        {item.variant_name && (
                          <p className="text-sm text-gray-600">{item.variant_name}</p>
                        )}
                        {item.flavor_name && (
                          <p className="text-sm text-gray-600">{item.flavor_name}</p>
                        )}
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {(item.product_price * item.quantity).toLocaleString()} SYP
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Summary */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">{subtotal.toLocaleString()} SYP</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span className="text-gray-900">{deliveryFee.toLocaleString()} SYP</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium pt-2 border-t">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">{total.toLocaleString()} SYP</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Payment Method: <span className="font-medium capitalize">{paymentMethod}</span>
                  {paymentMethod === 'points' && (
                    <span className="ml-2">({total.toLocaleString()} points)</span>
                  )}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('payment')}
                  disabled={isPlacingOrder}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={isPlacingOrder}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {isPlacingOrder ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    'Place Order'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary (Sidebar) */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">{subtotal.toLocaleString()} SYP</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivery</span>
              <span className="text-gray-900">{deliveryFee.toLocaleString()} SYP</span>
            </div>
            <div className="flex justify-between text-base font-semibold pt-2 border-t">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">{total.toLocaleString()} SYP</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            By placing an order, you agree to our terms and conditions
          </p>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({
  step,
  label,
  isActive,
  isCompleted,
}: {
  step: number;
  label: string;
  isActive: boolean;
  isCompleted: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
          isCompleted
            ? 'bg-green-500 text-white'
            : isActive
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-600'
        }`}
      >
        {isCompleted ? '✓' : step}
      </div>
      <span
        className={`text-xs mt-1 font-medium ${
          isActive ? 'text-blue-600' : 'text-gray-600'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
