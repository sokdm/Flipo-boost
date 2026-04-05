#!/bin/bash

echo "🚀 Starting Filpo Boost Build..."

# Install root deps
echo "📦 Installing root dependencies..."
npm install

# Install server deps
echo "📦 Installing server dependencies..."
cd server
npm install --ignore-scripts
cd ..

# Install client deps and build
echo "📦 Installing client dependencies..."
cd client
npm install

echo "🔨 Building client..."
npm run build
cd ..

# Skip Chrome install during build - will install at runtime
echo "⏭️  Skipping Chrome install during build (will install at runtime)"
echo "✅ Build complete!"
