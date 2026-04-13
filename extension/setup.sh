#!/bin/bash
# Downloads Stockfish WASM assets to extension/public/
# Run this after cloning: cd extension && bash setup.sh

set -e
echo "Installing dependencies..."
npm install

echo "Copying Stockfish assets..."
STOCKFISH_DIR=$(find ../node_modules/stockfish -name "stockfish.wasm" -exec dirname {} \; | head -1)

if [ -z "$STOCKFISH_DIR" ]; then
  echo "Error: stockfish.wasm not found in node_modules"
  exit 1
fi

cp "$STOCKFISH_DIR/stockfish.wasm" public/
cp "$STOCKFISH_DIR/stockfish.js" public/

echo "Stockfish assets ready in extension/public/"
