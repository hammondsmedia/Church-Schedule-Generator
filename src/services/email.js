// src/services/email.js
import emailjs from '@emailjs/browser';

const EMAIL_CONFIG = {
  SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  TEMPLATE_ID: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY
};

const isConfigured = (value) =>
  typeof value === 'string' && value.length > 0 && !value.includes('your_');

export const sendInviteEmail = async (templateParams) => {
  if (
    !isConfigured(EMAIL_CONFIG.SERVICE_ID) ||
    !isConfigured(EMAIL_CONFIG.TEMPLATE_ID) ||
    !isConfigured(EMAIL_CONFIG.PUBLIC_KEY)
  ) {
    throw new Error(
      "EmailJS is not configured. Set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY in your .env file."
    );
  }

  try {
    return await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATE_ID,
      templateParams,
      EMAIL_CONFIG.PUBLIC_KEY
    );
  } catch (err) {
    console.error("EmailJS failed:", err);
    throw err;
  }
};
