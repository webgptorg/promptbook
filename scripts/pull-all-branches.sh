#!/bin/bash

git fetch --all;
git branch -r | grep -v '\->' | while read remote; do git switch "${remote#origin/}"; git pull; done;
