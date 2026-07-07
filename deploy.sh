#!/usr/bin/env bash
#
# Deploy slimbuck.com to S3 + CloudFront.
#
# Prerequisites:
#   - AWS CLI v2 installed and configured (aws configure / SSO / env vars)
#   - Node.js (for the build step)
#
# Configuration (set these before running, e.g. in your shell or a .env):
#   AWS_S3_BUCKET                  name of the S3 bucket (e.g. slimbuck.com)
#   AWS_CLOUDFRONT_DISTRIBUTION_ID CloudFront distribution id (e.g. E123ABC...)
#
# Usage:
#   AWS_S3_BUCKET=slimbuck.com AWS_CLOUDFRONT_DISTRIBUTION_ID=E123... ./deploy.sh

set -euo pipefail

: "${AWS_S3_BUCKET:?Set AWS_S3_BUCKET to your bucket name}"
: "${AWS_CLOUDFRONT_DISTRIBUTION_ID:?Set AWS_CLOUDFRONT_DISTRIBUTION_ID to your distribution id}"

echo "==> Building site"
npm ci --silent || npm install --silent
npm run build

echo "==> Syncing dist/ to s3://${AWS_S3_BUCKET}"
# dist/ is the complete, self-contained site (see build.js).
aws s3 sync dist/ "s3://${AWS_S3_BUCKET}" \
    --delete \
    --exclude ".DS_Store"

# The AWS CLI does not always set the correct content-type for .wasm files,
# which browsers require for streaming compilation. Fix them explicitly
# (the apps live in subfolders, so search recursively).
echo "==> Fixing content-type on .wasm files"
find dist -name '*.wasm' | while read -r wasm; do
    key="${wasm#dist/}"
    aws s3 cp "$wasm" "s3://${AWS_S3_BUCKET}/${key}" \
        --content-type "application/wasm" \
        --metadata-directive REPLACE
done

echo "==> Invalidating CloudFront cache"
aws cloudfront create-invalidation \
    --distribution-id "${AWS_CLOUDFRONT_DISTRIBUTION_ID}" \
    --paths "/*" >/dev/null

echo "==> Done. https://slimbuck.com/"
