#!/bin/bash

echo "🚀 Starting Filpo Boost Build..."

# Install root deps
echo "📦 Installing root dependencies..."
npm install

# Install server deps first
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Install client deps and build
echo "📦 Installing client dependencies..."
cd client
npm install

echo "🔨 Building client..."
rm -rf dist
npm run build
cd ..

echo "✅ Build complete!"
echo "📁 Checking client/dist..."
ls -la client/dist/ || echo "❌ dist folder not found"
