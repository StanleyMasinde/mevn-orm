#!/bin/env bash
set -e

echo "Init the test db"
npm run init:db
echo "Step three"
npm test
