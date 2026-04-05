#!/bin/bash

echo "🚀 Starting Filpo Boost Build..."

# Install root deps
echo "📦 Installing root dependencies..."
npm install

# Install and build client
echo "📦 Installing client dependencies..."
cd client
npm install

echo "🔨 Building client..."
./node_modules/.bin/vite build
cd ..

# Install server deps
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

echo "✅ Build complete!"
