#!/bin/bash

echo "🚀 Starting Filpo Boost Build..."

# Install root deps
echo "📦 Installing root dependencies..."
npm install

# Install client deps and build
echo "📦 Installing client dependencies..."
cd client
npm install

echo "🔨 Building client..."
npx vite build
cd ..

# Install server deps (without Chrome download)
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

echo "✅ Build complete!"
