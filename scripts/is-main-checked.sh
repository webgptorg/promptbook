#!/bin/bash

currentBranch=$(git branch --show-current; 2>&1)

if [ $currentBranch = 'main' ]; then
   exit 0;
else
   echo "You have currently checked branch $currentBranch not main";
    exit 1;
fi