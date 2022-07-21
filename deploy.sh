#!/usr/bin/env sh

# abort on errors
set -e

# set origin url
ORIGIN=$(git remote get-url origin)

# build
yarn build

# navigate into the build output directory
cd build

git init
git add -A
git commit -m 'deploy'

git push -f $ORIGIN master:gh-pages

cd -