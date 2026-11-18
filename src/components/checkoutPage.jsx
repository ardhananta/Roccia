import React, { useEffect, useState } from "react";
import { useCart } from "../components/CartContext";
import { useAuth } from "../api/authContext";
import {
  createOrder,
  createPayment,
  getPaymentMethods,
  getShippingMethods,
} from "../api/orderApi";

const CheckoutPage = () => {
  const { cartItems, total, increaseQty, decreaseQty, clearCart } = useCart();
  const { token, user } = useAuth();

  const [shippingMethods, setShippingMethods] = useState([]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState(null);
  const [shippingCost, setShippingCost] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const [shippingAddress, setShippingAddress] = useState({
    first_name: "",
    last_name: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    country: "Indonesia",
    phone_number: "",
  });

  const [billingAddress, setBillingAddress] = useState({
    first_name: "",
    last_name: "",
    address: "",
    appartment_suite: "",
    city: "",
    province: "",
    postal_code: "",
    country: "Indonesia",
    phone_number: "",
  });

  const isJawaProvince = (province) => {
    if (!province) return false;
    const jawaProvinces = [
      "DKI Jakarta",
      "Jakarta",
      "Jawa Barat",
      "Jawa Tengah",
      "Jawa Timur",
      "DI Yogyakarta",
      "Yogyakarta",
    ].map((p) => p.toLowerCase());

    return jawaProvinces.includes(province.toLowerCase());
  };

  const calculateShippingCost = (methodPrice, isJawa) => {
    const basePrice = Number(methodPrice) || 0;
    const surcharge = isJawa ? 10000 : 50000;
    return basePrice + surcharge;
  };

  useEffect(() => {
    if (token) {
      loadShippingMethods();
      loadPaymentMethods();
    }
  }, [token]);

  useEffect(() => {
    const isJawa = isJawaProvince(shippingAddress.province);
    if (!selectedShippingMethod) return;

    const method = shippingMethods.find(
      (m) => m.id === selectedShippingMethod
    );

    if (method) {
      setShippingCost(calculateShippingCost(method.price, isJawa));
    }
  }, [shippingAddress.province, selectedShippingMethod, shippingMethods]);

  const handleShippingAddressChange = (field, value) => {
    setShippingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleBillingAddressChange = (field, value) => {
    setBillingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const loadShippingMethods = async () => {
    const methods = await getShippingMethods();
    setShippingMethods(methods);

    if (methods.length > 0) {
      setSelectedShippingMethod(methods[0].id);
    }
  };

  const loadPaymentMethods = async () => {
    const methods = await getPaymentMethods();
    setPaymentMethods(methods);

    if (methods.length > 0) {
      setSelectedPaymentMethod(methods[0].id);
    }
  };

  const loadMidtransScript = () => {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(
        'script[src*="midtrans.com/snap/snap.js"]'
      );

      if (existing) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
      script.setAttribute("data-client-key", import.meta.env.VITE_MIDTRANS_CLIENT_KEY);
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error("Gagal memuat Midtrans Snap script"));
      document.head.appendChild(script);
    });
  };

  const isFormComplete = () => {
    return (
      cartItems.length > 0 &&
      Object.values(shippingAddress).every((value) => value?.toString().trim() !== "") &&
      Object.values(billingAddress).every((value) => value?.toString().trim() !== "") &&
      selectedShippingMethod &&
      selectedPaymentMethod
    );
  };

  const handleCheckout = async () => {
    if (!token) {
      setPaymentStatus("not-authenticated");
      return;
    }

    if (!isFormComplete()) {
      setPaymentStatus("form-incomplete");
      return;
    }

    setIsProcessing(true);

    try {
      const orderPayload = {
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        shipping_method_id: selectedShippingMethod,
        total_price: total + shippingCost,
        items: cartItems.map((item) => ({
          product_variant_id: item.product_variant_id,
          quantity: item.quantity,
          price: item.price,
        })),
      };

      const orderResponse = await createOrder(token, orderPayload);

      if (!orderResponse.isSuccess) {
        setPaymentStatus("order-failed");
        setIsProcessing(false);
        return;
      }

      const orderId = orderResponse.data.order_id;
      const paymentPayload = {
        order_id: orderId,
        payment_method: selectedPaymentMethod,
      };

      const paymentResponse = await createPayment(token, paymentPayload);

      if (!paymentResponse.isSuccess) {
        setPaymentStatus("payment-failed");
        setIsProcessing(false);
        return;
      }

      const snapToken = paymentResponse.data.snap_token;

      await loadMidtransScript();

      if (window.snap) {
        window.snap.pay(snapToken, {
          onSuccess: (result) => {
            setPaymentStatus("success");
            clearCart();
          },
          onPending: (result) => {
            setPaymentStatus("pending");
          },
          onError: (result) => {
            setPaymentStatus("error");
          },
          onClose: () => {
            setPaymentStatus("closed");
          },
        });
      } else {
        setPaymentStatus("snap-not-loaded");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setPaymentStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateTotal = () => total + shippingCost;

  return (
    <>
      <div className="p-6 md:p-8 max-w-screen-xl mx-auto">
        <h1 className="text-3xl font-semibold">Shopping Cart</h1>
      </div>

      <div className="flex flex-col lg:flex-row justify-between px-6 md:px-10 gap-6 max-w-screen-xl mx-auto">
        <div className="w-full lg:w-1/2">
          <div className="mb-6 space-y-4">
            {cartItems.length === 0 ? (
              <p className="text-gray-500">Keranjang kosong.</p>
            ) : (
              cartItems.map((item) => (
                <div
                  key={`cart-${item.product_variant_id}-${item.slug || item.name}`}
                  className="rounded-xl border border-red-600 p-4 md:p-5"
                >
                  <div className="flex flex-col sm:flex-row">
                    <div className="w-full sm:w-32 mb-4 sm:mb-0">
                      <img
                        src={item.usage_image || item.image_url}
                        alt={item.name}
                        className="w-full rounded-lg object-cover h-32"
                      />
                    </div>
                    <div className="flex-1 sm:ml-5">
                      <div className="flex justify-between">
                        <h1 className="text-lg md:text-xl font-semibold">
                          {item.name}
                        </h1>
                        <h1 className="opacity-70 text-sm md:text-base">
                          Rp.{item.price.toLocaleString("id-ID")}
                        </h1>
                      </div>
                      <h1 className="text-sm mt-2">Qty:</h1>
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              decreaseQty(item.slug || item.product_variant_id)
                            }
                            className="px-2 py-1 border border-red-500 rounded hover:bg-red-50"
                          >
                            −
                          </button>
                          <span className="w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() =>
                              increaseQty(item.slug || item.product_variant_id)
                            }
                            className="px-2 py-1 border border-red-500 rounded hover:bg-red-50"
                          >
                            +
                          </button>
                        </div>
                        <h1 className="font-semibold text-sm md:text-base">
                          Rp.{(item.price * item.quantity).toLocaleString("id-ID")}
                        </h1>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-xl border border-red-600 p-4 md:p-5">
            <div className="flex justify-between py-2 text-base md:text-lg">
              <h1>Subtotal</h1>
              <h1>Rp.{total.toLocaleString("id-ID")}</h1>
            </div>
            <div className="flex justify-between py-2 text-base md:text-lg">
              <h1>Pengiriman</h1>
              <h1>
                {shippingCost === 0
                  ? "Gratis"
                  : `Rp.${shippingCost.toLocaleString("id-ID")}`}
              </h1>
            </div>
            <hr className="border-red-500 my-3" />
            <div className="flex justify-between py-2 font-semibold text-base md:text-lg">
              <h1>Total</h1>
              <h1>Rp.{calculateTotal().toLocaleString("id-ID")}</h1>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2">
          <div className="border bg-gray-400/20 rounded-xl p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-6">
              Detail Pengiriman
            </h2>

            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3">Alamat Pengiriman</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <label>
                  <span className="text-xs font-semibold">Nama Depan</span>
                  <input
                    type="text"
                    placeholder="Nama Depan"
                    className="w-full border border-red-500 rounded-lg p-2 text-sm"
                    value={shippingAddress.first_name}
                    onChange={(e) =>
                      handleShippingAddressChange("first_name", e.target.value)
                    }
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold">Nama Belakang</span>
                  <input
                    type="text"
                    placeholder="Nama Belakang"
                    className="w-full border border-red-500 rounded-lg p-2 text-sm"
                    value={shippingAddress.last_name}
                    onChange={(e) =>
                      handleShippingAddressChange("last_name", e.target.value)
                    }
                  />
                </label>
              </div>
              <label>
                <span className="text-xs font-semibold">Alamat</span>
                <input
                  type="text"
                  placeholder="Alamat Lengkap"
                  className="w-full border border-red-500 rounded-lg p-2 text-sm mb-3"
                  value={shippingAddress.address}
                  onChange={(e) =>
                    handleShippingAddressChange("address", e.target.value)
                  }
                />
              </label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <label>
                  <span className="text-xs font-semibold">Kota</span>
                  <input
                    type="text"
                    placeholder="Kota"
                    className="w-full border border-red-500 rounded-lg p-2 text-sm"
                    value={shippingAddress.city}
                    onChange={(e) =>
                      handleShippingAddressChange("city", e.target.value)
                    }
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold">Provinsi</span>
                  <input
                    type="text"
                    placeholder="Provinsi"
                    className="w-full border border-red-500 rounded-lg p-2 text-sm"
                    value={shippingAddress.province}
                    onChange={(e) =>
                      handleShippingAddressChange("province", e.target.value)
                    }
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <label>
                  <span className="text-xs font-semibold">Kode Pos</span>
                  <input
                    type="text"
                    placeholder="Kode Pos"
                    className="w-full border border-red-500 rounded-lg p-2 text-sm"
                    value={shippingAddress.postal_code}
                    onChange={(e) =>
                      handleShippingAddressChange("postal_code", e.target.value)
                    }
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold">Telepon</span>
                  <input
                    type="tel"
                    placeholder="No. Telepon"
                    className="w-full border border-red-500 rounded-lg p-2 text-sm"
                    value={shippingAddress.phone_number}
                    onChange={(e) =>
                      handleShippingAddressChange("phone_number", e.target.value)
                    }
                  />
                </label>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3">Alamat Penagihan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nama Depan"
                  className="border border-red-500 rounded-lg p-2 text-sm md:col-span-1"
                  value={billingAddress.first_name}
                  onChange={(e) =>
                    handleBillingAddressChange("first_name", e.target.value)
                  }
                />
                <input
                  type="text"
                  placeholder="Nama Belakang"
                  className="border border-red-500 rounded-lg p-2 text-sm md:col-span-1"
                  value={billingAddress.last_name}
                  onChange={(e) =>
                    handleBillingAddressChange("last_name", e.target.value)
                  }
                />
                <input
                  type="text"
                  placeholder="Alamat"
                  className="border border-red-500 rounded-lg p-2 text-sm md:col-span-2"
                  value={billingAddress.address}
                  onChange={(e) =>
                    handleBillingAddressChange("address", e.target.value)
                  }
                />
                <input
                  type="text"
                  placeholder="Apt/Suite (Opsional)"
                  className="border border-red-500 rounded-lg p-2 text-sm md:col-span-2"
                  value={billingAddress.appartment_suite}
                  onChange={(e) =>
                    handleBillingAddressChange("appartment_suite", e.target.value)
                  }
                />
                <input
                  type="text"
                  placeholder="Kota"
                  className="border border-red-500 rounded-lg p-2 text-sm md:col-span-1"
                  value={billingAddress.city}
                  onChange={(e) =>
                    handleBillingAddressChange("city", e.target.value)
                  }
                />
                <input
                  type="text"
                  placeholder="Provinsi"
                  className="border border-red-500 rounded-lg p-2 text-sm md:col-span-1"
                  value={billingAddress.province}
                  onChange={(e) =>
                    handleBillingAddressChange("province", e.target.value)
                  }
                />
                <input
                  type="text"
                  placeholder="Kode Pos"
                  className="border border-red-500 rounded-lg p-2 text-sm md:col-span-1"
                  value={billingAddress.postal_code}
                  onChange={(e) =>
                    handleBillingAddressChange("postal_code", e.target.value)
                  }
                />
                <input
                  type="text"
                  placeholder="Negara"
                  className="border border-red-500 rounded-lg p-2 text-sm md:col-span-1"
                  value={billingAddress.country}
                  onChange={(e) =>
                    handleBillingAddressChange("country", e.target.value)
                  }
                />
                <input
                  type="tel"
                  placeholder="Nomor Telepon"
                  className="border border-red-500 rounded-lg p-2 text-sm md:col-span-2"
                  value={billingAddress.phone_number}
                  onChange={(e) =>
                    handleBillingAddressChange("phone_number", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">
                Metode Pengiriman
              </label>
              {shippingAddress.province && (
                <p className="text-xs text-gray-600 mb-2">
                  Lokasi: {shippingAddress.province} (
                  {isJawaProvince(shippingAddress.province)
                    ? "Jawa +Rp10.000"
                    : "Luar Jawa +Rp50.000"}
                  )
                </p>
              )}
              {shippingMethods.length > 0 ? (
                <div className="space-y-2">
                  {shippingMethods.map((method) => {
                    const isJawa = isJawaProvince(shippingAddress.province);
                    const totalCost = calculateShippingCost(method.price, isJawa);
                    return (
                      <label
                        key={`shipping-${method.id}`}
                        className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="radio"
                          name="shipping"
                          value={method.id}
                          checked={selectedShippingMethod === method.id}
                          onChange={() => setSelectedShippingMethod(method.id)}
                          className="cursor-pointer"
                        />
                        <div className="flex-1 text-sm">
                          <div className="font-medium">{method.name}</div>
                          <div className="text-xs text-gray-600">
                            Total: Rp.{totalCost.toLocaleString("id-ID")}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-red-500 text-sm">
                  Tidak ada metode pengiriman tersedia
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">
                Metode Pembayaran
              </label>
              {paymentMethods.length > 0 ? (
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <label
                      key={`payment-${method.id}`}
                      className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.id}
                        checked={selectedPaymentMethod === method.id}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        className="cursor-pointer"
                      />
                      <div className="flex-1 text-sm">
                        <div className="font-medium">{method.name}</div>
                        <div className="text-xs text-gray-600">
                          {method.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-red-500 text-sm">
                  Tidak ada metode pembayaran tersedia
                </p>
              )}
            </div>

            <button
              onClick={handleCheckout}
              disabled={!isFormComplete() || isProcessing}
              className={`w-full py-3 rounded-xl font-semibold text-white transition duration-300 ${
                !isFormComplete() || isProcessing
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-700"
              }`}
            >
              {isProcessing ? "Memproses..." : "Lanjut ke Pembayaran"}
            </button>
          </div>
        </div>
      </div>

      {paymentStatus && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-xl p-6 md:p-10 max-w-sm text-center shadow-xl">
            {paymentStatus === "success" && (
              <>
                <div className="text-5xl text-green-600 mb-3">✓</div>
                <h2 className="text-green-600 text-xl font-semibold mb-2">
                  Pembayaran Berhasil!
                </h2>
                <p className="text-sm text-gray-600">
                  Terima kasih atas pesanan Anda.
                </p>
              </>
            )}
            {paymentStatus === "error" && (
              <>
                <div className="text-5xl text-red-600 mb-3">✕</div>
                <h2 className="text-red-600 text-xl font-semibold mb-2">
                  Pembayaran Gagal
                </h2>
                <p className="text-sm text-gray-600">
                  Silakan coba lagi atau gunakan metode lain.
                </p>
              </>
            )}
            {paymentStatus === "pending" && (
              <>
                <div className="text-5xl text-yellow-600 mb-3">⏳</div>
                <h2 className="text-yellow-600 text-xl font-semibold mb-2">
                  Pembayaran Tertunda
                </h2>
                <p className="text-sm text-gray-600">Silakan tunggu prosesnya.</p>
              </>
            )}
            {paymentStatus === "closed" && (
              <>
                <div className="text-5xl text-yellow-600 mb-3">⚠</div>
                <h2 className="text-yellow-600 text-xl font-semibold mb-2">
                  Popup Ditutup
                </h2>
                <p className="text-sm text-gray-600">
                  Tutup popup pembayaran, silakan coba lagi.
                </p>
              </>
            )}
            {paymentStatus === "form-incomplete" && (
              <>
                <div className="text-5xl text-red-600 mb-3">!</div>
                <h2 className="text-red-600 text-xl font-semibold mb-2">
                  Form Belum Lengkap
                </h2>
                <p className="text-sm text-gray-600">
                  Isi semua informasi sebelum melanjutkan.
                </p>
              </>
            )}
            {paymentStatus === "not-authenticated" && (
              <>
                <div className="text-5xl text-red-600 mb-3">🔒</div>
                <h2 className="text-red-600 text-xl font-semibold mb-2">
                  Silakan Login
                </h2>
                <p className="text-sm text-gray-600">
                  Login terlebih dahulu untuk checkout.
                </p>
              </>
            )}
            {paymentStatus === "order-failed" && (
              <>
                <div className="text-5xl text-red-600 mb-3">✕</div>
                <h2 className="text-red-600 text-xl font-semibold mb-2">
                  Gagal Membuat Order
                </h2>
                <p className="text-sm text-gray-600">
                  Terjadi kesalahan saat membuat order.
                </p>
              </>
            )}
            {paymentStatus === "payment-failed" && (
              <>
                <div className="text-5xl text-red-600 mb-3">✕</div>
                <h2 className="text-red-600 text-xl font-semibold mb-2">
                  Gagal Membuat Pembayaran
                </h2>
                <p className="text-sm text-gray-600">
                  Terjadi kesalahan saat membuat transaksi.
                </p>
              </>
            )}

            <button
              className="mt-6 bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition font-semibold"
              onClick={() => setPaymentStatus(null)}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CheckoutPage;