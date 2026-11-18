import axios from "axios";

const BASE_URL = import.meta.env.VITE_BE_BASE_URL;

// ===== GET ALL ORDERS =====
export const getOrders = async (params = {}) => {
  try {
    const response = await axios.get(`${BASE_URL}/api/orders`, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
};

// ===== GET USER ORDERS =====
export const getUserOrders = async (token) => {
  try {
    const response = await axios.get(`${BASE_URL}/api/users/orders`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }

    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  } catch (error) {
    console.error("Error fetching user orders:", error.response?.data || error);
    return [];
  }
};

// ===== GET ORDER DETAILS =====
export const getOrderDetails = async (orderId) => {
  try {
    const response = await axios.get(`${BASE_URL}/api/orders/${orderId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching order details:", error);
    throw error;
  }
};

// ===== CREATE NEW ORDER =====
export const createOrder = async (token, orderPayload) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/orders/create`,
      orderPayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error creating order:", error.response?.data || error);
    throw error;
  }
};

// ===== CREATE PAYMENT =====
export const createPayment = async (token, paymentPayload) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/payments/create`,
      paymentPayload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error creating payment:", error.response?.data || error);
    throw error;
  }
};

// ===== CHECK PAYMENT STATUS =====
export const checkPaymentStatus = async (token, paymentId) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/api/payments/${paymentId}/status`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error checking payment status:", error.response?.data || error);
    throw error;
  }
};

// ===== GET SHIPPING METHODS =====
export const getShippingMethods = async () => {
  const shippingMethods = [
    { id: 1, name: "Kargo", price: 20000 },
    { id: 2, name: "Fast", price: 80000 },
  ];

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(shippingMethods);
    }, 200);
  });
};

// ===== GET PAYMENT METHODS =====
export const getPaymentMethods = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/payment-methods`);
    return response.data?.data || [];
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return [];
  }
};