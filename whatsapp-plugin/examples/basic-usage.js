/**
 * Basic usage example for WhatsApp Plugin
 */

// In a real project, you would import from the package:
// import { WhatsAppPlugin } from 'whatsapp-plugin';

// For this example, we'll assume the plugin is built and available
const { WhatsAppPlugin } = require('./dist/index.js');

// Initialize the plugin
const whatsapp = new WhatsAppPlugin({
  // These would typically come from environment variables
  apiKey: process.env.WHATSAPP_API_KEY || 'your-api-key-here',
  apiSecret: process.env.WHATSAPP_API_SECRET || 'your-api-secret-here',
  autoReconnect: true,
  logLevel: 'info'
});

// Handle QR code for login
whatsapp.on('qr-code', (data) => {
  console.log('QR Code Data:', data.qrCode);
  console.log('Message:', data.message);
  // In a real app, you would display this QR code in your UI
  // For example, in HTML: document.getElementById('qrcode').src = data.qrCode;
});

// Handle connection events
whatsapp.on('connected', () => {
  console.log('✅ WhatsApp connected successfully!');
});

whatsapp.on('disconnected', () => {
  console.log('❌ WhatsApp disconnected');
});

whatsapp.on('reconnected', (attempt) => {
  console.log(`🔄 WhatsApp reconnected (attempt ${attempt})`);
});

whatsapp.on('error', (error) => {
  console.error('❌ WhatsApp error:', error.message);
});

// Handle incoming messages
whatsapp.on('message', (message) => {
  console.log('📩 Received message:', message);
});

// Handle sent message confirmation
whatsapp.on('message-sent', (messageId) => {
  console.log(`📤 Message sent successfully (ID: ${messageId})`);
});

// Main async function to demonstrate usage
async function demo() {
  try {
    console.log('🚀 Starting WhatsApp Plugin demo...');
    
    // Attempt to connect
    const connected = await whatsapp.connect();
    
    if (!connected) {
      console.log('❌ Failed to connect. Please check your configuration.');
      return;
    }
    
    console.log('✅ Connection initiated...');
    
    // Wait for QR scan (in a real app, you'd show the QR code to user)
    console.log('📱 Please scan the QR code with your WhatsApp...');
    const scanned = await whatsapp.waitForQRScan();
    
    if (!scanned) {
      console.log('❌ QR scan failed or timed out');
      await whatsapp.disconnect();
      return;
    }
    
    console.log('✅ QR code scanned successfully!');
    
    // Send a test message
    console.log('📤 Sending test message...');
    const result = await whatsapp.sendMessage(
      'whatsapp', // Sending to yourself (OM self-chat mode)
      'Hello from WhatsApp Plugin! 👋 This is a test message sent at ' + new Date().toLocaleTimeString()
    );
    
    if (result.success) {
      console.log('✅ Test message sent successfully!');
    } else {
      console.log('❌ Failed to send message:', result.error);
    }
    
    // Keep connection alive for a bit to receive any messages
    console.log('👂 Listening for messages for 30 seconds...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Cleanup
    await whatsapp.disconnect();
    console.log('👋 Demo completed. WhatsApp disconnected.');
    
  } catch (error) {
    console.error('💥 Demo failed with error:', error);
    await whatsapp.disconnect();
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demo().catch(console.error);
}

module.exports = { demo };